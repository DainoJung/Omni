"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { TextOverlayRenderer } from "@/components/layout/TextOverlayRenderer";
import { Button } from "@/components/ui/Button";
import { projectsApi } from "@/lib/api";
import { exportImage } from "@/lib/export";
import { Download, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import type { Project, SectionResult, ProductInput } from "@/types";

const SECTION_LABELS: Record<string, string> = {
  hero_banner: "히어로 배너",
  single_feature: "단일 상품 피처",
  product_grid: "상품 그리드",
  detail_info: "상세 정보",
  cta_footer: "CTA 푸터",
};

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const proj = await projectsApi.get(projectId);
        setProject(proj);
      } catch {
        toast.error("프로젝트를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleExport = async () => {
    if (!previewRef.current) return;
    try {
      await exportImage(previewRef.current, {
        format: "png",
        quality: 2,
        filename: `${project?.brand_name || "PDP"}_${Date.now()}`,
      });
      toast.success("이미지가 다운로드되었습니다.");
    } catch {
      toast.error("이미지 출력에 실패했습니다.");
    }
  };

  const handleRegenerate = () => {
    router.push(`/generate/${projectId}`);
  };

  const handleTextChange = async (
    sectionOrder: number,
    areaId: string,
    newText: string
  ) => {
    if (!project?.pipeline_result) return;
    const updatedSections = project.pipeline_result.sections.map((section) => {
      if (section.order !== sectionOrder) return section;
      return {
        ...section,
        text_areas: section.text_areas.map((ta) =>
          ta.id === areaId ? { ...ta, override_text: newText } : ta
        ),
      };
    });
    const updatedResult = {
      ...project.pipeline_result,
      sections: updatedSections,
    };
    try {
      await projectsApi.update(projectId, {
        pipeline_result: updatedResult,
      });
    } catch {
      // 조용히 실패
    }
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

  if (!project?.pipeline_result?.sections?.length) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          생성된 콘텐츠가 없습니다.
        </div>
      </div>
    );
  }

  const { pipeline_result } = project;
  const sections: SectionResult[] = pipeline_result.sections.sort(
    (a, b) => a.order - b.order
  );
  const products: ProductInput[] = project.products || [];
  const totalTextAreas = sections.reduce(
    (sum, s) => sum + s.text_areas.length,
    0
  );

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
              <div className="flex justify-between">
                <span className="text-text-secondary">브랜드</span>
                <span className="font-medium">{project.brand_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">총 섹션</span>
                <span className="font-medium">{sections.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">텍스트 영역</span>
                <span className="font-medium">{totalTextAreas}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">상품 수</span>
                <span className="font-medium">{products.length}개</span>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* 섹션 목록 */}
          <div className="space-y-3">
            <span className="text-sm font-medium text-text-secondary">
              섹션 구성
            </span>
            {sections.map((section) => (
              <div
                key={section.order}
                className="border border-border rounded-sm p-3 space-y-1"
              >
                <p className="text-sm font-medium">
                  {section.order + 1}.{" "}
                  {SECTION_LABELS[section.section_key] || section.section_key}
                </p>
                <p className="text-xs text-text-secondary">
                  텍스트 영역 {section.text_areas.length}개
                </p>
              </div>
            ))}
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
            <Button
              size="sm"
              className="w-full"
              onClick={handleExport}
            >
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

        {/* Right: Preview - vertical stack of sections */}
        <main className="flex-1 bg-bg-secondary overflow-auto p-8 flex justify-center">
          <div ref={previewRef} className="max-w-[860px] w-full space-y-0">
            {sections.map((section) => (
              <div key={section.order}>
                <div className="bg-bg-primary shadow-lg">
                  <TextOverlayRenderer
                    layoutImageUrl={section.layout_image_url}
                    textAreas={section.text_areas}
                    products={products}
                    brandName={project.brand_name}
                    editable
                    onTextChange={(areaId, newText) =>
                      handleTextChange(section.order, areaId, newText)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
