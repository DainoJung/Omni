"use client";

import { Check } from "lucide-react";
import type { ColorPreset } from "@/types";

interface ColorPresetSelectorProps {
  presets: ColorPreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ColorPresetSelector({
  presets,
  selectedId,
  onSelect,
}: ColorPresetSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">컬러 테마 선택</h3>
      <p className="text-sm text-text-secondary">
        상세페이지의 전체적인 색상 분위기를 선택하세요.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedId;

          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-accent shadow-md"
                  : "border-border hover:border-text-tertiary"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              <p className="font-medium mb-3">{preset.name}</p>

              {/* 컬러 칩 미리보기 */}
              <div className="flex gap-2 mb-3">
                {[
                  { color: preset.primary_color, label: "Primary" },
                  { color: preset.secondary_color, label: "Secondary" },
                  { color: preset.accent_color, label: "Accent" },
                  { color: preset.background_color, label: "BG" },
                  { color: preset.text_color, label: "Text" },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="w-8 h-8 rounded-full border border-border"
                    style={{ backgroundColor: chip.color }}
                    title={`${chip.label}: ${chip.color}`}
                  />
                ))}
              </div>

              {/* 미리보기 바 */}
              <div
                className="h-10 rounded-lg flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: preset.background_color,
                  color: preset.text_color,
                  border: `1px solid ${preset.secondary_color}`,
                }}
              >
                <span
                  style={{ color: preset.primary_color }}
                >
                  미리보기
                </span>
                <span
                  className="ml-2"
                  style={{ color: preset.accent_color }}
                >
                  ACCENT
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
