"use client";

import React, { forwardRef, useMemo } from "react";
import { SectionBlock } from "./SectionBlock";
import { ChevronUp, ChevronDown, Copy, Trash2, Plus } from "lucide-react";
import type { RenderedSection, BackgroundSettings, SectionBg } from "@/types";
import type { SelectedElement } from "./SectionBlock";

interface SectionRendererProps {
  sections: RenderedSection[];
  zoom?: number;
  onDataChange: (sectionId: string, placeholderId: string, newValue: string) => void;
  onElementSelect?: (element: SelectedElement | null) => void;
  selectedPlaceholderId?: string | null;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDuplicate?: (index: number) => void;
  onDelete?: (index: number) => void;
  backgroundSettings?: BackgroundSettings;
}

export const SectionRenderer = forwardRef<HTMLDivElement, SectionRendererProps>(
  function SectionRenderer(
    { sections, zoom = 100, onDataChange, onElementSelect, selectedPlaceholderId, onMoveUp, onMoveDown, onDuplicate, onDelete, backgroundSettings },
    ref
  ) {
    const sorted = [...sections].sort((a, b) => a.order - b.order);

    const isGlobalScope = backgroundSettings?.scope === "all";

    const getBgForSection = (sectionId: string): SectionBg | undefined => {
      if (!backgroundSettings) return undefined;
      if (isGlobalScope) return undefined;
      const sectionBg = backgroundSettings.per_section[sectionId];
      if (!sectionBg || sectionBg.type === "none") return undefined;
      return sectionBg;
    };

    // 전체 모드: 개별 섹션 배경 투명 처리 CSS
    const globalBgClearCss = useMemo(() => {
      if (!backgroundSettings) return "";
      const bg = backgroundSettings.global;
      if (!bg || bg.type === "none") return "";
      const sel = ".section-renderer-root";
      return `${sel} .section-inner > *, ${sel} .section-inner > * > *:not(.s-gr__card):not(.s-point__badge) { background: transparent !important; }`;
    }, [backgroundSettings]);

    // 전체 모드: 배경색 밝기 기반 텍스트 색상 오버라이드
    const globalTextColorCss = useMemo(() => {
      if (!backgroundSettings) return "";
      const bg = backgroundSettings.global;
      if (!bg || bg.type !== "solid" || !bg.hex_color) return "";
      const hex = bg.hex_color.replace("#", "");
      if (hex.length !== 6) return "";
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      // 배경과 text_color가 동일 계열이면 오버라이드
      const firstTextColor = sections[0]?.data?.text_color;
      const bgIsBright = luminance > 150;
      const textIsBright = firstTextColor === "#FFFFFF" || firstTextColor?.startsWith("rgba(255");
      if (bgIsBright === textIsBright || (!bgIsBright && !textIsBright)) {
        const textColor = bgIsBright ? "#111111" : "#FFFFFF";
        const textColorSub = bgIsBright ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)";
        const sel = ".section-renderer-root";
        return `${sel} [data-editable] { color: ${textColor}; }
${sel} [data-placeholder]:not([data-editable]) { color: ${textColorSub}; }`;
      }
      return "";
    }, [backgroundSettings, sections]);

    // 전체 모드: 실제 DOM 요소로 배경 레이어 생성 (html-to-image 호환)
    const globalBgLayerStyle = useMemo((): React.CSSProperties | null => {
      if (!backgroundSettings) return null;
      const bg = backgroundSettings.global;
      if (!bg || bg.type === "none") return null;
      const opacity = (bg.opacity ?? 100) / 100;
      const brightness = (bg.brightness ?? 100) / 100;
      const base: React.CSSProperties = {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: -1,
        pointerEvents: "none",
        opacity,
        filter: `brightness(${brightness})`,
      };
      if (bg.type === "solid" && bg.hex_color) {
        return { ...base, backgroundColor: bg.hex_color };
      }
      if (bg.type === "ai" && bg.ai_image_url) {
        return {
          ...base,
          backgroundImage: `url(${bg.ai_image_url})`,
          backgroundSize: "860px auto",
          backgroundRepeat: "repeat",
          backgroundPosition: "top center",
        };
      }
      return null;
    }, [backgroundSettings]);

    const hasGlobalBg = !!globalBgLayerStyle;
    const inverseScale = 100 / zoom;
    const btnBase =
      "w-[34px] h-[34px] flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm";

    return (
      <div
        ref={ref}
        className="section-renderer-root w-full max-w-[860px] mx-auto flex flex-col"
        style={hasGlobalBg ? { position: "relative", isolation: "isolate" } : undefined}
      >
        {globalBgClearCss && <style dangerouslySetInnerHTML={{ __html: globalBgClearCss }} />}
        {globalTextColorCss && <style dangerouslySetInnerHTML={{ __html: globalTextColorCss }} />}
        {globalBgLayerStyle && <div data-bg-layer style={globalBgLayerStyle} />}
        {sorted.map((section, index) => (
          <div key={section.section_id} className="relative group/section">
            <SectionBlock
              section={section}
              onDataChange={onDataChange}
              onElementSelect={onElementSelect}
              selectedPlaceholderId={selectedPlaceholderId}
              backgroundConfig={getBgForSection(section.section_id)}
            />
            {/* Section Control Buttons - 호버 시 표시, 줌 무관 고정 크기 */}
            <div
              className="absolute top-0 left-full z-10 opacity-0 group-hover/section:opacity-100 transition-opacity duration-150"
              style={{
                transform: `scale(${inverseScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div className="flex flex-col gap-1.5 pl-3 pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveUp?.(index); }}
                  disabled={index === 0}
                  className={btnBase}
                  title="위로 이동"
                >
                  <ChevronUp size={18} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveDown?.(index); }}
                  disabled={index === sorted.length - 1}
                  className={btnBase}
                  title="아래로 이동"
                >
                  <ChevronDown size={18} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate?.(index); }}
                  className={btnBase}
                  title="복제"
                >
                  <Copy size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(index); }}
                  disabled={sorted.length <= 1}
                  className={`${btnBase} hover:bg-red-50 hover:border-red-300`}
                  title="삭제"
                >
                  <Trash2 size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate?.(index); }}
                  className={btnBase}
                  title="섹션 추가"
                >
                  <Plus size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);
