"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProductInput } from "./ProductInput";
import { projectsApi, generateApi } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Globe } from "lucide-react";
import type { AnalysisResponse } from "@/types";

type Step = "input" | "review" | "generate";

const STEPS: { id: Step; label: string; number: number }[] = [
  { id: "input", label: "상품 입력", number: 1 },
  { id: "review", label: "결과 확인", number: 2 },
  { id: "generate", label: "생성", number: 3 },
];

const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
];

interface ProjectInputFormProps {
  onSuccess?: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectInputForm({ onSuccess, compact }: ProjectInputFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);

  // Analysis result (confirmed by user in step 2)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  // Settings
  const [language, setLanguage] = useState("ko");

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Step 1 → Step 2: 분석 완료 시 스텝 인디케이터 업데이트
  const handleAnalysisFetched = (analysis: AnalysisResponse | null) => {
    if (analysis) {
      setCurrentStep("review");
    } else {
      // 사용자가 "다시 검색" 클릭
      setCurrentStep("input");
    }
  };

  // Step 2 → Step 3: 사용자가 "다음 단계" 클릭하여 결과 확정
  const handleAnalysisConfirmed = (analysis: AnalysisResponse) => {
    setAnalysisResult(analysis);
    setCurrentStep("generate");
  };

  const handleGenerate = async () => {
    if (!analysisResult) return;

    setLoading(true);
    try {
      // Build products array from analysis result
      const scrapedImages = analysisResult.scraped_data?.images || [];
      const products = analysisResult.scraped_data
        ? [
            {
              name: analysisResult.scraped_data.name,
              price: analysisResult.scraped_data.price || undefined,
              brand_name: analysisResult.scraped_data.brand || undefined,
              image_url: scrapedImages[0] || undefined,
            },
          ]
        : [{ name: analysisResult.summary || "Product" }];

      // 1. Create project with product_detail page type
      const project = await projectsApi.create({
        products,
        page_type: "product_detail",
      });

      // 2. Save analysis result for scraped image pipeline
      await projectsApi.update(project.id, {
        input_data: {
          analysis_result: analysisResult,
          language,
          product_url: analysisResult.scraped_data?.url || undefined,
        },
      });

      // 3. Generate using v1 pipeline with product_detail template
      await generateApi.generate({
        project_id: project.id,
        products,
        page_type: "product_detail",
      });

      if (onSuccess) {
        onSuccess(project.id);
      } else {
        router.push(`/result/${project.id}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "생성에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
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

      {/* Step Content */}
      {/* Steps 1 & 2 are both handled by ProductInput (input view + result view) */}
      {(currentStep === "input" || currentStep === "review") && (
        <ProductInput
          onAnalysisComplete={handleAnalysisConfirmed}
          onAnalysisFetched={handleAnalysisFetched}
        />
      )}

      {/* Step 3: Generate */}
      {currentStep === "generate" && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          {analysisResult && (
            <div className="border border-border rounded-sm p-4 space-y-3">
              <h4 className="text-sm font-medium text-text-primary">생성 정보</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-tertiary">상품명</span>
                  <p className="text-text-primary font-medium mt-0.5">
                    {analysisResult.scraped_data?.name || analysisResult.summary}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">카테고리</span>
                  <p className="text-text-primary font-medium mt-0.5">
                    {analysisResult.category} / {analysisResult.subcategory}
                  </p>
                </div>
                <div>
                  <span className="text-text-tertiary">타겟</span>
                  <p className="text-text-primary font-medium mt-0.5">{analysisResult.target_customer}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">톤앤매너</span>
                  <p className="text-text-primary font-medium mt-0.5">{analysisResult.tone}</p>
                </div>
              </div>
              {analysisResult.usp_points.length > 0 && (
                <div>
                  <span className="text-xs text-text-tertiary">USP</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.usp_points.slice(0, 3).map((usp, i) => (
                      <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-sm">
                        {usp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* 이미지 미리보기 */}
              {analysisResult.scraped_data?.images && analysisResult.scraped_data.images.length > 0 && (
                <div>
                  <span className="text-xs text-text-tertiary">참조 이미지</span>
                  <div className="flex gap-1.5 mt-1">
                    {analysisResult.scraped_data.images.slice(0, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`참조 ${i + 1}`}
                        className="w-12 h-12 rounded-sm object-cover border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="border border-border rounded-sm p-4 space-y-3">
            <h4 className="text-sm font-medium text-text-primary">생성 설정</h4>

            {/* Language selection */}
            <div className="space-y-2">
              <span className="text-xs text-text-tertiary flex items-center gap-1">
                <Globe size={12} />
                생성 언어
              </span>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                      language === lang.code
                        ? "border-accent bg-accent/10 text-accent font-medium"
                        : "border-border text-text-tertiary hover:border-text-secondary"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep("review")}
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              이전
            </Button>
            <Button
              onClick={handleGenerate}
              loading={loading}
              className="flex-1"
            >
              {loading ? "생성 중..." : "AI 상세페이지 생성하기"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
