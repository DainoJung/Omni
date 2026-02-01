"use client";

import { useState, useRef } from "react";
import type { SlotValue, SlotDefinition } from "@/types";

interface SlotEditorProps {
  slots: SlotDefinition[];
  renderedSlots: SlotValue[];
  backgroundImageUrl: string;
  onSlotChange: (slotId: string, newValue: string) => void;
}

export function SlotEditor({
  slots,
  renderedSlots,
  backgroundImageUrl,
  onSlotChange,
}: SlotEditorProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSlotValue = (slotId: string): string => {
    const rendered = renderedSlots.find((s) => s.slot_id === slotId);
    return rendered?.value || "";
  };

  const getSlotStyle = (slotId: string): Record<string, unknown> => {
    const rendered = renderedSlots.find((s) => s.slot_id === slotId);
    return (rendered?.style as Record<string, unknown>) || {};
  };

  const handleDoubleClick = (slotId: string, slotDef: SlotDefinition) => {
    if (!slotDef.editable) return;
    if (slotDef.type === "text") {
      setEditingSlot(slotId);
    }
  };

  const handleBlur = (slotId: string, value: string) => {
    setEditingSlot(null);
    onSlotChange(slotId, value);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ aspectRatio: "860 / 1200" }}
    >
      {/* 배경 이미지 */}
      <img
        src={backgroundImageUrl}
        alt="배경"
        className="absolute inset-0 w-full h-full object-cover rounded-sm"
      />

      {/* 슬롯 렌더링 */}
      {slots.map((slotDef) => {
        if (slotDef.id === "background") return null;

        const value = getSlotValue(slotDef.id);
        const style = getSlotStyle(slotDef.id);
        const isSelected = selectedSlot === slotDef.id;
        const isEditing = editingSlot === slotDef.id;

        return (
          <div
            key={slotDef.id}
            className={`absolute cursor-pointer transition-all ${
              isSelected ? "ring-2 ring-accent ring-offset-1" : ""
            } ${slotDef.editable ? "hover:ring-1 hover:ring-accent/50" : ""}`}
            style={{
              left: `${slotDef.x}%`,
              top: `${slotDef.y}%`,
              width: `${slotDef.width}%`,
              height: `${slotDef.height}%`,
            }}
            onClick={() => setSelectedSlot(slotDef.id)}
            onDoubleClick={() => handleDoubleClick(slotDef.id, slotDef)}
          >
            {slotDef.type === "text" ? (
              isEditing ? (
                <input
                  autoFocus
                  defaultValue={value}
                  onBlur={(e) => handleBlur(slotDef.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full h-full bg-white/90 border-2 border-accent rounded px-2 text-black outline-none"
                  style={{
                    fontSize: `${(style.fontSize as number) || 16}px`,
                    fontWeight: (style.fontWeight as number) || 400,
                    textAlign: (style.textAlign as "left" | "center" | "right") || "center",
                  }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center overflow-hidden"
                  style={{
                    fontSize: `clamp(10px, ${((style.fontSize as number) || 16) / 860 * 100}vw, ${(style.fontSize as number) || 16}px)`,
                    fontWeight: (style.fontWeight as number) || 400,
                    color: (style.color as string) || "#FFFFFF",
                    textAlign: (style.textAlign as "left" | "center" | "right") || "center",
                  }}
                >
                  <span className="drop-shadow-lg">{value}</span>
                </div>
              )
            ) : slotDef.type === "image" && value ? (
              <img
                src={value}
                alt={slotDef.label}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10 border border-dashed border-white/30 rounded">
                <span className="text-xs text-white/50">{slotDef.label}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
