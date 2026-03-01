"use client";

import { useEffect, useState } from "react";
import { templateCatalogApi } from "@/lib/api";
import { Sparkles, Loader2 } from "lucide-react";
import type { TemplateStyle, TemplateStyleInfo } from "@/types";

interface TemplateGalleryProps {
  recommended?: TemplateStyle;
  selected: TemplateStyle | null;
  onSelect: (style: TemplateStyle) => void;
}

const STYLE_PREVIEWS: Record<TemplateStyle, { emoji: string; gradient: string }> = {
  clean_minimal: {
    emoji: "✨",
    gradient: "from-gray-50 to-white",
  },
  premium_luxury: {
    emoji: "💎",
    gradient: "from-gray-900 to-gray-800",
  },
  bold_casual: {
    emoji: "🎨",
    gradient: "from-rose-500 to-orange-400",
  },
  tech_modern: {
    emoji: "⚡",
    gradient: "from-blue-600 to-purple-600",
  },
  organic_natural: {
    emoji: "🌿",
    gradient: "from-green-700 to-amber-600",
  },
};

export function TemplateGallery({ recommended, selected, onSelect }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<TemplateStyleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templateCatalogApi
      .list()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-text-primary">템플릿 스타일 선택</h3>
        <p className="text-xs text-text-tertiary">
          AI가 추천한 스타일이 강조 표시됩니다. 원하는 스타일을 선택하세요.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {templates.map((tmpl) => {
          const preview = STYLE_PREVIEWS[tmpl.id] || STYLE_PREVIEWS.clean_minimal;
          const isRecommended = tmpl.id === recommended;
          const isSelected = tmpl.id === selected;

          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelect(tmpl.id)}
              className={`relative rounded-sm border-2 overflow-hidden transition-all text-left ${
                isSelected
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-border hover:border-text-secondary"
              }`}
            >
              {/* AI Recommended Badge */}
              {isRecommended && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-accent text-white text-[10px] font-medium rounded-sm">
                  <Sparkles size={10} />
                  AI 추천
                </div>
              )}

              {/* Preview Area */}
              <div className={`h-24 bg-gradient-to-br ${preview.gradient} flex items-center justify-center`}>
                <span className="text-3xl">{preview.emoji}</span>
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium text-text-primary">{tmpl.name_ko}</p>
                <p className="text-xs text-text-tertiary line-clamp-2">{tmpl.description_ko}</p>

                {/* Color preview */}
                <div className="flex gap-1 pt-1">
                  {tmpl.preview_colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
