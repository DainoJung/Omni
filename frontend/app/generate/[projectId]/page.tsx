"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Check, Loader2, Clock } from "lucide-react";
import { generateApi, projectsApi } from "@/lib/api";
import { toast } from "sonner";
import type { ProductInput } from "@/types";

type StepStatus = "pending" | "running" | "done";

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

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

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((s) =>
      s.map((st, i) => (i === index ? { ...st, status } : st))
    );
  };

  useEffect(() => {
    async function run() {
      try {
        // 프로젝트 조회
        const project = await projectsApi.get(projectId);

        const products: ProductInput[] = project.products || [];
        const themeId = project.theme_id || "holiday";

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

        // Step 4: 슬롯 바인딩 완료
        updateStep(3, "running");
        setProgress(90);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StepIndicator currentStep={2} />

      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[400px] text-center space-y-8">
          <h2 className="text-xl font-bold">
            {error ? "생성 실패" : "AI가 멀티 섹션 PDP를 생성하고 있습니다"}
          </h2>

          {!error && (
            <>
              <div className="w-48 mx-auto">
                <ProgressBar progress={progress} />
                <p className="text-sm text-text-secondary mt-2">
                  {progress}%
                </p>
              </div>

              <div className="text-left space-y-3">
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
            </>
          )}

          {error && (
            <div className="space-y-4">
              <p className="text-sm text-error">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-accent underline"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
