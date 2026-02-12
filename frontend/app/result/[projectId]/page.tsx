"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/editor/SectionRenderer";
import { NewProjectModal } from "@/components/modals/NewProjectModal";
import { projectsApi, sectionsApi, authApi, uploadApi, imagesApi, generateApi, backgroundApi } from "@/lib/api";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { exportImage, inlineImages } from "@/lib/export";
import { toPng } from "html-to-image";
import { ZoomIn, ChevronLeft, ChevronRight, Minus, Plus, GripVertical, Image as ImageIcon, Send, ImagePlus, Download, Upload, User, LogOut, X, Eraser, Loader2, Check, Undo2, Redo2, Paintbrush } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { toast } from "sonner";
import type { Project, RenderedSection, BackgroundSettings } from "@/types";
import type { SelectedElement } from "@/components/editor/SectionBlock";

type GenerationStepStatus = "pending" | "running" | "done";

interface GenerationStep {
  label: string;
  detail: string;
  status: GenerationStepStatus;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  attachedImage?: { url: string; sectionId: string; placeholderId: string };
  imageVersions?: string[];
  sectionId?: string;
  placeholderId?: string;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<RenderedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [zoom, setZoom] = useState(50);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showSectionList, setShowSectionList] = useState(true);
  const [sectionThumbnails, setSectionThumbnails] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"pages" | "image" | "background">("pages");
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [expandedInputInfo, setExpandedInputInfo] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatAttachedImage, setChatAttachedImage] = useState<{ url: string; sectionId: string; placeholderId: string } | null>(null);
  const [chatPendingFile, setChatPendingFile] = useState<File | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; type: "upload" | "bg_removed" }[]>([]);
  const [originalAiImages, setOriginalAiImages] = useState<{ sectionId: string; key: string; url: string }[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [colorPickerSection, setColorPickerSection] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Background settings state
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    scope: "all",
    global: { type: "none" },
    per_section: {},
  });
  const [bgGenerating, setBgGenerating] = useState(false);
  const bgSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { label: "입력 분석", detail: "상품 이미지 및 정보를 분석하고 있습니다.", status: "pending" },
    { label: "HTML 템플릿 조회", detail: "최적의 레이아웃 템플릿을 선택하고 있습니다.", status: "pending" },
    { label: "AI 배경 & 텍스트 생성", detail: "AI가 배경 이미지와 텍스트를 생성하고 있습니다.", status: "pending" },
    { label: "템플릿 데이터 바인딩", detail: "생성된 콘텐츠를 템플릿에 적용하고 있습니다.", status: "pending" },
  ]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const updateGenerationStep = (index: number, status: GenerationStepStatus) => {
    setGenerationSteps((s) =>
      s.map((st, i) => (i === index ? { ...st, status } : st))
    );
  };

  // Text toolbar states
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontFamily, setFontFamily] = useState("Pretendard");
  const [textColor, setTextColor] = useState("#000000");

  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ sectionId: string } | null>(null);
  const sectionsRef = useRef<RenderedSection[]>([]);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  // History (undo/redo)
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useHistory();
  // Force re-render when history state changes (canUndo/canRedo are functions reading refs)
  const [, forceRender] = useState(0);
  const triggerRender = useCallback(() => forceRender((n) => n + 1), []);

  // sectionsRef를 항상 최신 상태로 유지
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const applySnapshot = useCallback(
    async (snapshot: RenderedSection[]) => {
      setSections(snapshot);
      sectionsRef.current = snapshot;
      triggerRender();
      try {
        await projectsApi.update(projectId, { rendered_sections: snapshot });
      } catch {
        toast.error("변경사항 저장에 실패했습니다.");
      }
    },
    [projectId, triggerRender]
  );

  const handleUndo = useCallback(() => {
    const snapshot = undo();
    if (snapshot) applySnapshot(snapshot);
  }, [undo, applySnapshot]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (snapshot) applySnapshot(snapshot);
  }, [redo, applySnapshot]);

  // Keyboard shortcuts: Cmd+Z / Ctrl+Z (undo), Cmd+Shift+Z / Ctrl+Shift+Z (redo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const loadProjectData = useCallback((proj: Project) => {
    if (proj.rendered_sections?.length) {
      setSections(proj.rendered_sections);
      pushSnapshot(proj.rendered_sections);
      triggerRender();
      const aiImages: { sectionId: string; key: string; url: string }[] = [];
      for (const sec of proj.rendered_sections) {
        for (const [key, value] of Object.entries(sec.data)) {
          if (key.endsWith("_image") && typeof value === "string" && value.startsWith("http")) {
            aiImages.push({ sectionId: sec.section_id, key, url: value });
          }
        }
      }
      setOriginalAiImages(aiImages);
    }
  }, [pushSnapshot, triggerRender]);

  useEffect(() => {
    async function load() {
      try {
        const proj = await projectsApi.get(projectId);
        setProject(proj);

        // Load background settings from project
        if (proj.background_settings) {
          setBackgroundSettings(proj.background_settings as BackgroundSettings);
        }

        if (proj.rendered_sections?.length) {
          // 이미 생성 완료된 프로젝트
          loadProjectData(proj);

          // 배경 제거 이미지 로드
          try {
            const bgRemovedResult = await imagesApi.listProjectImages(projectId, "bg_removed");
            if (bgRemovedResult.images?.length > 0) {
              const bgImages = bgRemovedResult.images.map((img) => ({
                url: img.url,
                type: "bg_removed" as const,
              }));
              setUploadedImages((prev) => [...prev, ...bgImages]);
            }
          } catch (err) {
            console.error("배경 제거 이미지 로드 실패:", err);
          }
        } else {
          // 아직 생성되지 않은 프로젝트 → AI 생성 시작
          setGenerating(true);
          setGenerationProgress(0);

          try {
            const products = proj.products || [];
            const pageType = proj.theme_id || "product_detail";

            // Step 1: 입력 분석
            updateGenerationStep(0, "running");
            setGenerationProgress(10);
            await new Promise((r) => setTimeout(r, 400));
            updateGenerationStep(0, "done");
            setGenerationProgress(15);

            // Step 2: 템플릿 선택
            updateGenerationStep(1, "running");
            setGenerationProgress(20);

            // Step 3: AI 생성
            updateGenerationStep(2, "running");
            setGenerationProgress(30);

            const inputData = (proj.input_data || {}) as Record<string, unknown>;

            await generateApi.generate({
              project_id: projectId,
              products,
              page_type: pageType,
              ...(proj.background_config ? { background: proj.background_config } : {}),
              ...(proj.restaurants ? { restaurants: proj.restaurants } : {}),
              ...(inputData.include_wine ? { include_wine: true } : {}),
              ...(inputData.wines ? { wines: inputData.wines as Array<{ name: string }> } : {}),
            });

            updateGenerationStep(1, "done");
            updateGenerationStep(2, "done");
            setGenerationProgress(85);

            // Step 4: 바인딩 완료
            updateGenerationStep(3, "running");
            setGenerationProgress(90);

            const updatedProj = await projectsApi.get(projectId);
            setProject(updatedProj);
            loadProjectData(updatedProj);

            await new Promise((r) => setTimeout(r, 400));
            updateGenerationStep(3, "done");
            setGenerationProgress(100);

            // 잠시 후 생성 상태 해제
            setTimeout(() => {
              setGenerating(false);
            }, 800);
          } catch (err) {
            setGenerationError(
              err instanceof Error ? err.message : "생성에 실패했습니다."
            );
            toast.error("AI 생성에 실패했습니다. 다시 시도해 주세요.");
          }
        }
      } catch {
        toast.error("프로젝트를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, loadProjectData]);

  // Fetch project list for header selector
  useEffect(() => {
    if (projectList.length === 0) {
      projectsApi
        .list()
        .then((res) => setProjectList(res.items))
        .catch(() => toast.error("프로젝트 목록을 불러올 수 없습니다."));
    }
  }, [projectList.length]);

  // Generate section thumbnails
  useEffect(() => {
    if (sections.length === 0) return;
    let cancelled = false;

    const generateAll = async () => {
      for (const section of sections) {
        if (cancelled) break;
        const element = document.querySelector(`[data-section-id="${section.section_id}"]`) as HTMLElement;
        if (!element) continue;
        try {
          const restore = await inlineImages(element);
          try {
            const dataUrl = await toPng(element, {
              quality: 0.5,
              pixelRatio: 0.3,
              cacheBust: true,
              imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            });
            if (!cancelled) {
              setSectionThumbnails((prev) => ({ ...prev, [section.section_id]: dataUrl }));
            }
          } finally {
            restore();
          }
        } catch {
          // skip failed thumbnail
        }
      }
    };

    generateAll();
    return () => { cancelled = true; };
  }, [sections]);

  // Update text toolbar when selection changes
  useEffect(() => {
    if (selectedElement?.type === "text" && selectedElement.currentStyles) {
      const styles = selectedElement.currentStyles;
      const overrides = getSelectedStyleOverrides()[selectedElement.placeholderId] || {};

      // Parse fontSize
      const size = parseInt(overrides.fontSize || styles.fontSize || "16px");
      setFontSize(isNaN(size) ? 16 : size);

      // Parse fontWeight
      const weight = parseInt(overrides.fontWeight || styles.fontWeight || "400");
      setFontWeight(isNaN(weight) ? 400 : weight);

      // Parse fontFamily
      const family = overrides.fontFamily || styles.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, "") || "Pretendard";
      setFontFamily(family);

      // Parse color
      const color = overrides.color || styles.color || "#000000";
      setTextColor(color.startsWith("#") ? color : rgbToHex(color));
    }
  }, [selectedElement]);

  const rgbToHex = (rgb: string): string => {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb.startsWith("#") ? rgb : "#000000";
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const applyTextStyle = (updates: Record<string, string>) => {
    if (!selectedElement) return;
    const current = getSelectedStyleOverrides()[selectedElement.placeholderId] || {};
    handleStyleChange(selectedElement.placeholderId, { ...current, ...updates });
  };

  // 디바운스된 API 저장 — 최신 sectionsRef에서 읽어서 저장
  const flushSave = useCallback(
    async (sectionId: string) => {
      const allSections = sectionsRef.current;
      const target = allSections.find((s) => s.section_id === sectionId);
      if (!target) return;
      try {
        await sectionsApi.updateData(
          projectId,
          sectionId,
          target.data,
          target.style_overrides || {}
        );
      } catch (err) {
        console.error("[save] 실패:", sectionId, err);
        toast.error("변경사항 저장에 실패했습니다.");
      }
    },
    [projectId]
  );

  const debouncedSave = useCallback(
    (sectionId: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      pendingSaveRef.current = { sectionId };
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        pendingSaveRef.current = null;
        flushSave(sectionId);
      }, 500);
    },
    [flushSave]
  );

  // 컴포넌트 언마운트 시 대기 중인 저장 즉시 실행
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (pendingSaveRef.current) {
          flushSave(pendingSaveRef.current.sectionId);
        }
      }
    };
  }, [flushSave]);

  // 섹션 데이터 변경 핸들러 (텍스트 인라인 편집)
  const handleDataChange = useCallback(
    (sectionId: string, placeholderId: string, newValue: string) => {
      pushSnapshot(sectionsRef.current);
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          return { ...sec, data: { ...sec.data, [placeholderId]: newValue } };
        })
      );
      triggerRender();
      // 텍스트 편집은 즉시 저장 (blur 1회만 발생하므로 디바운스 불필요)
      // flushSave는 sectionsRef에서 읽으므로, setState 후 다음 틱에 실행
      setTimeout(() => flushSave(sectionId), 0);
    },
    [flushSave, pushSnapshot, triggerRender]
  );

  // 스타일 오버라이드 변경 핸들러 (슬라이더/컬러피커 — 빈번하게 호출됨)
  const styleSnapshotPushedRef = useRef(false);
  const styleSnapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStyleChange = useCallback(
    (placeholderId: string, styles: Record<string, string>) => {
      if (!selectedElement) return;
      const sectionId = selectedElement.sectionId;

      // Push snapshot once at the start of a rapid-change sequence
      if (!styleSnapshotPushedRef.current) {
        pushSnapshot(sectionsRef.current);
        triggerRender();
        styleSnapshotPushedRef.current = true;
      }
      // Reset the flag after 500ms of inactivity
      if (styleSnapshotTimerRef.current) clearTimeout(styleSnapshotTimerRef.current);
      styleSnapshotTimerRef.current = setTimeout(() => {
        styleSnapshotPushedRef.current = false;
      }, 500);

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          const overrides = { ...(sec.style_overrides || {}), [placeholderId]: styles };
          return { ...sec, style_overrides: overrides };
        })
      );
      debouncedSave(sectionId);
    },
    [selectedElement, debouncedSave, pushSnapshot, triggerRender]
  );

  // 섹션 순서 변경 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedSectionIndex === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertAt = e.clientY < midY ? index : index + 1;

    // 드래그 아이템 바로 앞/뒤는 무의미하므로 표시 안 함
    if (insertAt === draggedSectionIndex || insertAt === draggedSectionIndex + 1) {
      setDropIndicatorIndex(null);
    } else {
      setDropIndicatorIndex(insertAt);
    }
  };

  const handleDragEnd = async () => {
    if (draggedSectionIndex !== null && dropIndicatorIndex !== null) {
      pushSnapshot(sections);
      const newSections = [...sections];
      const [dragged] = newSections.splice(draggedSectionIndex, 1);
      const adjustedIndex = dropIndicatorIndex > draggedSectionIndex
        ? dropIndicatorIndex - 1
        : dropIndicatorIndex;
      newSections.splice(adjustedIndex, 0, dragged);

      const updated = newSections.map((s, i) => ({ ...s, order: i }));
      setSections(updated);
      triggerRender();

      try {
        await projectsApi.update(projectId, { rendered_sections: updated });
      } catch {
        toast.error("섹션 순서 변경에 실패했습니다.");
      }
    }
    setDraggedSectionIndex(null);
    setDropIndicatorIndex(null);
  };

  // 이미지 선택 시 자동으로 채팅에 첨부
  useEffect(() => {
    if (selectedElement?.type === "image") {
      const sec = sections.find((s) => s.section_id === selectedElement.sectionId);
      if (!sec) return;
      const url = sec.data[selectedElement.placeholderId] || "";
      if (url) {
        setChatAttachedImage({
          url,
          sectionId: selectedElement.sectionId,
          placeholderId: selectedElement.placeholderId,
        });
      }
    }
  }, [selectedElement, sections]);

  // 채팅 메시지 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // 채팅으로 이미지 재생성 요청
  const handleChatSend = useCallback(async () => {
    const message = chatMessage.trim();
    if (!message || !chatAttachedImage) return;

    let { sectionId, placeholderId, url: originalUrl } = chatAttachedImage;
    const isUserUpload = !!chatPendingFile;

    // 유저 메시지 추가
    const userMsg: ChatMessage = {
      role: "user",
      text: message,
      attachedImage: { ...chatAttachedImage },
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatMessage("");
    setChatLoading(true);

    try {
      // 사용자가 업로드한 파일이 있으면 먼저 업로드
      if (chatPendingFile) {
        const result = await uploadApi.uploadImage(projectId, chatPendingFile, "chat");
        originalUrl = result.public_url;

        // sectionId/placeholderId가 비어있으면 첫 번째 이미지 섹션에 적용
        if (!sectionId || !placeholderId) {
          for (const sec of sectionsRef.current) {
            const imageKey = Object.keys(sec.data).find(
              (k) => k.endsWith("_image") && typeof sec.data[k] === "string" && sec.data[k].startsWith("http")
            );
            if (imageKey) {
              sectionId = sec.section_id;
              placeholderId = imageKey;
              break;
            }
          }
        }

        // 업로드된 이미지를 섹션에 먼저 반영
        if (sectionId && placeholderId) {
          const targetData = sectionsRef.current.find((s) => s.section_id === sectionId)?.data || {};
          const targetOverrides = sectionsRef.current.find((s) => s.section_id === sectionId)?.style_overrides || {};
          setSections((prev) =>
            prev.map((sec) => {
              if (sec.section_id !== sectionId) return sec;
              return { ...sec, data: { ...sec.data, [placeholderId]: originalUrl } };
            })
          );
          await sectionsApi.updateData(
            projectId,
            sectionId,
            { ...targetData, [placeholderId]: originalUrl },
            targetOverrides
          );
        }

        // blob URL 해제 & pending file 초기화
        if (chatAttachedImage.url.startsWith("blob:")) {
          URL.revokeObjectURL(chatAttachedImage.url);
        }
        setChatPendingFile(null);
      }

      if (!sectionId || !placeholderId) {
        toast.error("이미지를 적용할 섹션을 찾을 수 없습니다.");
        setChatLoading(false);
        return;
      }

      const updatedProject = await sectionsApi.regenerateImage(
        projectId,
        sectionId,
        message
      );

      // 새 이미지 URL 가져오기
      const newSection = updatedProject.rendered_sections?.find(
        (s) => s.section_id === sectionId
      );
      const newUrl = newSection?.data[placeholderId] || "";

      if (updatedProject.rendered_sections) {
        pushSnapshot(sectionsRef.current);
        setSections(updatedProject.rendered_sections);
        triggerRender();
      }
      setProject(updatedProject);

      // 재생성된 이미지를 AI 이미지 갤러리에 추가
      if (newUrl) {
        setOriginalAiImages((prev) => {
          const exists = prev.some((img) => img.url === newUrl);
          if (exists) return prev;
          return [...prev, { sectionId, key: placeholderId, url: newUrl }];
        });
      }

      // 버전 수집: 사용자 업로드 시 이전 히스토리 초기화, 기존 이미지 재생성 시 누적
      const versions: string[] = [];
      if (isUserUpload) {
        // 업로드한 이미지 → 재생성 결과만 표시
        versions.push(originalUrl);
        if (newUrl && newUrl !== originalUrl) versions.push(newUrl);
      } else {
        // 기존 이미지 재생성 → 이전 버전 누적
        setChatMessages((prev) => {
          for (const m of prev) {
            if (m.role === "assistant" && m.sectionId === sectionId && m.placeholderId === placeholderId && m.imageVersions) {
              for (const v of m.imageVersions) {
                if (!versions.includes(v)) versions.push(v);
              }
            }
          }
          return prev;
        });
        if (!versions.includes(originalUrl)) versions.push(originalUrl);
        if (newUrl && !versions.includes(newUrl)) versions.push(newUrl);
      }

      const aiMsg: ChatMessage = {
        role: "assistant",
        text: versions.length > 1
          ? `이미지를 수정했습니다. (${versions.length}개 버전)`
          : "이미지를 수정했습니다.",
        imageVersions: [...versions],
        sectionId,
        placeholderId,
      };
      setChatMessages((prev) => [...prev, aiMsg]);

      // 첨부 이미지를 새 이미지로 갱신 (newUrl이 없으면 원본 유지)
      const appliedUrl = newUrl || originalUrl;
      setChatAttachedImage({ url: appliedUrl, sectionId, placeholderId });
    } catch {
      toast.error("이미지 재생성에 실패했습니다.");
      const errorMsg: ChatMessage = {
        role: "assistant",
        text: "이미지 재생성에 실패했습니다. 다시 시도해주세요.",
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessage, chatAttachedImage, chatPendingFile, projectId]);

  // AI 응답에서 이미지 변형 선택
  const handleSelectVariant = useCallback(
    async (sectionId: string, placeholderId: string, imageUrl: string) => {
      pushSnapshot(sectionsRef.current);
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          return { ...sec, data: { ...sec.data, [placeholderId]: imageUrl } };
        })
      );
      triggerRender();
      setChatAttachedImage({ url: imageUrl, sectionId, placeholderId });
      // 서버에 저장
      const target = sectionsRef.current.find((s) => s.section_id === sectionId);
      if (target) {
        try {
          await sectionsApi.updateData(
            projectId,
            sectionId,
            { ...target.data, [placeholderId]: imageUrl },
            target.style_overrides || {}
          );
        } catch {
          toast.error("변경사항 저장에 실패했습니다.");
        }
      }
    },
    [projectId, pushSnapshot, triggerRender]
  );

  // 섹션 관리 핸들러
  const handleSectionMoveUp = useCallback(async (index: number) => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    if (index <= 0) return;
    pushSnapshot(sections);
    [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
    const updated = sorted.map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    triggerRender();
    try {
      await projectsApi.update(projectId, { rendered_sections: updated });
    } catch {
      toast.error("섹션 이동에 실패했습니다.");
    }
  }, [sections, projectId, pushSnapshot, triggerRender]);

  const handleSectionMoveDown = useCallback(async (index: number) => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    if (index >= sorted.length - 1) return;
    pushSnapshot(sections);
    [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
    const updated = sorted.map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    triggerRender();
    try {
      await projectsApi.update(projectId, { rendered_sections: updated });
    } catch {
      toast.error("섹션 이동에 실패했습니다.");
    }
  }, [sections, projectId, pushSnapshot, triggerRender]);

  const handleSectionDuplicate = useCallback(async (index: number) => {
    pushSnapshot(sections);
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const original = sorted[index];
    const duplicated: RenderedSection = {
      ...original,
      section_id: `${original.section_id}_copy_${Date.now()}`,
      data: { ...original.data },
      style_overrides: original.style_overrides ? { ...original.style_overrides } : undefined,
    };
    sorted.splice(index + 1, 0, duplicated);
    const updated = sorted.map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    triggerRender();
    try {
      await projectsApi.update(projectId, { rendered_sections: updated });
      toast.success("섹션이 복제되었습니다.");
    } catch {
      toast.error("섹션 복제에 실패했습니다.");
    }
  }, [sections, projectId, pushSnapshot, triggerRender]);

  const handleSectionDelete = useCallback(async (index: number) => {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    if (sorted.length <= 1) return;
    pushSnapshot(sections);
    sorted.splice(index, 1);
    const updated = sorted.map((s, i) => ({ ...s, order: i }));
    setSections(updated);
    setSelectedElement(null);
    triggerRender();
    try {
      await projectsApi.update(projectId, { rendered_sections: updated });
      toast.success("섹션이 삭제되었습니다.");
    } catch {
      toast.error("섹션 삭제에 실패했습니다.");
    }
  }, [sections, projectId, pushSnapshot, triggerRender]);

  // 이미지 업로드 핸들러
  // 이미지 업로드 → 갤러리에 추가
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadApi.uploadImage(projectId, file, "section");
      setUploadedImages((prev) => [...prev, { url: result.public_url, type: "upload" }]);
      toast.success("이미지가 추가되었습니다.");
    } catch {
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [projectId]);

  // 배경 제거 핸들러
  const handleRemoveBg = useCallback(async () => {
    if (!chatAttachedImage || bgRemoving) return;

    // 파일 준비: pending file이 있으면 사용, 없으면 URL에서 fetch
    let file: File;
    if (chatPendingFile) {
      file = chatPendingFile;
    } else {
      try {
        const res = await fetch(chatAttachedImage.url);
        const blob = await res.blob();
        file = new File([blob], "image.png", { type: blob.type || "image/png" });
      } catch {
        toast.error("이미지를 불러올 수 없습니다.");
        return;
      }
    }

    setBgRemoving(true);
    try {
      const result = await imagesApi.removeBackground(projectId, file);

      // 기존 blob URL 해제
      if (chatAttachedImage.url.startsWith("blob:")) {
        URL.revokeObjectURL(chatAttachedImage.url);
      }

      // 첨부 이미지를 배경 제거된 이미지로 교체
      setChatAttachedImage({
        ...chatAttachedImage,
        url: result.url,
      });

      // pending file도 새 이미지로 교체
      const bgRes = await fetch(result.url);
      const bgBlob = await bgRes.blob();
      const bgFile = new File([bgBlob], "bg_removed.png", { type: "image/png" });
      setChatPendingFile(bgFile);

      // 좌측 사진 갤러리에 추가
      setUploadedImages((prev) => [...prev, { url: result.url, type: "bg_removed" }]);

      toast.success("배경이 제거되었습니다.");
    } catch {
      toast.error("배경 제거에 실패했습니다.");
    } finally {
      setBgRemoving(false);
    }
  }, [chatAttachedImage, chatPendingFile, bgRemoving, projectId]);

  // 갤러리 이미지를 선택된 섹션 이미지에 적용
  const handleApplyImage = useCallback(async (imageUrl: string) => {
    if (!selectedElement?.type || selectedElement.type !== "image") {
      toast.error("먼저 프리뷰에서 교체할 이미지를 클릭하세요.");
      return;
    }
    pushSnapshot(sectionsRef.current);
    const { sectionId, placeholderId } = selectedElement;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.section_id !== sectionId) return sec;
        return { ...sec, data: { ...sec.data, [placeholderId]: imageUrl } };
      })
    );
    triggerRender();
    setTimeout(() => flushSave(sectionId), 0);
  }, [selectedElement, flushSave, pushSnapshot, triggerRender]);

  const handleExport = async () => {
    if (!previewRef.current) return;
    try {
      await exportImage(previewRef.current, {
        format: "png",
        quality: 2,
        filename: `POP_${Date.now()}`,
      });
      toast.success("이미지가 다운로드되었습니다.");
    } catch {
      toast.error("이미지 출력에 실패했습니다.");
    }
  };

  const handleProjectDelete = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    try {
      await projectsApi.delete(id);
      setProjectList((prev) => prev.filter((p) => p.id !== id));
      toast.success("프로젝트가 삭제되었습니다.");
      // 현재 프로젝트를 삭제했으면 다른 프로젝트로 이동
      if (id === projectId) {
        const remaining = projectList.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          router.push(`/result/${remaining[0].id}`);
        } else {
          router.push("/");
        }
      }
    } catch {
      toast.error("프로젝트 삭제에 실패했습니다.");
    }
  };

  const handleZoomReset = () => {
    setZoom(100);
    setShowZoomMenu(false);
  };

  const handleZoomToFit = () => {
    // 프리뷰 컨텐츠와 컨테이너 크기를 비교하여 fit 비율 계산
    if (!previewRef.current) return;

    const previewContainer = previewRef.current.parentElement;
    if (!previewContainer) return;

    const contentElement = previewRef.current.children[0] as HTMLElement;
    if (!contentElement) return;

    // 실제 컨텐츠 크기 (스케일 적용 전)
    const contentHeight = contentElement.offsetHeight;
    const contentWidth = contentElement.offsetWidth;

    // 컨테이너 크기 (padding 제외)
    const containerHeight = previewContainer.clientHeight - 48; // 상하 패딩 제외
    const containerWidth = previewContainer.clientWidth - 48; // 좌우 패딩 제외

    // 높이와 너비 기준으로 각각 계산하여 더 작은 값 사용
    const heightRatio = containerHeight / contentHeight;
    const widthRatio = containerWidth / contentWidth;
    const fitRatio = Math.min(heightRatio, widthRatio);

    // 줌 레벨 계산 (약간의 여백 포함)
    const fitZoom = Math.floor(fitRatio * 100 * 0.9);
    const clampedZoom = Math.min(Math.max(fitZoom, 25), 200);

    setZoom(clampedZoom);
    setShowZoomMenu(false);
  };

  const handleZoomInMenu = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOutMenu = () => {
    setZoom((prev) => Math.max(prev - 10, 25));
  };

  // Background settings handlers
  const handleBackgroundSettingsChange = useCallback(
    (newSettings: BackgroundSettings) => {
      setBackgroundSettings(newSettings);
      // Debounced save
      if (bgSaveTimerRef.current) clearTimeout(bgSaveTimerRef.current);
      bgSaveTimerRef.current = setTimeout(async () => {
        try {
          await projectsApi.update(projectId, { background_settings: newSettings });
        } catch {
          toast.error("배경 설정 저장에 실패했습니다.");
        }
      }, 500);
    },
    [projectId]
  );

  const handleGenerateBackgroundAI = useCallback(
    async (prompt: string, sectionId?: string, sectionType?: string) => {
      setBgGenerating(true);
      try {
        const result = await backgroundApi.generate(projectId, prompt, sectionType);
        const imageUrl = result.image_url;

        setBackgroundSettings((prev) => {
          let updated: BackgroundSettings;
          if (sectionId) {
            // Per-section
            const sectionBg = prev.per_section[sectionId] || { type: "ai" };
            updated = {
              ...prev,
              per_section: {
                ...prev.per_section,
                [sectionId]: {
                  ...sectionBg,
                  type: "ai",
                  ai_prompt: prompt,
                  ai_image_url: imageUrl,
                },
              },
            };
          } else {
            // Global
            updated = {
              ...prev,
              global: {
                ...prev.global,
                type: "ai",
                ai_prompt: prompt,
                ai_image_url: imageUrl,
              },
            };
          }
          // Save immediately
          projectsApi.update(projectId, { background_settings: updated }).catch(() => {
            toast.error("배경 설정 저장에 실패했습니다.");
          });
          return updated;
        });

        toast.success("배경 이미지가 생성되었습니다.");
      } catch {
        toast.error("배경 이미지 생성에 실패했습니다.");
      } finally {
        setBgGenerating(false);
      }
    },
    [projectId]
  );

  // 줌 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target as Node)) {
        setShowZoomMenu(false);
      }
    };

    if (showZoomMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showZoomMenu]);

  // 프로필 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfileMenu]);

  // 컬러피커 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorPickerSection(null);
      }
    };

    if (colorPickerSection) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [colorPickerSection]);

  const handleLogout = async () => {
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      await authApi.logout(token);
    }
    sessionStorage.removeItem("auth_token");
    router.push("/login");
  };

  // 현재 선택된 섹션의 style_overrides
  const getSelectedStyleOverrides = (): Record<string, Record<string, string>> => {
    if (!selectedElement) return {};
    const sec = sections.find((s) => s.section_id === selectedElement.sectionId);
    return sec?.style_overrides || {};
  };

  const isContentReady = !loading && !generating && sections.length > 0;
  const showCenterLoading = loading || (generating && sections.length === 0);

  const products = project?.products || [];
  const generatedData = project?.generated_data;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        onDownload={handleExport}
        showDownload={isContentReady}
        projects={projectList}
        currentProjectId={projectId}
        onProjectSelect={(id) => router.push(`/result/${id}`)}
        onNewProject={() => setShowNewProjectModal(true)}
        onProjectDelete={handleProjectDelete}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left: Sidebar with Tabs */}
        <aside className="shrink-0 border-r border-border bg-bg-primary flex relative">
          {/* Tab Menu - Always visible */}
          <div className="w-[72px] flex flex-col justify-between border-r border-border shrink-0">
            <div className="flex flex-col">
              <button
                onClick={() => {
                  if (activeTab === "pages" && showSectionList) {
                    setShowSectionList(false);
                  } else {
                    setActiveTab("pages");
                    setShowSectionList(true);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${activeTab === "pages" && showSectionList
                  ? "text-accent bg-accent/10 border-l-2 border-accent"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                  }`}
              >
                <GripVertical size={20} />
                <span className="text-[10px]">페이지</span>
              </button>
              <button
                onClick={() => {
                  if (activeTab === "image" && showSectionList) {
                    setShowSectionList(false);
                  } else {
                    setActiveTab("image");
                    setShowSectionList(true);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${activeTab === "image" && showSectionList
                  ? "text-accent bg-accent/10 border-l-2 border-accent"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                  }`}
              >
                <ImageIcon size={20} />
                <span className="text-[10px]">사진</span>
              </button>
              <button
                onClick={() => {
                  if (activeTab === "background" && showSectionList) {
                    setShowSectionList(false);
                  } else {
                    setActiveTab("background");
                    setShowSectionList(true);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${activeTab === "background" && showSectionList
                  ? "text-accent bg-accent/10 border-l-2 border-accent"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                  }`}
              >
                <Paintbrush size={20} />
                <span className="text-[10px]">배경</span>
              </button>
            </div>

            {/* Profile Button - Bottom */}
            <div className="relative pb-4" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-full flex flex-col items-center gap-1.5 py-3 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-bg-secondary border border-border flex items-center justify-center">
                  <User size={16} />
                </div>
              </button>

              {/* Logout Popup */}
              {showProfileMenu && (
                <div className="absolute bottom-full left-full mb-0 ml-1 bg-white rounded-lg shadow-xl border border-border py-1 min-w-[160px] z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content - Collapsible */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${showSectionList ? 'w-[328px] opacity-100' : 'w-0 opacity-0'
              }`}
          >
            <div className={`w-[328px] h-full overflow-y-auto ${showSectionList ? '' : 'pointer-events-none'}`}>
              {activeTab === "pages" && (
                <div
                  className="p-3 space-y-2"
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDropIndicatorIndex(null);
                    }
                  }}
                >
                  {sections.map((section, index) => (
                    <div key={section.section_id}>
                      {/* Drop indicator line */}
                      {draggedSectionIndex !== null && dropIndicatorIndex === index && (
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                          <div className="h-[2px] bg-accent rounded-full flex-1" />
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-bg-secondary border border-border rounded-sm p-3 hover:border-accent transition-colors cursor-move group ${draggedSectionIndex === index ? 'opacity-40 scale-[0.97]' : ''
                          }`}
                        onClick={() => {
                          if (draggedSectionIndex === null) {
                            const element = document.querySelector(`[data-section-id="${section.section_id}"]`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <div className="flex items-center justify-center w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                          </div>

                          {/* Thumbnail */}
                          <div className="w-16 h-16 bg-bg-tertiary border border-border rounded-sm shrink-0 overflow-hidden">
                            {sectionThumbnails[section.section_id] ? (
                              <img
                                src={sectionThumbnails[section.section_id]}
                                alt={section.section_type}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>

                          {/* Section Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {section.section_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-text-tertiary mt-0.5">
                              섹션 {index + 1}
                            </p>
                          </div>

                        </div>
                      </div>
                      {/* Drop indicator after last item */}
                      {draggedSectionIndex !== null && index === sections.length - 1 && dropIndicatorIndex === sections.length && (
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                          <div className="h-[2px] bg-accent rounded-full flex-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "image" && (
                <div className="p-3 flex flex-col h-full">
                  <p className="text-xs text-text-secondary mb-3">이미지 추가</p>

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-2 auto-rows-min flex-1 overflow-y-auto">
                    {/* AI 생성 이미지 (초기 로드 시 저장된 원본) */}
                    {originalAiImages.map(({ sectionId, key, url }) => (
                      <div
                        key={`ai-${sectionId}-${key}`}
                        className="relative rounded-lg overflow-hidden border border-border hover:border-accent/50 cursor-pointer transition-colors aspect-square"
                        onClick={() => handleApplyImage(url)}
                      >
                        <img
                          src={url}
                          alt={key}
                          className="w-full h-full object-cover"
                        />
                        {/* Download badge - left */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(url);
                              const blob = await res.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download = `${key}_${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(blobUrl);
                            } catch {
                              toast.error("이미지 다운로드에 실패했습니다.");
                            }
                          }}
                          className="absolute top-1.5 left-1.5 p-1 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
                        >
                          <Download size={12} className="text-text-primary" />
                        </button>
                        {/* AI badge - right */}
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-accent text-white text-[10px] font-medium rounded shadow-sm">
                          AI
                        </span>
                      </div>
                    ))}
                    {/* 업로드 및 배경 제거 이미지 */}
                    {uploadedImages.map((img, index) => (
                      <div
                        key={`uploaded-${index}`}
                        className="relative rounded-lg overflow-hidden border border-border hover:border-accent/50 cursor-pointer transition-colors aspect-square"
                        onClick={() => handleApplyImage(img.url)}
                      >
                        <img
                          src={img.url}
                          alt={img.type === "bg_removed" ? `누끼 ${index + 1}` : `업로드 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Download badge - left */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(img.url);
                              const blob = await res.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download = `${img.type === "bg_removed" ? "bg_removed" : "uploaded"}_${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(blobUrl);
                            } catch {
                              toast.error("이미지 다운로드에 실패했습니다.");
                            }
                          }}
                          className="absolute top-1.5 left-1.5 p-1 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
                        >
                          <Download size={12} className="text-text-primary" />
                        </button>
                        {/* 이미지 타입 badge - right */}
                        <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-white text-[10px] font-medium rounded shadow-sm ${
                          img.type === "bg_removed" ? "bg-purple-500" : "bg-emerald-500"
                        }`}>
                          {img.type === "bg_removed" ? "누끼" : "업로드"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-3 w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        이미지 업로드
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeTab === "background" && (
                <BackgroundPanel
                  sections={sections}
                  settings={backgroundSettings}
                  onSettingsChange={handleBackgroundSettingsChange}
                  onGenerateAI={handleGenerateBackgroundAI}
                  generating={bgGenerating}
                  sectionThumbnails={sectionThumbnails}
                />
              )}

            </div>
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setShowSectionList(!showSectionList)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 bg-bg-primary border border-border rounded-full p-1 shadow-md hover:bg-bg-secondary transition-colors z-10"
            title={showSectionList ? "패널 접기" : "패널 열기"}
          >
            {showSectionList ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </aside>

        {/* Floating Text Toolbar (Canva-style) */}
        {selectedElement?.type === "text" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-3">
            {/* Font Family */}
            <select
              value={fontFamily}
              onChange={(e) => {
                setFontFamily(e.target.value);
                applyTextStyle({ fontFamily: e.target.value });
              }}
              className="h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 min-w-[140px]"
            >
              <option value="Pretendard">Pretendard</option>
              <option value="SCoreDream">SCoreDream</option>
              <option value="BmDoHyeonOtf">BmDoHyeonOtf</option>
            </select>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Font Size */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newSize = Math.max(10, fontSize - 2);
                  setFontSize(newSize);
                  applyTextStyle({ fontSize: `${newSize}px` });
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => {
                  const val = Math.min(72, Math.max(10, parseInt(e.target.value) || 16));
                  setFontSize(val);
                  applyTextStyle({ fontSize: `${val}px` });
                }}
                className="w-12 h-8 px-2 border border-gray-300 rounded text-sm text-center bg-white"
              />
              <button
                onClick={() => {
                  const newSize = Math.min(72, fontSize + 2);
                  setFontSize(newSize);
                  applyTextStyle({ fontSize: `${newSize}px` });
                }}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Font Weight */}
            <select
              value={fontWeight}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setFontWeight(val);
                applyTextStyle({ fontWeight: String(val) });
              }}
              className="h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-accent focus:ring-1 focus:ring-accent/20"
            >
              <option value={300}>Light</option>
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>Semi Bold</option>
              <option value={700}>Bold</option>
              <option value={800}>Extra Bold</option>
            </select>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  applyTextStyle({ color: e.target.value });
                }}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        )}


        {/* Center: Preview with Floating Zoom Controls */}
        <main className="flex-1 bg-bg-secondary overflow-auto relative">
          {showCenterLoading ? (
            <div className="min-h-full flex items-center justify-center">
              {generationError ? (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold text-error">생성 실패</h2>
                  <p className="text-sm text-error">{generationError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-accent underline"
                  >
                    다시 시도
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Loader2 size={48} className="text-accent animate-spin mx-auto" />
                  <div>
                    <h2 className="text-xl font-bold mb-2">
                      {generating ? "AI가 멀티 섹션 POP를 생성하고 있습니다" : "프로젝트를 불러오는 중입니다"}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      잠시만 기다려 주세요...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : sections.length > 0 ? (
            <div
              className="min-h-full p-6 flex justify-center items-start"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedElement(null);
              }}
            >
              <div
                className="origin-top overflow-hidden shrink-0"
                style={{
                  width: `${860 * (zoom / 100)}px`,
                  height: 'fit-content',
                }}
              >
                <div
                  style={{
                    width: '860px',
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div className="bg-bg-primary shadow-lg rounded-sm">
                    <SectionRenderer
                      ref={previewRef}
                      sections={sections}
                      zoom={zoom}
                      onDataChange={handleDataChange}
                      onElementSelect={setSelectedElement}
                      selectedPlaceholderId={selectedElement?.placeholderId}
                      onMoveUp={handleSectionMoveUp}
                      onMoveDown={handleSectionMoveDown}
                      onDuplicate={handleSectionDuplicate}
                      onDelete={handleSectionDelete}
                      backgroundSettings={backgroundSettings}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-full flex items-center justify-center text-text-secondary">
              생성된 콘텐츠가 없습니다.
            </div>
          )}

          {/* Floating Zoom Control + Undo/Redo */}
          <div className="sticky bottom-6 left-1/2 -translate-x-1/2 z-10 w-fit mx-auto flex items-center gap-2" ref={zoomMenuRef}>
            {/* Undo / Redo Buttons */}
            <div className="flex items-center bg-bg-primary border border-border rounded-full shadow-lg">
              <button
                onClick={handleUndo}
                disabled={!canUndo()}
                className="p-2 hover:bg-bg-secondary transition-colors rounded-l-full disabled:opacity-30 disabled:cursor-not-allowed"
                title="실행 취소 (⌘Z)"
              >
                <Undo2 size={16} />
              </button>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={handleRedo}
                disabled={!canRedo()}
                className="p-2 hover:bg-bg-secondary transition-colors rounded-r-full disabled:opacity-30 disabled:cursor-not-allowed"
                title="다시 실행 (⌘⇧Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>
            {/* Zoom Menu Popup */}
            {showZoomMenu && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#2b2b2b] rounded-md shadow-lg py-1 min-w-[200px] text-white">
                <div className="px-4 py-2 text-xs font-medium text-gray-400 border-b border-gray-700">
                  Zoom
                  <span className="float-right">Z</span>
                </div>
                <button
                  onClick={handleZoomInMenu}
                  disabled={zoom >= 200}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span>Zoom In</span>
                  <span className="text-xs text-gray-400">⌘ +</span>
                </button>
                <button
                  onClick={handleZoomOutMenu}
                  disabled={zoom <= 25}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span>Zoom Out</span>
                  <span className="text-xs text-gray-400">⌘ -</span>
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                <button
                  onClick={handleZoomReset}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center justify-between"
                >
                  <span>Zoom to 100%</span>
                  <span className="text-xs text-gray-400">⌘ 0</span>
                </button>
                <button
                  onClick={handleZoomToFit}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center justify-between"
                >
                  <span>Zoom to Fit</span>
                  <span className="text-xs text-gray-400">⌘ 1</span>
                </button>
              </div>
            )}

            {/* Zoom Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowZoomMenu(!showZoomMenu);
              }}
              className="bg-bg-primary border border-border rounded-full px-4 py-2 shadow-lg hover:bg-bg-secondary transition-colors flex items-center gap-2 text-sm"
            >
              <ZoomIn size={14} />
              <span className="font-medium">{zoom}%</span>
            </button>
          </div>
        </main>

        {/* Right: Generation Info & Chat */}
        <aside className="w-[360px] shrink-0 border-l border-border bg-bg-primary flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {/* 생성 중 실시간 진행 상황 */}
            {!isContentReady && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">AI 상세페이지 생성 중</h3>
                  <p className="text-xs text-text-secondary">
                    입력하신 정보로 상세페이지를 생성하고 있습니다.
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary text-center">
                    {generationProgress}%
                  </p>
                </div>

                {/* Generation Steps */}
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">
                    생성 진행 상황
                  </h4>
                  <div className="space-y-0">
                    {generationSteps.map((step, i) => {
                      if (step.status === "pending") return null;
                      const isRunning = step.status === "running";
                      const isDone = step.status === "done";
                      const showConnector =
                        i < generationSteps.length - 1 &&
                        generationSteps[i + 1].status !== "pending";
                      return (
                        <div key={i}>
                          <div
                            className="animate-fade-slide-up"
                            style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
                          >
                            <div
                              className={`bg-white rounded-lg border transition-all duration-300 ${
                                isRunning ? "border-accent/30 shadow-sm" : "border-border"
                              }`}
                            >
                              <div className="p-3 flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                    isDone ? "bg-text-primary" : "bg-accent/10"
                                  }`}
                                >
                                  {isDone ? (
                                    <Check size={12} className="text-white" />
                                  ) : (
                                    <Loader2 size={12} className="text-accent animate-spin" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">
                                      {step.label}
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                        isDone
                                          ? "bg-gray-100 text-gray-600"
                                          : "bg-blue-50 text-blue-600"
                                      }`}
                                    >
                                      {isDone ? "완료됨" : "진행 중"}
                                    </span>
                                  </div>
                                  {isRunning && (
                                    <p className="text-xs text-text-secondary mt-1">
                                      {step.detail}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {showConnector && (
                            <div className="flex justify-start ml-[8px]">
                              <div className="w-0.5 h-2 bg-border" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-border" />

                {/* 입력된 상품 정보 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-text-secondary">
                    입력된 정보
                  </h4>
                  <div className="space-y-2">
                    {(project?.products || []).map((prod, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-sm p-3 space-y-2"
                      >
                        {prod.image_url && (
                          <div className="w-16 h-16 rounded-sm border border-border overflow-hidden">
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{prod.name}</p>
                          <p className="text-xs text-text-secondary">{prod.price}</p>
                          {prod.brand_name && (
                            <p className="text-xs text-text-tertiary">{prod.brand_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 생성 완료 후 기존 UI */}
            {isContentReady && (<>
            <div className="space-y-4">
              {/* 입력한 정보 */}
              <div className="bg-white rounded-lg border border-border">
                <button
                  onClick={() => setExpandedInputInfo(!expandedInputInfo)}
                  className="w-full p-3 flex items-center justify-between hover:bg-bg-secondary/50 transition-colors"
                >
                  <h3 className="text-sm font-bold text-text-primary">입력한 정보</h3>
                  <ChevronLeft
                    size={16}
                    className={`text-text-tertiary transition-transform ${expandedInputInfo ? 'rotate-90' : '-rotate-90'}`}
                  />
                </button>

                {expandedInputInfo && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* 테마 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">테마</label>
                      <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border flex items-center gap-2">
                        {generatedData?.theme?.accent_color && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-border"
                            style={{ backgroundColor: generatedData.theme.accent_color }}
                          />
                        )}
                        <p className="text-sm text-text-primary">
                          {generatedData?.theme?.name || project?.theme_id || "-"}
                        </p>
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">
                        상품 정보 ({products.length}개)
                      </label>
                      <div className="space-y-2">
                        {products.map((prod, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 px-3 py-2.5 bg-bg-secondary rounded-md border border-border"
                          >
                            {prod.image_url && (
                              <div className="w-12 h-12 rounded border border-border overflow-hidden shrink-0">
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {prod.name || "-"}
                              </p>
                              {prod.price && (
                                <p className="text-xs text-text-secondary mt-0.5">
                                  {prod.price}
                                </p>
                              )}
                              {prod.brand_name && (
                                <p className="text-xs text-text-tertiary mt-0.5">
                                  {prod.brand_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 선택된 섹션 */}
                    {project?.selected_sections && project.selected_sections.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">선택된 섹션</label>
                        <div className="flex flex-wrap gap-1.5">
                          {project.selected_sections.map((sec) => (
                            <span
                              key={sec}
                              className="px-2.5 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border"
                            >
                              {sec.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 판매 포인트 */}
                    {(generatedData?.selling_points || generatedData?.user_input_points) && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">판매 포인트</label>
                        <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border">
                          <p className="text-sm text-text-primary whitespace-pre-wrap">
                            {generatedData?.selling_points || generatedData?.user_input_points}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 타겟 고객 */}
                    {generatedData?.target_audience && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">타겟 고객</label>
                        <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border">
                          <p className="text-sm text-text-primary">
                            {generatedData.target_audience}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 스타일 & 톤 */}
                    {(generatedData?.style || generatedData?.tone) && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">스타일 & 톤</label>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedData?.style && (
                            <span className="px-2.5 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border">
                              {generatedData.style}
                            </span>
                          )}
                          {generatedData?.tone && (
                            <span className="px-2.5 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border">
                              {generatedData.tone}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 사용 템플릿 */}
                    {(project?.template_used || generatedData?.template_used) && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">사용 템플릿</label>
                        <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border">
                          <p className="text-sm text-text-primary">
                            {project?.template_used || generatedData?.template_used}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* 생성 진행 단계 */}
              <div className="space-y-1">
                {[
                  {
                    name: "이미지 분석",
                    completed: true,
                    detail: "상품 이미지에서 주요 특징과 색상을 분석했습니다."
                  },
                  {
                    name: "템플릿 선택",
                    completed: true,
                    detail: `${project?.template_used || "템플릿"} 선택됨 - ${generatedData?.theme?.name || "스타일"}에 적합한 레이아웃`
                  },
                  {
                    name: "톤앤매너 추출",
                    completed: true,
                    detail: `${generatedData?.theme?.name || "테마"} 스타일로 통일된 디자인 적용`
                  },
                  {
                    name: "콘텐츠 제작",
                    completed: true,
                    detail: "텍스트 및 이미지 콘텐츠 생성 완료"
                  }
                ].map((step, i) => (
                  <div key={i}>
                    <div className="bg-white rounded-lg border border-border">
                      <button
                        onClick={() => setExpandedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="w-full p-2.5 flex items-center gap-2 hover:bg-bg-secondary/50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step.completed ? "bg-black" : "bg-bg-secondary"
                          }`}>
                          {step.completed && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-medium text-text-primary flex-1 text-left">{step.name}</span>
                        <span className="px-2 py-0.5 bg-bg-secondary rounded-full text-[10px] text-text-secondary border border-border shrink-0">
                          완료됨
                        </span>
                        <ChevronLeft
                          size={14}
                          className={`text-text-tertiary transition-transform ${expandedSteps[i] ? 'rotate-90' : '-rotate-90'}`}
                        />
                      </button>
                      {expandedSteps[i] && step.detail && (
                        <div className="px-2.5 pb-2.5 pt-0">
                          <p className="text-xs text-text-secondary leading-relaxed pl-6">
                            {step.detail}
                          </p>
                        </div>
                      )}
                    </div>
                    {i < 4 && (
                      <div className="w-0.5 h-1 bg-border ml-[8px]"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 채팅 메시지 — 하단 고정 */}
            {chatMessages.length > 0 && (
              <>
                <div className="h-px bg-border my-4" />
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <div className="flex flex-col items-end gap-1.5">
                          {msg.attachedImage && (
                            <div className="w-16 h-16 rounded-lg border border-border overflow-hidden">
                              <img src={msg.attachedImage.url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="bg-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]">
                            <p className="text-sm">{msg.text}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="bg-bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[85%]">
                            <p className="text-sm text-text-primary">{msg.text}</p>
                          </div>
                          {msg.imageVersions && msg.imageVersions.length > 0 && msg.sectionId && msg.placeholderId && (
                            <div className="w-full">
                              <p className="text-xs text-text-secondary mb-2">버전 선택 ({msg.imageVersions.length})</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {msg.imageVersions.map((url, vi) => {
                                  const isLatest = vi === msg.imageVersions!.length - 1;
                                  const isFirst = vi === 0;
                                  // 현재 섹션에 적용된 이미지인지 확인
                                  const currentSec = sections.find((s) => s.section_id === msg.sectionId);
                                  const isApplied = currentSec?.data[msg.placeholderId!] === url;
                                  return (
                                    <button
                                      key={vi}
                                      onClick={() => handleSelectVariant(msg.sectionId!, msg.placeholderId!, url)}
                                      className={`group relative rounded-lg overflow-hidden transition-colors ${isApplied
                                        ? "border-2 border-accent"
                                        : "border border-border hover:border-accent"
                                        }`}
                                    >
                                      <img src={url} alt={`v${vi + 1}`} className="w-full aspect-square object-cover" />
                                      <span className={`absolute bottom-0 inset-x-0 text-white text-[10px] py-0.5 text-center ${isApplied ? "bg-accent" : isFirst ? "bg-black/60" : isLatest ? "bg-blue-500/80" : "bg-black/50"
                                        }`}>
                                        {isApplied ? "적용됨" : isFirst ? "원본" : `v${vi}`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-start gap-1.5">
                      <div className="bg-bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-text-tertiary border-t-accent rounded-full animate-spin" />
                          <span className="text-sm text-text-secondary">이미지 생성중...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </>
            )}

            {/* 빈 공간으로 채팅을 하단에 밀기 */}
            <div className="flex-1" />
            </>)}
          </div>

          {/* Chat Input Area */}
          {isContentReady && <div className="border-t border-border bg-white p-4">
            <div className={`bg-bg-secondary rounded-lg border transition-colors duration-200 ${chatAttachedImage ? "border-accent" : "border-border"}`}>
              {/* 첨부 이미지 — 필드 내부 상단, 애니메이션 확장/축소 */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: chatAttachedImage ? "80px" : "0px",
                  opacity: chatAttachedImage ? 1 : 0,
                  padding: chatAttachedImage ? "10px 12px 0 12px" : "0 12px",
                }}
              >
                {chatAttachedImage && (
                  <div className="flex items-start justify-between">
                    <div className="relative group inline-block">
                      <div className="w-14 h-14 rounded-lg border border-border overflow-hidden bg-white">
                        <img src={chatAttachedImage.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => {
                          if (chatAttachedImage.url.startsWith("blob:")) {
                            URL.revokeObjectURL(chatAttachedImage.url);
                          }
                          setChatAttachedImage(null);
                          setChatPendingFile(null);
                          setSelectedElement(null);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-text-secondary text-white rounded-full flex items-center justify-center hover:bg-text-primary transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <button
                      onClick={handleRemoveBg}
                      disabled={bgRemoving || chatLoading}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-tertiary hover:text-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bgRemoving ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>제거중...</span>
                        </>
                      ) : (
                        <>
                          <Eraser size={12} />
                          <span>배경제거</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 텍스트 입력 */}
              <div className="px-3 pt-3 pb-1.5">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder={chatAttachedImage ? "이미지를 어떻게 편집할까요?" : "이미지를 클릭하여 AI로 수정해보세요."}
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                  disabled={chatLoading}
                />
              </div>

              {/* 하단 액션 */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1.5">
                <div>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        toast.error("이미지 파일만 업로드할 수 있습니다.");
                        if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error("파일 크기는 10MB 이하여야 합니다.");
                        if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                        return;
                      }
                      const previewUrl = URL.createObjectURL(file);
                      setChatPendingFile(file);
                      setChatAttachedImage({
                        url: previewUrl,
                        sectionId: chatAttachedImage?.sectionId || selectedElement?.sectionId || "",
                        placeholderId: chatAttachedImage?.placeholderId || selectedElement?.placeholderId || "",
                      });
                      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <ImagePlus size={16} />
                    <span>이미지 추가</span>
                  </button>
                </div>
                <button
                  onClick={handleChatSend}
                  className="p-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
                  disabled={!chatMessage.trim() || !chatAttachedImage || chatLoading}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>}
        </aside>
      </div>

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />
    </div>
  );
}
