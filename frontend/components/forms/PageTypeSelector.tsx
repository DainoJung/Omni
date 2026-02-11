"use client";

import { useEffect, useState } from "react";
import { pageTypesApi } from "@/lib/api";
import type { PageType } from "@/types";

interface PageTypeSelectorProps {
  value: string;
  onChange: (pageType: PageType) => void;
  error?: string;
}

const FALLBACK_PAGE_TYPES: PageType[] = [
  { id: "product_detail", name: "상품 상세", icon: "📦", description: "단일 상품의 상세 정보", min_products: 1, max_products: 1, requires_price: false, accent_color: "#2563EB", catalog_bg_color: "#1e3a5f", background_prompt: "", copy_keywords: [] },
  { id: "promotion", name: "기획전", icon: "🎪", description: "시즌/테마별 기획전", min_products: 2, max_products: 6, requires_price: true, accent_color: "#E91E90", catalog_bg_color: "#9d174d", background_prompt: "", copy_keywords: [] },
  { id: "vip_special", name: "VIP 스페셜위크", icon: "💎", description: "VIP 스페셜위크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#8B5CF6", catalog_bg_color: "#4c1d95", background_prompt: "", copy_keywords: [] },
  { id: "vip_private", name: "VIP 프라이빗위크", icon: "🖤", description: "VIP 프라이빗위크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#1F2937", catalog_bg_color: "#111827", background_prompt: "", copy_keywords: [] },
  { id: "gourmet", name: "고메트립", icon: "🍽️", description: "미식 여행/다이닝 프로모션", min_products: 1, max_products: 6, requires_price: true, accent_color: "#D97706", catalog_bg_color: "#78350f", background_prompt: "", copy_keywords: [] },
  { id: "shinsegae", name: "뱅드신세계", icon: "🏬", description: "신세계백화점 뱅크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#DC2626", catalog_bg_color: "#7f1d1d", background_prompt: "", copy_keywords: [] },
];

export function PageTypeSelector({ value, onChange, error }: PageTypeSelectorProps) {
  const [pageTypes, setPageTypes] = useState<PageType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pageTypesApi
      .list()
      .then(setPageTypes)
      .catch(() => setPageTypes(FALLBACK_PAGE_TYPES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          페이지 유형 <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-sm border border-border bg-bg-secondary animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        페이지 유형 <span className="text-error">*</span>
      </label>
      <div className="grid grid-cols-3 gap-3">
        {pageTypes.map((pt) => (
          <button
            key={pt.id}
            type="button"
            onClick={() => onChange(pt)}
            className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-sm border-2 transition-all ${
              value === pt.id
                ? "border-accent bg-accent/5 shadow-sm"
                : "border-border hover:border-text-secondary"
            }`}
          >
            <span className="text-3xl">{pt.icon}</span>
            <span className="text-xs font-medium text-text-primary">
              {pt.name}
            </span>
            <span className="text-[10px] text-text-tertiary text-center leading-tight">
              {pt.min_products === pt.max_products
                ? `${pt.min_products}개 상품`
                : `${pt.min_products}~${pt.max_products}개 상품`}
              {pt.requires_price ? " · 가격 필요" : ""}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
