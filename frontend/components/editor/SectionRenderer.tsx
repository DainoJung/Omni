"use client";

import { forwardRef } from "react";
import { SectionBlock } from "./SectionBlock";
import type { RenderedSection } from "@/types";
import type { SelectedElement } from "./SectionBlock";

interface SectionRendererProps {
  sections: RenderedSection[];
  onDataChange: (sectionId: string, placeholderId: string, newValue: string) => void;
  onElementSelect?: (element: SelectedElement | null) => void;
  selectedPlaceholderId?: string | null;
}

export const SectionRenderer = forwardRef<HTMLDivElement, SectionRendererProps>(
  function SectionRenderer({ sections, onDataChange, onElementSelect, selectedPlaceholderId }, ref) {
    const sorted = [...sections].sort((a, b) => a.order - b.order);

    return (
      <div ref={ref} className="w-full max-w-[860px] mx-auto">
        {sorted.map((section) => (
          <SectionBlock
            key={section.section_id}
            section={section}
            onDataChange={onDataChange}
            onElementSelect={onElementSelect}
            selectedPlaceholderId={selectedPlaceholderId}
          />
        ))}
      </div>
    );
  }
);
