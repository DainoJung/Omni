"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SelectedElement } from "./SectionBlock";

const FONT_FAMILIES = [
  { label: "Pretendard", value: "Pretendard" },
  { label: "SCoreDream", value: "SCoreDream" },
  { label: "BmDoHyeonOtf", value: "BmDoHyeonOtf" },
];

const FONT_WEIGHTS = [
  { label: "Thin", value: 100 },
  { label: "Extra Light", value: 200 },
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semi Bold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Extra Bold", value: 800 },
  { label: "Black", value: 900 },
];

interface PropertyPanelProps {
  selected: SelectedElement;
  styleOverrides: Record<string, Record<string, string>>;
  onStyleChange: (placeholderId: string, styles: Record<string, string>) => void;
  onReset: (placeholderId: string) => void;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb.startsWith("#") ? rgb : "#ffffff";
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function parseFontSize(val: string): number {
  return parseInt(val) || 16;
}

function parseFontWeight(val: string): number {
  const n = parseInt(val);
  if (!isNaN(n)) return n;
  if (val === "bold") return 700;
  if (val === "normal") return 400;
  return 400;
}

export function PropertyPanel({ selected, styleOverrides, onStyleChange, onReset }: PropertyPanelProps) {
  const overrides = styleOverrides[selected.placeholderId] || {};
  const computed = selected.currentStyles || {};

  const [fontFamily, setFontFamily] = useState(overrides.fontFamily || computed.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, "") || "Pretendard");
  const [fontSize, setFontSize] = useState(parseFontSize(overrides.fontSize || computed.fontSize || "16px"));
  const [fontWeight, setFontWeight] = useState(parseFontWeight(overrides.fontWeight || computed.fontWeight || "400"));
  const [color, setColor] = useState(rgbToHex(overrides.color || computed.color || "#ffffff"));

  // Re-sync when selection changes
  useEffect(() => {
    const ov = styleOverrides[selected.placeholderId] || {};
    const comp = selected.currentStyles || {};
    setFontFamily(ov.fontFamily || comp.fontFamily?.split(",")[0]?.trim().replace(/['"]/g, "") || "Pretendard");
    setFontSize(parseFontSize(ov.fontSize || comp.fontSize || "16px"));
    setFontWeight(parseFontWeight(ov.fontWeight || comp.fontWeight || "400"));
    setColor(rgbToHex(ov.color || comp.color || "#ffffff"));
  }, [selected.placeholderId, selected.currentStyles, styleOverrides]);

  const applyStyles = useCallback(
    (updates: Partial<{ fontFamily: string; fontSize: string; fontWeight: string; color: string }>) => {
      const current = styleOverrides[selected.placeholderId] || {};
      onStyleChange(selected.placeholderId, { ...current, ...updates });
    },
    [selected.placeholderId, styleOverrides, onStyleChange]
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold mb-1">텍스트 스타일</h3>
        <p className="text-xs text-text-tertiary">{selected.placeholderId}</p>
      </div>

      {/* Font Family */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-secondary">폰트</label>
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            applyStyles({ fontFamily: e.target.value });
          }}
          className="w-full h-9 px-3 border border-border rounded-sm text-sm bg-bg-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus/10"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-secondary">크기</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={72}
            value={fontSize}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setFontSize(v);
              applyStyles({ fontSize: `${v}px` });
            }}
            className="flex-1 accent-accent"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={10}
              max={72}
              value={fontSize}
              onChange={(e) => {
                const v = Math.min(72, Math.max(10, parseInt(e.target.value) || 10));
                setFontSize(v);
                applyStyles({ fontSize: `${v}px` });
              }}
              className="w-14 h-8 px-2 border border-border rounded-sm text-sm text-center bg-bg-primary"
            />
            <span className="text-xs text-text-tertiary">px</span>
          </div>
        </div>
      </div>

      {/* Font Weight */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-secondary">굵기</label>
        <select
          value={fontWeight}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            setFontWeight(v);
            applyStyles({ fontWeight: String(v) });
          }}
          className="w-full h-9 px-3 border border-border rounded-sm text-sm bg-bg-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus/10"
        >
          {FONT_WEIGHTS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-secondary">색상</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              applyStyles({ color: e.target.value });
            }}
            className="w-9 h-9 rounded-sm border border-border cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              setColor(v);
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                applyStyles({ color: v });
              }
            }}
            className="flex-1 h-9 px-3 border border-border rounded-sm text-sm font-mono bg-bg-primary"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => onReset(selected.placeholderId)}
      >
        <RotateCcw size={14} className="mr-1.5" />
        초기화
      </Button>
    </div>
  );
}
