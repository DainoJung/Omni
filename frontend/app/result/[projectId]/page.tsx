"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/editor/SectionRenderer";
import { PropertyPanel } from "@/components/editor/PropertyPanel";
import { ImagePanel } from "@/components/editor/ImagePanel";
import { Button } from "@/components/ui/Button";
import { projectsApi, sectionsApi } from "@/lib/api";
import { exportImage } from "@/lib/export";
import { toPng } from "html-to-image";
import { Info, ZoomIn, ChevronLeft, ChevronRight, Type, Minus, Plus, GripVertical, FileText, Image as ImageIcon, Sparkles, Send, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import type { Project, RenderedSection } from "@/types";
import type { SelectedElement } from "@/components/editor/SectionBlock";


export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<RenderedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showSectionList, setShowSectionList] = useState(true);
  const [sectionThumbnails, setSectionThumbnails] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"pages" | "text" | "image" | "ai">("pages");
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [expandedInputInfo, setExpandedInputInfo] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

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

  // sectionsRef를 항상 최신 상태로 유지
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    async function load() {
      try {
        const proj = await projectsApi.get(projectId);
        setProject(proj);

        if (proj.rendered_sections?.length) {
          setSections(proj.rendered_sections);
        }
      } catch {
        toast.error("프로젝트를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Generate section thumbnails
  useEffect(() => {
    const generateThumbnails = async () => {
      const thumbnails: Record<string, string> = {};

      for (const section of sections) {
        const element = document.querySelector(`[data-section-id="${section.section_id}"]`) as HTMLElement;
        if (element) {
          try {
            const dataUrl = await toPng(element, {
              quality: 0.5,
              pixelRatio: 0.3,
              cacheBust: true,
            });
            thumbnails[section.section_id] = dataUrl;
          } catch (error) {
            console.error(`Failed to generate thumbnail for ${section.section_id}:`, error);
          }
        }
      }

      setSectionThumbnails(thumbnails);
    };

    // 섹션이 로드되고 DOM에 렌더링된 후 썸네일 생성
    if (sections.length > 0) {
      setTimeout(generateThumbnails, 1000);
    }
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
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          return { ...sec, data: { ...sec.data, [placeholderId]: newValue } };
        })
      );
      // 텍스트 편집은 즉시 저장 (blur 1회만 발생하므로 디바운스 불필요)
      // flushSave는 sectionsRef에서 읽으므로, setState 후 다음 틱에 실행
      setTimeout(() => flushSave(sectionId), 0);
    },
    [flushSave]
  );

  // 스타일 오버라이드 변경 핸들러 (슬라이더/컬러피커 — 빈번하게 호출됨)
  const handleStyleChange = useCallback(
    (placeholderId: string, styles: Record<string, string>) => {
      if (!selectedElement) return;
      const sectionId = selectedElement.sectionId;

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          const overrides = { ...(sec.style_overrides || {}), [placeholderId]: styles };
          return { ...sec, style_overrides: overrides };
        })
      );
      debouncedSave(sectionId);
    },
    [selectedElement, debouncedSave]
  );

  // 스타일 초기화 핸들러
  const handleStyleReset = useCallback(
    (placeholderId: string) => {
      if (!selectedElement) return;
      const sectionId = selectedElement.sectionId;

      setSections((prev) =>
        prev.map((sec) => {
          if (sec.section_id !== sectionId) return sec;
          const overrides = { ...(sec.style_overrides || {}) };
          delete overrides[placeholderId];
          return { ...sec, style_overrides: Object.keys(overrides).length > 0 ? overrides : undefined };
        })
      );
      debouncedSave(sectionId);
    },
    [selectedElement, debouncedSave]
  );

  // 섹션 순서 변경 핸들러
  const handleDragStart = (index: number) => {
    setDraggedSectionIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === index) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedSectionIndex];
    newSections.splice(draggedSectionIndex, 1);
    newSections.splice(index, 0, draggedSection);

    setSections(newSections);
    setDraggedSectionIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedSectionIndex !== null) {
      // 섹션 순서 변경을 서버에 저장
      try {
        await projectsApi.update(projectId, {
          rendered_sections: sections,
        });
        toast.success("섹션 순서가 변경되었습니다.");
      } catch {
        toast.error("섹션 순서 변경에 실패했습니다.");
      }
    }
    setDraggedSectionIndex(null);
  };

  // 이미지 재생성 핸들러
  const handleImageRegenerate = useCallback(
    async (sectionId: string, prompt: string) => {
      try {
        const updatedProject = await sectionsApi.regenerateImage(
          projectId,
          sectionId,
          prompt
        );
        if (updatedProject.rendered_sections) {
          setSections(updatedProject.rendered_sections);
        }
        setProject(updatedProject);
        toast.success("이미지가 재생성되었습니다.");
      } catch {
        toast.error("이미지 재생성에 실패했습니다.");
      }
    },
    [projectId]
  );

  const handleExport = async () => {
    if (!previewRef.current) return;
    try {
      await exportImage(previewRef.current, {
        format: "png",
        quality: 2,
        filename: `PDP_${Date.now()}`,
      });
      toast.success("이미지가 다운로드되었습니다.");
    } catch {
      toast.error("이미지 출력에 실패했습니다.");
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 25));
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


  // 선택된 섹션의 이미지 프롬프트 가져오기 (dict 또는 string)
  const getImagePrompt = (): Record<string, string> | string => {
    if (!selectedElement || !project?.generated_data?.image_prompts) return "";
    const sec = sections.find((s) => s.section_id === selectedElement.sectionId);
    if (!sec) return "";

    const prompts = project.generated_data.image_prompts;
    // sec_type 또는 sec_type__index로 매칭
    return prompts[sec.section_type] || Object.values(prompts).find((_, i) => {
      const key = Object.keys(prompts)[i];
      return key.startsWith(sec.section_type);
    }) || "";
  };

  // 선택된 이미지 URL 가져오기
  const getImageUrl = (): string => {
    if (!selectedElement) return "";
    const sec = sections.find((s) => s.section_id === selectedElement.sectionId);
    if (!sec) return "";
    const phId = selectedElement.placeholderId;
    return sec.data[phId] || "";
  };

  // 현재 선택된 섹션의 style_overrides
  const getSelectedStyleOverrides = (): Record<string, Record<string, string>> => {
    if (!selectedElement) return {};
    const sec = sections.find((s) => s.section_id === selectedElement.sectionId);
    return sec?.style_overrides || {};
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          생성된 콘텐츠가 없습니다.
        </div>
      </div>
    );
  }

  const products = project?.products || [];
  const generatedData = project?.generated_data;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onDownload={handleExport} showDownload={true} />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left: Sidebar with Tabs */}
        <aside
          className={`shrink-0 border-r border-border bg-bg-primary flex transition-all duration-300 ease-in-out ${
            showSectionList ? 'w-[400px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className={`w-[400px] h-full flex ${showSectionList ? '' : 'pointer-events-none'}`}>
            {/* Tab Menu - Left Side */}
            <div className="w-[72px] flex flex-col border-r border-border">
              <button
                onClick={() => setActiveTab("pages")}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${
                  activeTab === "pages"
                    ? "text-accent bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <GripVertical size={20} />
                <span className="text-[10px]">페이지</span>
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${
                  activeTab === "text"
                    ? "text-accent bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <Type size={20} />
                <span className="text-[10px]">텍스트</span>
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${
                  activeTab === "image"
                    ? "text-accent bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <ImageIcon size={20} />
                <span className="text-[10px]">사진</span>
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${
                  activeTab === "ai"
                    ? "text-accent bg-bg-secondary"
                    : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/50"
                }`}
              >
                <Sparkles size={20} />
                <span className="text-[10px]">AI 생성</span>
              </button>
            </div>

            {/* Tab Content - Right Side */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "pages" && (
                <div className="p-3 space-y-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.section_id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-bg-secondary border border-border rounded-sm p-3 hover:border-accent transition-colors cursor-move group ${
                        draggedSectionIndex === index ? 'opacity-50' : ''
                      }`}
                      onClick={(e) => {
                        // 드래그 중이 아닐 때만 스크롤
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
                  ))}
                </div>
              )}

              {activeTab === "text" && (
                <div className="p-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold">텍스트 편집</h3>
                    <p className="text-xs text-text-secondary">
                      텍스트를 클릭하면 상단 툴바에서 폰트, 크기, 두께, 색상을 편집할 수 있습니다.
                    </p>
                    <div className="mt-4 p-3 bg-bg-secondary rounded-sm border border-border">
                      <p className="text-xs text-text-tertiary">
                        💡 텍스트를 더블클릭하면 내용을 직접 수정할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "image" && (
                <div className="p-6">
                  {selectedElement?.type === "image" ? (
                    <ImagePanel
                      selected={selectedElement}
                      imageUrl={getImageUrl()}
                      imagePrompt={getImagePrompt()}
                      onRegenerate={handleImageRegenerate}
                    />
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold">사진 편집</h3>
                      <p className="text-xs text-text-secondary">
                        이미지를 클릭하면 재생성하거나 편집할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ai" && (
                <div className="p-4">
                  <div className="bg-white rounded-lg border border-border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-text-primary">입력한 정보</h3>
                      <button className="p-1 text-accent hover:bg-bg-secondary rounded transition-colors">
                        <ChevronLeft size={16} className="rotate-90" />
                      </button>
                    </div>

                    {/* 상품명 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">상품명</label>
                      <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border">
                        <p className="text-sm text-text-primary">
                          {products[0]?.name || "-"}
                        </p>
                      </div>
                    </div>

                    {/* 판매 포인트 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">판매 포인트</label>
                      <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border min-h-[80px]">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {generatedData?.user_input_points || products.map((p, i) => `${i + 1}. ${p.name}`).join(' ') || "-"}
                        </p>
                      </div>
                    </div>

                    {/* 입력 이미지 */}
                    {products[0]?.image_url && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-secondary">입력 이미지</label>
                        <div className="w-24 h-24 bg-bg-secondary rounded-md border border-border overflow-hidden">
                          <img
                            src={products[0].image_url}
                            alt="product"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* 참고 옵션 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">참고 옵션</label>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border">
                          {generatedData?.style || "내용"}
                        </span>
                        <span className="px-3 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border">
                          {generatedData?.tone || "무드"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 생성 진행 단계 */}
                  <div className="mt-4 space-y-2">
                    {[
                      { name: "이미지 분석", completed: true },
                      { name: "모델 이미지 생성", completed: true },
                      { name: "톤앤매너 추출", completed: true },
                      { name: "레이아웃 디자인", completed: true },
                      { name: "콘텐츠 제작", completed: true }
                    ].map((step, i) => (
                      <div key={i}>
                        <div className="bg-white rounded-lg border border-border p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              step.completed ? "bg-black" : "bg-bg-secondary"
                            }`}>
                              {step.completed && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium text-text-primary">{step.name}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-bg-secondary rounded-full text-xs text-text-secondary border border-border">
                            완료됨
                          </span>
                        </div>
                        {i < 4 && (
                          <div className="w-0.5 h-2 bg-border ml-[10px]"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Toggle button for section list */}
        {!showSectionList && (
          <button
            onClick={() => setShowSectionList(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-bg-primary border border-border rounded-r-full p-1 shadow-md hover:bg-bg-secondary transition-colors z-10"
            title="섹션 리스트 열기"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {showSectionList && (
          <button
            onClick={() => setShowSectionList(false)}
            className="absolute left-[400px] top-1/2 -translate-y-1/2 -translate-x-1/2 bg-bg-primary border border-border rounded-full p-1 shadow-md hover:bg-bg-secondary transition-colors z-10"
            title="섹션 리스트 닫기"
          >
            <ChevronLeft size={14} />
          </button>
        )}

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
          {/* Preview Content */}
          <div className="h-full overflow-auto p-6 flex justify-center items-start">
            <div
              className="max-w-[860px] w-full transition-transform origin-top"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div className="bg-bg-primary shadow-lg rounded-sm overflow-hidden">
                <SectionRenderer
                  ref={previewRef}
                  sections={sections}
                  onDataChange={handleDataChange}
                  onElementSelect={setSelectedElement}
                  selectedPlaceholderId={selectedElement?.placeholderId}
                />
              </div>
            </div>
          </div>

          {/* Floating Zoom Control */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" ref={zoomMenuRef}>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  {/* 상품명 */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">상품명</label>
                    <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border">
                      <p className="text-sm text-text-primary">
                        {products[0]?.name || "-"}
                      </p>
                    </div>
                  </div>

                  {/* 판매 포인트 */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">판매 포인트</label>
                    <div className="px-3 py-2 bg-bg-secondary rounded-md border border-border min-h-[60px]">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">
                        {generatedData?.selling_points || products.map((p, i) => `${i + 1}. ${p.name}`).join('\n') || "-"}
                      </p>
                    </div>
                  </div>

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

                  {/* 입력 이미지 */}
                  {products[0]?.image_url && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">입력 이미지</label>
                      <div className="w-20 h-20 bg-bg-secondary rounded-md border border-border overflow-hidden">
                        <img
                          src={products[0].image_url}
                          alt="product"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* 참고 옵션 */}
                  {generatedData?.theme && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-secondary">참고 옵션</label>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-bg-secondary rounded-full text-xs text-text-primary border border-border">
                          {generatedData.theme.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  name: "레이아웃 디자인",
                  completed: true,
                  detail: `${sections.length}개 섹션으로 구성된 레이아웃 생성`
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
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        step.completed ? "bg-black" : "bg-bg-secondary"
                      }`}>
                        {step.completed && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

          {/* Chat Input Area */}
          <div className="border-t border-border bg-white p-4">
            <div className="bg-bg-secondary rounded-lg border border-border p-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="이미지를 클릭하여 AI 로 수정해보세요."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none mb-3"
              />
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors">
                  <ImagePlus size={16} />
                  <span>이미지 추가</span>
                </button>
                <button
                  className="p-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
                  disabled={!chatMessage.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
