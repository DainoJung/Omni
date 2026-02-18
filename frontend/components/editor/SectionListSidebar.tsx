"use client";

import { memo } from "react";
import { GripVertical } from "lucide-react";
import type { RenderedSection } from "@/types";

interface SectionListSidebarProps {
  sections: RenderedSection[];
  sectionThumbnails: Record<string, string>;
  draggedSectionIndex: number | null;
  dropIndicatorIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragLeave: (e: React.DragEvent) => void;
  onSectionClick: (sectionId: string) => void;
}

function SectionListSidebarInner({
  sections,
  sectionThumbnails,
  draggedSectionIndex,
  dropIndicatorIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  onSectionClick,
}: SectionListSidebarProps) {
  return (
    <div
      className="p-3 space-y-2"
      onDragLeave={onDragLeave}
    >
      {sections.map((section, index) => (
        <div key={section.section_id}>
          {/* Drop indicator line */}
          {draggedSectionIndex !== null && dropIndicatorIndex === index && (
            <div className="flex items-center gap-1.5 py-1">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <div className="h-[2px] bg-accent rounded-full flex-1" />
            </div>
          )}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`bg-bg-secondary border border-border rounded-sm p-3 hover:border-accent transition-colors cursor-move group ${
              draggedSectionIndex === index ? "opacity-40 scale-[0.97]" : ""
            }`}
            onClick={() => {
              if (draggedSectionIndex === null) {
                onSectionClick(section.section_id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              {/* Drag Handle */}
              <div className="flex items-center justify-center w-5 h-5 text-text-tertiary group-hover:text-accent transition-colors cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
              </div>

              {/* Thumbnail - 임시 비활성화 (render/image CORS 이슈) */}

              {/* Section Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {section.section_type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">섹션 {index + 1}</p>
              </div>
            </div>
          </div>
          {/* Drop indicator after last item */}
          {draggedSectionIndex !== null &&
            index === sections.length - 1 &&
            dropIndicatorIndex === sections.length && (
              <div className="flex items-center gap-1.5 py-1">
                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                <div className="h-[2px] bg-accent rounded-full flex-1" />
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

export const SectionListSidebar = memo(SectionListSidebarInner);
