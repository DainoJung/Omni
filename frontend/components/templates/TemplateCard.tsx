"use client";

import { Image as ImageIcon, Star } from "lucide-react";
import type { Template } from "@/types";

interface TemplateCardProps {
  template: Template;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}

export function TemplateCard({
  template,
  selected,
  recommended,
  onSelect,
}: TemplateCardProps) {
  const categoryLabels: Record<string, string> = {
    food: "식품 프로모션",
    fashion: "패션 룩북",
    beauty: "뷰티 상세",
    electronics: "가전 스펙",
    event: "이벤트 공지",
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-[280px] border rounded-md p-4 text-left transition-all hover:shadow-md ${
        selected
          ? "border-2 border-accent shadow-md"
          : "border-border hover:border-text-secondary"
      }`}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-accent text-white text-xs px-2 py-1 rounded-sm">
          <Star size={12} fill="currentColor" />
          추천
        </div>
      )}

      {/* Thumbnail placeholder */}
      <div className="w-full aspect-[3/4] bg-bg-tertiary rounded-sm flex items-center justify-center mb-4">
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover rounded-sm"
          />
        ) : (
          <div className="text-center text-text-tertiary">
            <ImageIcon size={32} className="mx-auto mb-2" />
            <p className="text-xs">미리보기</p>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm">
        {categoryLabels[template.category] || template.name}
      </h3>
      <p className="text-xs text-text-secondary mt-1">
        {template.width} × {template.height} px
      </p>
    </button>
  );
}
