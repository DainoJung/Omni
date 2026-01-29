"use client";

import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "입력" },
  { id: 2, label: "템플릿" },
  { id: 3, label: "스타일" },
  { id: 4, label: "생성" },
  { id: 5, label: "편집" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center py-6">
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
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
                {isCompleted ? <Check size={16} /> : step.id}
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

            {/* Connector line */}
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
  );
}
