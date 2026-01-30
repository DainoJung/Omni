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

function getTextForArea(
  area: TextArea,
  products: ProductInput[],
  brandName?: string
): string {
  switch (area.suitable_for) {
    case "headline":
      return brandName || "브랜드명";
    case "subtext":
      // 첫 번째 매칭되는 상품명
      return products[area.position - 2]?.name || products[0]?.name || "상품명";
    case "label":
      return products[area.position - 3]?.price || products[0]?.price || "가격";
    case "description":
      return products[0]?.description || "";
    default:
      return "";
  }
}

function getFontSize(area: TextArea): number {
  if (area.max_font_size) return Math.min(area.max_font_size, 48);
  switch (area.suitable_for) {
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
        const fontSize = getFontSize(area);
        const isEditing = editingId === area.id;

        return (
          <div
            key={area.id}
            className="absolute flex items-center justify-center"
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
                className="w-full h-full bg-white/80 text-center border border-accent rounded px-2 outline-none"
                style={{
                  fontSize: `clamp(10px, ${fontSize * 0.5}px, ${fontSize}px)`,
                  color: area.recommended_font_color,
                }}
              />
            ) : (
              <span
                className={`text-center leading-tight font-semibold ${
                  editable ? "cursor-text hover:bg-white/20 rounded px-1 transition-colors" : ""
                }`}
                style={{
                  fontSize: `clamp(10px, ${fontSize * 0.5}px, ${fontSize}px)`,
                  color: area.recommended_font_color,
                  textShadow:
                    area.background_brightness === "dark"
                      ? "none"
                      : "0 1px 3px rgba(0,0,0,0.1)",
                  fontWeight: area.suitable_for === "headline" ? 700 : 500,
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
