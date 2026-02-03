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
import { Download, RefreshCw, Info } from "lucide-react";
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
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ sectionId: string } | null>(null);
  const sectionsRef = useRef<RenderedSection[]>([]);

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

  // 빈 영역 클릭 시 선택 해제
  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-placeholder]")) {
      setSelectedElement(null);
    }
  }, []);

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

  const handleRegenerate = () => {
    router.push(`/generate/${projectId}`);
  };

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
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Context-aware panel (sticky) */}
        <aside className="w-[300px] shrink-0 border-r border-border overflow-hidden flex flex-col">
          {selectedElement?.type === "text" ? (
            <div className="overflow-y-auto p-6 space-y-6">
              <PropertyPanel
                selected={selectedElement}
                styleOverrides={getSelectedStyleOverrides()}
                onStyleChange={handleStyleChange}
                onReset={handleStyleReset}
              />
            </div>
          ) : selectedElement?.type === "image" ? (
            <div className="flex-1 min-h-0 p-6">
              <ImagePanel
                selected={selectedElement}
                imageUrl={getImageUrl()}
                imagePrompt={getImagePrompt()}
                onRegenerate={handleImageRegenerate}
              />
            </div>
          ) : (
            <div className="overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-1">생성 결과</h3>
                <p className="text-sm text-text-secondary">
                  요소를 클릭하여 스타일을 편집하세요.
                  <br />
                  텍스트를 더블클릭하면 내용을 수정합니다.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Info size={14} className="text-text-tertiary" />
                  <span className="text-text-secondary">생성 정보</span>
                </div>
                <div className="space-y-2 text-sm">
                  {generatedData?.theme && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">테마</span>
                      <span className="font-medium">
                        {generatedData.theme.icon} {generatedData.theme.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-secondary">템플릿</span>
                    <span className="font-medium">
                      {project?.template_used || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">상품 수</span>
                    <span className="font-medium">{products.length}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">섹션 수</span>
                    <span className="font-medium">{sections.length}개</span>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* 상품 목록 */}
              <div className="space-y-3">
                <span className="text-sm font-medium text-text-secondary">
                  상품 목록
                </span>
                {products.map((prod, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-sm p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{prod.name}</p>
                    <p className="text-xs text-text-secondary">{prod.price}</p>
                  </div>
                ))}
              </div>

              <hr className="border-border" />

              {/* 액션 버튼 */}
              <div className="space-y-3">
                <Button size="sm" className="w-full" onClick={handleExport}>
                  <Download size={16} className="mr-1.5" />
                  이미지 다운로드
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={handleRegenerate}
                >
                  <RefreshCw size={16} className="mr-1.5" />
                  다시 생성
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* Right: Preview */}
        <main
          className="flex-1 bg-bg-secondary overflow-auto p-6 flex justify-center items-start"
          onClick={handlePreviewClick}
        >
          <div className="max-w-[860px] w-full">
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
        </main>
      </div>
    </div>
  );
}
