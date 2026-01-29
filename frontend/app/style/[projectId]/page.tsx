"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Button } from "@/components/ui/Button";
import { ColorPresetSelector } from "@/components/style/ColorPresetSelector";
import { ToneMannerSelector } from "@/components/style/ToneManner";
import { colorsApi, projectsApi } from "@/lib/api";
import type { ColorPreset, ToneManner } from "@/types";
import { toast } from "sonner";

export default function StylePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [presets, setPresets] = useState<ColorPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneManner | null>(null);
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [colorsRes, project] = await Promise.all([
          colorsApi.list(),
          projectsApi.get(projectId),
        ]);
        setPresets(colorsRes.items);
        setBrandName(project.brand_name);
        setCategory(project.category || undefined);

        // 기존 선택값 복원
        if (project.color_preset_id) {
          setSelectedPresetId(project.color_preset_id);
        }
        if (project.tone_manner) {
          setSelectedTone(project.tone_manner);
        }
      } catch {
        toast.error("스타일 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleNext = async () => {
    setSubmitting(true);
    try {
      await projectsApi.update(projectId, {
        color_preset_id: selectedPresetId || undefined,
        tone_manner: selectedTone || undefined,
      });
      router.push(`/generate/${projectId}`);
    } catch {
      toast.error("스타일 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push(`/generate/${projectId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <StepIndicator currentStep={3} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary">스타일 정보를 불러오는 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StepIndicator currentStep={3} />

      <main className="flex-1 flex justify-center pb-16">
        <div className="w-full max-w-[960px] px-6 space-y-8">
          {/* 헤더 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold">스타일 선택</h2>
          </div>

          {/* 컬러 프리셋 선택 */}
          <ColorPresetSelector
            presets={presets}
            selectedId={selectedPresetId}
            onSelect={setSelectedPresetId}
          />

          {/* 구분선 */}
          <hr className="border-border" />

          {/* 톤앤매너 추천 */}
          <ToneMannerSelector
            brandName={brandName}
            category={category}
            colorPresetId={selectedPresetId || undefined}
            selected={selectedTone}
            onSelect={setSelectedTone}
          />

          {/* 하단 버튼 */}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleSkip}>
              건너뛰기
            </Button>
            <Button
              size="lg"
              onClick={handleNext}
              loading={submitting}
            >
              다음: AI 생성 시작
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
