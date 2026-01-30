"use client";

import { useState } from "react";
import type { TextArea, ProductInput } from "@/types";

interface TextOverlayRendererProps {
  layoutImageUrl: string;
  textAreas: TextArea[];
  products: ProductInput[];
  brandName?: string;
  editable?: boolean;
  onTextChange?: (areaId: string, newText: string) => void;
}

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return raw;
  return `₩${Number(digits).toLocaleString()}`;
}

function getTextForArea(
  area: TextArea,
  products: ProductInput[],
  brandName?: string
): string {
  // AI가 생성한 텍스트가 있으면 우선 사용
  if (area.recommended_text) return area.recommended_text;

  // fallback: 기존 로직 + 가격 포맷팅
  switch (area.suitable_for) {
    case "headline":
      return brandName || "브랜드명";
    case "subtext":
      return products[0]?.name || "상품명";
    case "label":
      return formatPrice(products[0]?.price || "가격");
    case "description":
      return products[0]?.description || "";
    default:
      return "";
  }
}

function getFontSizeStyle(area: TextArea): string {
  // AI가 vw 단위 크기를 지정한 경우 사용
  if (area.font_size_vw) {
    return `${area.font_size_vw}vw`;
  }
  // fallback: max_font_size 기반 clamp
  const base = area.max_font_size || getFallbackFontSize(area.suitable_for);
  return `clamp(10px, ${base * 0.5}px, ${base}px)`;
}

function getFallbackFontSize(suitableFor: string): number {
  switch (suitableFor) {
    case "headline":
      return 36;
    case "subtext":
      return 20;
    case "label":
      return 16;
    case "description":
      return 14;
    default:
      return 16;
  }
}

export function TextOverlayRenderer({
  layoutImageUrl,
  textAreas,
  products,
  brandName,
  editable = false,
  onTextChange,
}: TextOverlayRendererProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>(
    {}
  );

  const handleDoubleClick = (areaId: string) => {
    if (!editable) return;
    setEditingId(areaId);
  };

  const handleBlur = (areaId: string, text: string) => {
    setEditingId(null);
    setTextOverrides((prev) => ({ ...prev, [areaId]: text }));
    onTextChange?.(areaId, text);
  };

  return (
    <div className="relative inline-block w-full">
      {/* Background layout image */}
      <img
        src={layoutImageUrl}
        alt="레이아웃"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Text overlay areas */}
      {textAreas.map((area) => {
        const defaultText = getTextForArea(area, products, brandName);
        const displayText = textOverrides[area.id] || defaultText;
        const fontSize = getFontSizeStyle(area);
        const isEditing = editingId === area.id;

        const textAlign = area.text_align || "center";
        const fontWeight = area.font_weight || (area.suitable_for === "headline" ? 700 : 500);
        const letterSpacing = area.letter_spacing || "0em";

        const alignmentClass =
          textAlign === "left"
            ? "items-center justify-start text-left"
            : textAlign === "right"
              ? "items-center justify-end text-right"
              : "items-center justify-center text-center";

        return (
          <div
            key={area.id}
            className={`absolute flex ${alignmentClass}`}
            style={{
              left: `${area.bounds.x}%`,
              top: `${area.bounds.y}%`,
              width: `${area.bounds.width}%`,
              height: `${area.bounds.height}%`,
            }}
            onDoubleClick={() => handleDoubleClick(area.id)}
          >
            {isEditing ? (
              <input
                autoFocus
                defaultValue={displayText}
                onBlur={(e) => handleBlur(area.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBlur(area.id, (e.target as HTMLInputElement).value);
                  }
                }}
                className="w-full h-full bg-white/80 border border-accent rounded px-2 outline-none"
                style={{
                  fontSize,
                  color: area.recommended_font_color,
                  textAlign,
                  fontWeight,
                  letterSpacing,
                }}
              />
            ) : (
              <span
                className={`leading-tight ${
                  editable ? "cursor-text hover:bg-white/20 rounded px-1 transition-colors" : ""
                }`}
                style={{
                  fontSize,
                  color: area.recommended_font_color,
                  textShadow:
                    area.background_brightness === "dark"
                      ? "none"
                      : "0 1px 3px rgba(0,0,0,0.1)",
                  fontWeight,
                  letterSpacing,
                  textAlign,
                  width: "100%",
                }}
              >
                {displayText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
