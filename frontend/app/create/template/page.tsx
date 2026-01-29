import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { TemplateSelector } from "@/components/templates/TemplateSelector";

export default function TemplatePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StepIndicator currentStep={2} />

      <main className="flex-1 flex justify-center pb-16">
        <div className="w-full max-w-[960px] px-6">
          <Suspense
            fallback={
              <div className="text-center py-20 text-text-secondary">
                로딩 중...
              </div>
            }
          >
            <TemplateSelector />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
