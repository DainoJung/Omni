"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductInput } from "./ProductInput";
import { projectsApi } from "@/lib/api";
import { toast } from "sonner";
import type { AnalysisResponse } from "@/types";

type Step = "input" | "review";

const STEPS: { id: Step; label: string; number: number }[] = [
  { id: "input", label: "상품 입력", number: 1 },
  { id: "review", label: "확인 & 생성", number: 2 },
];

interface ProjectInputFormProps {
  onSuccess?: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectInputForm({ onSuccess, compact }: ProjectInputFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("input");
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState("ko");

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Step 1 → Step 2: 분석 완료 시
  const handleAnalysisFetched = (analysis: AnalysisResponse | null) => {
    setCurrentStep(analysis ? "review" : "input");
  };

  // "생성하기" 클릭 → 프로젝트 생성 후 바로 결과 페이지로 이동 (생성은 결과 페이지에서)
  const handleGenerate = async (analysis: AnalysisResponse) => {
    setGenerating(true);
    try {
      const scrapedImages = analysis.scraped_data?.images || [];
      const products = analysis.scraped_data
        ? [
            {
              name: analysis.scraped_data.name || analysis.summary || "Product",
              price: analysis.scraped_data.price || undefined,
              brand_name: analysis.scraped_data.brand || undefined,
              image_url: scrapedImages[0] || undefined,
            },
          ]
        : [{ name: analysis.summary || "Product" }];

      const project = await projectsApi.create({
        products,
        page_type: "product_detail",
      });

      await projectsApi.update(project.id, {
        analysis_result: analysis,
        input_data: {
          analysis_result: analysis,
          language,
          product_url: analysis.scraped_data?.url || undefined,
          template_style: analysis.recommended_template_style,
        },
      });

      // 바로 결과 페이지로 이동 (생성은 결과 페이지에서 자동 시작)
      if (onSuccess) {
        onSuccess(project.id);
      } else {
        router.push(`/result/${project.id}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다. 다시 시도해주세요."
      );
      setGenerating(false);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">상품 상세페이지 만들기</h2>
          <p className="text-text-secondary text-sm">
            상품 URL 또는 상품명을 입력하면 AI가 자동으로 분석하고 최적의 상세페이지를 생성합니다.
          </p>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center py-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = step.id === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-tertiary"
                  }`}
                >
                  {isCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs ${
                    isCurrent
                      ? "text-text-primary font-semibold"
                      : isCompleted
                      ? "text-success"
                      : "text-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`w-16 h-px mx-2 mt-[-14px] ${
                    isCompleted ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ProductInput handles both input view and result view */}
      <ProductInput
        onAnalysisComplete={handleGenerate}
        onAnalysisFetched={handleAnalysisFetched}
        language={language}
        onLanguageChange={setLanguage}
        generating={generating}
      />
    </div>
  );
}
