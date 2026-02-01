"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { SectionRenderer } from "@/components/editor/SectionRenderer";
import { Button } from "@/components/ui/Button";
import { projectsApi, sectionsApi } from "@/lib/api";
import { exportImage } from "@/lib/export";
import { Download, RefreshCw, Info, Layers } from "lucide-react";
import { toast } from "sonner";
import type { Project, RenderedSection } from "@/types";

const SECTION_LABELS: Record<string, string> = {
  hero_banner: "히어로 배너",
  feature_badges: "특징 뱃지",
  description: "상세 설명",
  feature_point: "특징 포인트",
};

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<RenderedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

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

  // 섹션 데이터 변경 핸들러
  const handleDataChange = async (
    sectionId: string,
    placeholderId: string,
    newValue: string
  ) => {
    const updated = sections.map((sec) => {
      if (sec.section_id !== sectionId) return sec;
      return {
        ...sec,
        data: { ...sec.data, [placeholderId]: newValue },
      };
    });
    setSections(updated);

    try {
      const targetSection = updated.find((s) => s.section_id === sectionId);
      if (targetSection) {
        await sectionsApi.updateData(
          projectId,
          sectionId,
          targetSection.data
        );
      }
    } catch {
      // 조용히 실패
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <StepIndicator currentStep={3} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Info panel */}
        <aside className="w-[300px] border-r border-border overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-1">생성 결과</h3>
            <p className="text-sm text-text-secondary">
              텍스트를 더블클릭하여 편집할 수 있습니다.
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

          {/* 섹션별 editable 데이터 항목 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Layers size={14} className="text-text-tertiary" />
              <span className="font-medium text-text-secondary">
                섹션별 편집
              </span>
            </div>
            {[...sections]
              .sort((a, b) => a.order - b.order)
              .map((sec) => {
                // editable 데이터 항목 필터링 (data-editable="true" 속성이 있는 것들)
                const editableKeys = Object.keys(sec.data).filter((key) => {
                  return sec.html_template.includes(
                    `data-placeholder="${key}" data-editable="true"`
                  );
                });
                if (editableKeys.length === 0) return null;

                return (
                  <div key={sec.section_id} className="space-y-2">
                    <p className="text-xs font-medium text-text-tertiary uppercase">
                      {SECTION_LABELS[sec.section_type] || sec.section_type}
                    </p>
                    {editableKeys.map((key) => (
                      <div
                        key={key}
                        className="border border-border rounded-sm p-2 space-y-1"
                      >
                        <p className="text-xs text-text-tertiary">{key}</p>
                        <p className="text-sm font-medium truncate">
                          {sec.data[key] || "(비어있음)"}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
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
        </aside>

        {/* Right: Preview */}
        <main className="flex-1 bg-bg-secondary overflow-auto p-8 flex justify-center">
          <div className="max-w-[860px] w-full">
            <div className="bg-bg-primary shadow-lg rounded-sm overflow-hidden">
              <SectionRenderer
                ref={previewRef}
                sections={sections}
                onDataChange={handleDataChange}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
