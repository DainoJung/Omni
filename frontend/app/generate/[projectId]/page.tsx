"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SectionRenderer } from "@/components/editor/SectionRenderer";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Check, Loader2 } from "lucide-react";
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
    { label: string; detail: string; status: StepStatus }[]
  >([
    { label: "입력 분석", detail: "상품 이미지 및 정보를 분석하고 있습니다.", status: "pending" },
    { label: "HTML 템플릿 조회", detail: "최적의 레이아웃 템플릿을 선택하고 있습니다.", status: "pending" },
    { label: "AI 배경 & 텍스트 생성", detail: "AI가 배경 이미지와 텍스트를 생성하고 있습니다.", status: "pending" },
    { label: "템플릿 데이터 바인딩", detail: "생성된 콘텐츠를 템플릿에 적용하고 있습니다.", status: "pending" },
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

  const StepCard = ({
    step,
    index,
  }: {
    step: { label: string; detail: string; status: StepStatus };
    index: number;
  }) => {
    if (step.status === "pending") return null;

    const isRunning = step.status === "running";
    const isDone = step.status === "done";

    return (
      <div
        className="animate-fade-slide-up"
        style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
      >
        <div
          className={`bg-white rounded-lg border transition-all duration-300 ${isRunning
              ? "border-accent/30 shadow-sm"
              : "border-border"
            }`}
        >
          <div className="p-3 flex items-start gap-3">
            {/* Icon */}
            <div
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDone
                  ? "bg-text-primary"
                  : "bg-accent/10"
                }`}
            >
              {isDone ? (
                <Check size={12} className="text-white" />
              ) : (
                <Loader2 size={12} className="text-accent animate-spin" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {step.label}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDone
                      ? "bg-gray-100 text-gray-600"
                      : "bg-blue-50 text-blue-600"
                    }`}
                >
                  {isDone ? "완료됨" : "진행 중"}
                </span>
              </div>
              {isRunning && (
                <p className="text-xs text-text-secondary mt-1 transition-all duration-300">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
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
                  onDataChange={() => { }}
                  onElementSelect={() => { }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Loader2 size={48} className="text-accent animate-spin mx-auto" />
              <div>
                <h2 className="text-xl font-bold mb-2">
                  AI가 멀티 섹션 POP를 생성하고 있습니다
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

            {/* Generation Steps — Card UI */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                생성 진행 상황
              </h4>
              <div className="space-y-0">
                {steps.map((step, i) => {
                  if (step.status === "pending") return null;
                  const showConnector =
                    i < steps.length - 1 &&
                    steps[i + 1].status !== "pending";
                  return (
                    <div key={i}>
                      <StepCard step={step} index={i} />
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
