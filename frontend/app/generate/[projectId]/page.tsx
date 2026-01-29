"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Check, Loader2, Clock } from "lucide-react";
import { generateApi, projectsApi } from "@/lib/api";
import { toast } from "sonner";

type StepStatus = "pending" | "running" | "done";

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [steps, setSteps] = useState<
    { label: string; status: StepStatus }[]
  >([
    { label: "텍스트 생성", status: "pending" },
    { label: "이미지 생성", status: "pending" },
    { label: "레이아웃 합성", status: "pending" },
  ]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        // 프로젝트 조회하여 template_id 가져오기
        const project = await projectsApi.get(projectId);
        if (!project.template_id) {
          toast.error("템플릿이 선택되지 않았습니다.");
          router.push(`/create/template?projectId=${projectId}`);
          return;
        }

        // Step 1: 텍스트 생성
        setSteps((s) =>
          s.map((st, i) => (i === 0 ? { ...st, status: "running" } : st))
        );
        setProgress(15);

        // 실제 생성 호출 (스타일 정보 포함)
        await generateApi.generate(
          projectId,
          project.template_id,
          project.color_preset_id || undefined,
          project.tone_manner || undefined
        );

        // Step 1 완료
        setSteps((s) =>
          s.map((st, i) => (i === 0 ? { ...st, status: "done" } : st))
        );
        setProgress(40);

        // Step 2: 이미지 생성 (서버에서 함께 처리됨)
        setSteps((s) =>
          s.map((st, i) =>
            i === 1 ? { ...st, status: "done" } : st
          )
        );
        setProgress(75);

        // Step 3: 레이아웃 합성
        setSteps((s) =>
          s.map((st, i) =>
            i === 2 ? { ...st, status: "done" } : st
          )
        );
        setProgress(100);

        // 편집 페이지로 이동
        setTimeout(() => {
          router.push(`/edit/${projectId}`);
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
      <StepIndicator currentStep={4} />

      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[400px] text-center space-y-8">
          <h2 className="text-xl font-bold">
            {error ? "생성 실패" : "AI가 상세페이지를 만들고 있습니다"}
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
