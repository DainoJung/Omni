"use client";

import { forwardRef } from "react";
import { SectionBlock } from "./SectionBlock";
import { ChevronUp, ChevronDown, Copy, Trash2, Plus } from "lucide-react";
import type { RenderedSection } from "@/types";
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
}

export const SectionRenderer = forwardRef<HTMLDivElement, SectionRendererProps>(
  function SectionRenderer(
    { sections, zoom = 100, onDataChange, onElementSelect, selectedPlaceholderId, onMoveUp, onMoveDown, onDuplicate, onDelete },
    ref
  ) {
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const inverseScale = 100 / zoom;
    const btnBase =
      "w-[34px] h-[34px] flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm";

    return (
      <div ref={ref} className="w-full max-w-[860px] mx-auto">
        {sorted.map((section, index) => (
          <div key={section.section_id} className="relative group/section">
            <SectionBlock
              section={section}
              onDataChange={onDataChange}
              onElementSelect={onElementSelect}
              selectedPlaceholderId={selectedPlaceholderId}
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
