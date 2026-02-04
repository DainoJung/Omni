"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/editor/SectionRenderer";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Check, Loader2, Clock } from "lucide-react";
import { generateApi, projectsApi } from "@/lib/api";
import { toast } from "sonner";
import type { ProductInput, Project, RenderedSection } from "@/types";

type StepStatus = "pending" | "running" | "done";

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [previewSections, setPreviewSections] = useState<RenderedSection[]>([]);
  const [steps, setSteps] = useState<
    { label: string; status: StepStatus }[]
  >([
    { label: "입력 분석", status: "pending" },
    { label: "HTML 템플릿 조회", status: "pending" },
    { label: "AI 배경 & 텍스트 생성", status: "pending" },
    { label: "템플릿 데이터 바인딩", status: "pending" },
  ]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((s) =>
      s.map((st, i) => (i === index ? { ...st, status } : st))
    );
  };

  useEffect(() => {
    async function run() {
      try {
        // 프로젝트 조회
        const proj = await projectsApi.get(projectId);
        setProject(proj);

        const products: ProductInput[] = proj.products || [];
        const themeId = proj.theme_id || "holiday";

        // Step 1: 입력 분석
        updateStep(0, "running");
        setProgress(10);
        await new Promise((r) => setTimeout(r, 400));
        updateStep(0, "done");
        setProgress(15);

        // Step 2: 템플릿 선택
        updateStep(1, "running");
        setProgress(20);

        // Step 3: AI 생성 (서버에서 템플릿 선택 + AI 생성 + 바인딩 모두 처리)
        updateStep(2, "running");
        setProgress(30);

        await generateApi.generate({
          project_id: projectId,
          products,
          theme: themeId,
        });

        updateStep(1, "done");
        updateStep(2, "done");
        setProgress(85);

        // Step 4: 슬롯 바인딩 완료 + 프리뷰 표시
        updateStep(3, "running");
        setProgress(90);

        // 프로젝트 다시 조회해서 렌더링된 섹션 가져오기
        const updatedProj = await projectsApi.get(projectId);
        if (updatedProj.rendered_sections) {
          setPreviewSections(updatedProj.rendered_sections);
        }

        await new Promise((r) => setTimeout(r, 400));
        updateStep(3, "done");
        setProgress(100);

        // 결과 페이지로 이동
        setTimeout(() => {
          router.push(`/result/${projectId}`);
        }, 800);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "생성에 실패했습니다."
        );
        toast.error("AI 생성에 실패했습니다. 다시 시도해 주세요.");
      }
    }

    run();
  }, [projectId, router]);

  const StatusIcon = ({ status }: { status: StepStatus }) => {
    switch (status) {
      case "done":
        return <Check size={16} className="text-success" />;
      case "running":
        return <Loader2 size={16} className="text-accent animate-spin" />;
      default:
        return <Clock size={16} className="text-text-tertiary" />;
    }
  };

  const products = project?.products || [];
  const themeData = project?.generated_data?.theme;
  const templateUsed = project?.template_used;
  const selectedSections = project?.selected_sections || [];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Center: Loading State */}
        <main className="flex-1 bg-bg-secondary overflow-auto flex justify-center items-center">
          {error ? (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold text-error">생성 실패</h2>
              <p className="text-sm text-error">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-accent underline"
              >
                다시 시도
              </button>
            </div>
          ) : previewSections.length > 0 ? (
            <div className="max-w-[860px] w-full p-6">
              <div className="bg-bg-primary shadow-lg rounded-sm overflow-hidden">
                <SectionRenderer
                  ref={previewRef}
                  sections={previewSections}
                  onDataChange={() => {}}
                  onElementSelect={() => {}}
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Loader2 size={48} className="text-accent animate-spin mx-auto" />
              <div>
                <h2 className="text-xl font-bold mb-2">
                  AI가 멀티 섹션 PDP를 생성하고 있습니다
                </h2>
                <p className="text-sm text-text-secondary">
                  잠시만 기다려 주세요...
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel: Input Data + Progress */}
        <aside className="w-[320px] shrink-0 border-l border-border overflow-y-auto bg-bg-primary">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">AI 상세페이지 생성 중</h3>
              <p className="text-xs text-text-secondary">
                입력하신 정보로 상세페이지를 생성하고 있습니다.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <ProgressBar progress={progress} />
              <p className="text-xs text-text-secondary text-center">
                {progress}%
              </p>
            </div>

            {/* Generation Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-secondary">
                생성 진행 상황
              </h4>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StatusIcon status={step.status} />
                  <span
                    className={`text-sm ${
                      step.status === "done"
                        ? "text-success"
                        : step.status === "running"
                        ? "text-text-primary font-medium"
                        : "text-text-tertiary"
                    }`}
                  >
                    {step.label}
                    {step.status === "done" && " 완료"}
                    {step.status === "running" && " 중..."}
                  </span>
                </div>
              ))}
            </div>

            <hr className="border-border" />

            {/* Input Data */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-text-secondary">
                입력된 정보
              </h4>

              {/* Theme */}
              {themeData && (
                <div className="space-y-1">
                  <p className="text-xs text-text-tertiary">테마</p>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{themeData.icon}</span>
                    <span className="text-sm font-medium">
                      {themeData.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Template */}
              {templateUsed && (
                <div className="space-y-1">
                  <p className="text-xs text-text-tertiary">템플릿</p>
                  <p className="text-sm font-medium">{templateUsed}</p>
                </div>
              )}

              {/* Sections (single product mode only) */}
              {products.length < 2 && selectedSections.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-text-tertiary">
                    선택한 섹션 ({selectedSections.length}개)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSections.map((sec, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-bg-secondary rounded-sm text-text-secondary"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary">
                  상품 정보 ({products.length}개)
                </p>
                {products.map((prod, i) => (
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
                      <p className="text-xs text-text-secondary">
                        {prod.price}
                      </p>
                      {prod.brand_name && (
                        <p className="text-xs text-text-tertiary">
                          {prod.brand_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
