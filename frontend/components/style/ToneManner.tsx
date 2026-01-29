"use client";

import { useState } from "react";
import { Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toneMannerApi } from "@/lib/api";
import type { ToneManner, ToneMannerRequest } from "@/types";
import { toast } from "sonner";

interface ToneMannerProps {
  brandName: string;
  category?: string;
  colorPresetId?: string;
  selected: ToneManner | null;
  onSelect: (tone: ToneManner | null) => void;
}

export function ToneMannerSelector({
  brandName,
  category,
  colorPresetId,
  selected,
  onSelect,
}: ToneMannerProps) {
  const [recommendations, setRecommendations] = useState<ToneManner[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const data: ToneMannerRequest = {
        brand_name: brandName,
        category: category || undefined,
        color_preset_id: colorPresetId || undefined,
      };
      const result = await toneMannerApi.recommend(data);
      setRecommendations(result.recommendations);
      setHasLoaded(true);
    } catch {
      toast.error("톤앤매너 추천에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">톤앤매너 선택</h3>
          <p className="text-sm text-text-secondary">
            AI가 브랜드에 맞는 톤앤매너를 추천합니다. (선택 사항)
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleRecommend}
          loading={loading}
          disabled={loading}
        >
          <Sparkles size={14} className="mr-1.5" />
          {hasLoaded ? "다시 추천" : "AI 추천 받기"}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-text-secondary">
          <Loader2 size={20} className="animate-spin mr-2" />
          AI가 톤앤매너를 분석하고 있습니다...
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recommendations.map((tone, i) => {
            const isSelected =
              selected?.style === tone.style &&
              selected?.mood === tone.mood;

            return (
              <button
                key={i}
                onClick={() => onSelect(isSelected ? null : tone)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-accent shadow-md bg-accent/5"
                    : "border-border hover:border-text-tertiary"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}

                <p className="font-semibold text-sm mb-1">{tone.style}</p>
                <p className="text-xs text-text-secondary mb-2">
                  {tone.mood}
                </p>
                <p className="text-xs text-text-tertiary mb-3">
                  {tone.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {tone.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && hasLoaded && selected && (
        <p className="text-xs text-accent">
          선택됨: {selected.style} - {selected.mood}
        </p>
      )}
    </div>
  );
}
