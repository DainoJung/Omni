"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TextArea, ProductInput } from "@/types";
import { resolveFontFamily, loadGoogleFont } from "@/lib/fonts";

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

/** 숨겨진 span으로 실제 텍스트 너비를 측정하여 input 크기를 맞추는 컴포넌트 */
function AutoSizeInput({
  defaultValue,
  onCommit,
  style,
}: {
  defaultValue: string;
  onCommit: (text: string) => void;
  style: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);

  const syncWidth = useCallback(() => {
    if (inputRef.current && mirrorRef.current) {
      mirrorRef.current.textContent = inputRef.current.value || "\u00A0";
      inputRef.current.style.width = `${mirrorRef.current.offsetWidth + 4}px`;
    }
  }, []);

  useEffect(() => {
    syncWidth();
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [syncWidth]);

  return (
    <span className="relative inline-block">
      {/* 측정용 숨겨진 span — input과 동일한 폰트 스타일 적용 */}
      <span
        ref={mirrorRef}
        aria-hidden
        className="invisible absolute whitespace-pre px-1"
        style={style}
      />
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        onInput={syncWidth}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit((e.target as HTMLInputElement).value);
          if (e.key === "Escape") onCommit(defaultValue);
        }}
        className="bg-white/90 border border-accent/50 rounded px-1 outline-none"
        style={{ ...style, maxWidth: "100%" }}
      />
    </span>
  );
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

  // 비큐레이션 폰트를 런타임에 로드
  useEffect(() => {
    textAreas.forEach((area) => {
      if (area.font_family) {
        const { needsLoad } = resolveFontFamily(area.font_family);
        if (needsLoad) {
          loadGoogleFont(area.font_family);
        }
      }
    });
  }, [textAreas]);

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
        const { css: fontFamily } = resolveFontFamily(area.font_family);

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
              <AutoSizeInput
                defaultValue={displayText}
                onCommit={(text) => handleBlur(area.id, text)}
                style={{
                  fontSize,
                  color: area.recommended_font_color,
                  textAlign,
                  fontWeight,
                  letterSpacing,
                  fontFamily,
                }}
              />
            ) : (
              <span
                className={`leading-tight ${
                  editable ? "cursor-text hover:outline hover:outline-1 hover:outline-white/50 rounded px-1 transition-all" : ""
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
                  fontFamily,
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
