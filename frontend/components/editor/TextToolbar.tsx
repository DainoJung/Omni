"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Minus, Plus } from "lucide-react";
import type { SelectedElement } from "./SectionBlock";

interface TextToolbarProps {
  selectedElement: SelectedElement | null;
  getStyleOverrides: () => Record<string, Record<string, string>>;
  onStyleChange: (placeholderId: string, styles: Record<string, string>) => void;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb.startsWith("#") ? rgb : "#000000";
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function TextToolbarInner({ selectedElement, getStyleOverrides, onStyleChange }: TextToolbarProps) {
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontFamily, setFontFamily] = useState("Pretendard");
  const [textColor, setTextColor] = useState("#000000");

  useEffect(() => {
    if (selectedElement?.type === "text" && selectedElement.currentStyles) {
      const styles = selectedElement.currentStyles;
      const overrides = getStyleOverrides()[selectedElement.placeholderId] || {};

      const size = parseInt(overrides.fontSize || styles.fontSize || "16px");
      setFontSize(isNaN(size) ? 16 : size);

      const weight = parseInt(overrides.fontWeight || styles.fontWeight || "400");
      setFontWeight(isNaN(weight) ? 400 : weight);

      const family = overrides.fontFamily || styles.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, "") || "Pretendard";
      setFontFamily(family);

      const color = overrides.color || styles.color || "#000000";
      setTextColor(color.startsWith("#") ? color : rgbToHex(color));
    }
  }, [selectedElement, getStyleOverrides]);

  const applyTextStyle = useCallback((updates: Record<string, string>) => {
    if (!selectedElement) return;
    const current = getStyleOverrides()[selectedElement.placeholderId] || {};
    onStyleChange(selectedElement.placeholderId, { ...current, ...updates });
  }, [selectedElement, getStyleOverrides, onStyleChange]);

  if (selectedElement?.type !== "text") return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-3">
      {/* Font Family */}
      <select
        value={fontFamily}
        onChange={(e) => {
          setFontFamily(e.target.value);
          applyTextStyle({ fontFamily: e.target.value });
        }}
        className="h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 min-w-[140px]"
      >
        <option value="Pretendard">Pretendard</option>
        <option value="SCoreDream">SCoreDream</option>
        <option value="BmDoHyeonOtf">BmDoHyeonOtf</option>
      </select>

      <div className="w-px h-6 bg-gray-300" />

      {/* Font Size */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const newSize = Math.max(10, fontSize - 2);
            setFontSize(newSize);
            applyTextStyle({ fontSize: `${newSize}px` });
          }}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={fontSize}
          onChange={(e) => {
            const val = Math.min(72, Math.max(10, parseInt(e.target.value) || 16));
            setFontSize(val);
            applyTextStyle({ fontSize: `${val}px` });
          }}
          className="w-12 h-8 px-2 border border-gray-300 rounded text-sm text-center bg-white"
        />
        <button
          onClick={() => {
            const newSize = Math.min(72, fontSize + 2);
            setFontSize(newSize);
            applyTextStyle({ fontSize: `${newSize}px` });
          }}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Font Weight */}
      <select
        value={fontWeight}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          setFontWeight(val);
          applyTextStyle({ fontWeight: String(val) });
        }}
        className="h-9 px-3 border border-gray-300 rounded-md text-sm bg-white focus:border-accent focus:ring-1 focus:ring-accent/20"
      >
        <option value={300}>Light</option>
        <option value={400}>Regular</option>
        <option value={500}>Medium</option>
        <option value={600}>Semi Bold</option>
        <option value={700}>Bold</option>
        <option value={800}>Extra Bold</option>
      </select>

      <div className="w-px h-6 bg-gray-300" />

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={textColor}
          onChange={(e) => {
            setTextColor(e.target.value);
            applyTextStyle({ color: e.target.value });
          }}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
      </div>
    </div>
  );
}

export const TextToolbar = memo(TextToolbarInner);
