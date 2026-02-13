"use client";

import { forwardRef, useMemo } from "react";
import { SectionBlock } from "./SectionBlock";
import { ChevronUp, ChevronDown, Copy, Trash2, Plus } from "lucide-react";
import type { RenderedSection, BackgroundSettings, SectionBg } from "@/types";
import type { SelectedElement } from "./SectionBlock";
import { optimizeImageUrl } from "@/lib/imageUrl";

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

    // 전체 모드: 컨테이너 레벨에서 하나의 연속된 배경으로 적용
    const globalBgCss = useMemo(() => {
      if (!backgroundSettings) return "";
      const bg = backgroundSettings.global;
      if (!bg || bg.type === "none") return "";

      const sel = ".section-renderer-root";
      const opacity = (bg.opacity ?? 100) / 100;
      const brightness = (bg.brightness ?? 100) / 100;

      // 개별 섹션의 CSS 배경을 투명하게 (background shorthand + linear-gradient 포함)
      // .s-gr__card 등 내부 카드 레이어는 자체 배경 유지
      const clearSectionBg = `${sel} .section-inner > *, ${sel} .section-inner > * > *:not(.s-gr__card):not(.s-point__badge) { background: transparent !important; }`;
      // isolation: isolate → 루트가 stacking context 생성, ::before z-index:-1 → 자식에 개별 z-index 불필요 → 섹션 경계 hairline gap 제거
      const base = `${sel} { position: relative !important; isolation: isolate !important; } ${sel}::before { content: '' !important; position: absolute !important; inset: 0 !important; z-index: -1 !important; pointer-events: none !important; opacity: ${opacity} !important; filter: brightness(${brightness}) !important;`;

      if (bg.type === "solid" && bg.hex_color) {
        return `${base} background-color: ${bg.hex_color} !important; background-image: none !important; } ${clearSectionBg}`;
      }
      if (bg.type === "ai" && bg.ai_image_url) {
        const bgUrl = optimizeImageUrl(bg.ai_image_url, "editor");
        return `${base} background-image: url(${bgUrl}) !important; background-size: 860px auto !important; background-repeat: repeat !important; background-position: top center !important; } ${clearSectionBg}`;
      }
      return "";
    }, [backgroundSettings]);

    const inverseScale = 100 / zoom;
    const btnBase =
      "w-[34px] h-[34px] flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm";

    return (
      <div ref={ref} className="section-renderer-root w-full max-w-[860px] mx-auto flex flex-col">
        {globalBgCss && <style dangerouslySetInnerHTML={{ __html: globalBgCss }} />}
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
