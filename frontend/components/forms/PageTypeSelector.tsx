"use client";

import { useEffect, useState } from "react";
import { pageTypesApi } from "@/lib/api";
import type { PageType } from "@/types";
import { Package, Tags, UtensilsCrossed, Crown, Gem, Lock, Building2, LayoutGrid } from "lucide-react";

interface PageTypeSelectorProps {
  value: string;
  onChange: (pageType: PageType) => void;
  error?: string;
}

const ENABLED_TYPE_IDS = ["product_detail", "promotion", "gourmet", "brand_promotion"];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  product_detail: Package,
  promotion: Tags,
  gourmet: UtensilsCrossed,
  brand_promotion: Crown,
  vip_special: Gem,
  vip_private: Lock,
  shinsegae: Building2,
  custom: LayoutGrid,
};

const DISPLAY_ORDER = ["product_detail", "promotion", "gourmet", "brand_promotion", "vip_special", "vip_private", "shinsegae", "custom"];

const FALLBACK_PAGE_TYPES: PageType[] = [
  { id: "product_detail", name: "상품 포인트", icon: "📦", description: "상품별 매력 포인트를 보여주는 기획전", min_products: 2, max_products: 6, requires_price: false, accent_color: "#2563EB", catalog_bg_color: "#1e3a5f", background_prompt: "", copy_keywords: [] },
  { id: "promotion", name: "상품 기획전", icon: "🎪", description: "여러 상품을 모아 만드는 기획전", min_products: 2, max_products: 6, requires_price: true, accent_color: "#E91E90", catalog_bg_color: "#9d174d", background_prompt: "", copy_keywords: [] },
  { id: "gourmet", name: "맛집 기획전", icon: "🍽️", description: "가게별 음식 사진", min_restaurants: 1, max_restaurants: 5, foods_per_restaurant: 2, requires_price: false, accent_color: "#D97706", catalog_bg_color: "#78350f", background_prompt: "", copy_keywords: [] },
  { id: "brand_promotion", name: "브랜드 기획전", icon: "👜", description: "단일 브랜드 상품 3개 기획전", min_products: 3, max_products: 3, requires_price: true, requires_brand: true, accent_color: "#2c2e35", catalog_bg_color: "#2c2e35", background_prompt: "", copy_keywords: [] },
  { id: "vip_special", name: "VIP 스페셜위크", icon: "💎", description: "VIP 스페셜위크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#8B5CF6", catalog_bg_color: "#4c1d95", background_prompt: "", copy_keywords: [] },
  { id: "vip_private", name: "VIP 프라이빗위크", icon: "🖤", description: "VIP 프라이빗위크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#1F2937", catalog_bg_color: "#111827", background_prompt: "", copy_keywords: [] },
  { id: "shinsegae", name: "뱅드신세계", icon: "🏬", description: "신세계백화점 뱅크 프로모션", min_products: 2, max_products: 6, requires_price: true, accent_color: "#DC2626", catalog_bg_color: "#7f1d1d", background_prompt: "", copy_keywords: [] },
  { id: "custom", name: "섹션 직접 선택", icon: "🧩", description: "섹션별 테스트", min_products: 1, max_products: 9, requires_price: false, accent_color: "#6366F1", catalog_bg_color: "#312e81", background_prompt: "", copy_keywords: [] },
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
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
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
      <div className="grid grid-cols-4 gap-3">
        {[...pageTypes]
          .sort((a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id))
          .map((pt) => {
            const isEnabled = ENABLED_TYPE_IDS.includes(pt.id);
            const IconComponent = ICON_MAP[pt.id];
            // Rename display for gourmet
            const displayName = pt.id === "gourmet" ? "맛집 기획전" : pt.name;

            return (
              <button
                key={pt.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => isEnabled && onChange({ ...pt, name: displayName })}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-sm border-2 transition-all ${
                  !isEnabled
                    ? "border-border/50 bg-bg-secondary/50 opacity-40 cursor-not-allowed"
                    : value === pt.id
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border hover:border-text-secondary"
                }`}
              >
                {IconComponent ? (
                  <IconComponent className={`w-7 h-7 ${
                    !isEnabled
                      ? "text-text-tertiary"
                      : value === pt.id
                        ? "text-accent"
                        : "text-text-secondary"
                  }`} />
                ) : (
                  <span className="text-3xl">{pt.icon}</span>
                )}
                <span className={`text-xs font-medium ${
                  !isEnabled ? "text-text-tertiary" : "text-text-primary"
                }`}>
                  {displayName}
                </span>
                <span className="text-[10px] text-text-tertiary text-center leading-tight">
                  {pt.min_restaurants != null
                    ? `${pt.min_restaurants}~${pt.max_restaurants}개 가게`
                    : pt.min_products === pt.max_products
                      ? `${pt.min_products}개 상품`
                      : `${pt.min_products}~${pt.max_products}개 상품`}
                  {pt.requires_price ? " · 가격 필요" : ""}
                  {pt.requires_brand ? " · 브랜드 선택" : ""}
                </span>
              </button>
            );
          })}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
