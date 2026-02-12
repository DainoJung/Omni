"use client";

import { useState } from "react";
import type { BackgroundConfig } from "@/types";

interface BackgroundSettingsProps {
  value: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
}

export function BackgroundSettings({ value, onChange }: BackgroundSettingsProps) {
  const handleModeChange = (mode: "solid" | "ai") => {
    onChange({ ...value, mode });
  };

  const handleColorChange = (hex_color: string) => {
    onChange({ ...value, hex_color });
  };

  const handlePromptChange = (ai_prompt: string) => {
    onChange({ ...value, ai_prompt });
  };

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-text-primary">
        배경 설정
      </span>

      {/* 컬러 피커 + HEX 입력 */}
      <div className="flex items-center gap-3">
        <label className="relative w-10 h-10 rounded-sm border border-border overflow-hidden cursor-pointer shrink-0">
          <input
            type="color"
            value={value.hex_color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full"
            style={{ backgroundColor: value.hex_color }}
          />
        </label>
        <input
          type="text"
          value={value.hex_color}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              handleColorChange(v);
            }
          }}
          placeholder="#FFFFFF"
          className="w-24 h-9 px-2 border border-border rounded-sm text-sm font-mono focus:border-border-focus"
          maxLength={7}
        />
      </div>

      {/* 모드 선택 */}
      <div className="flex gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="bg_mode"
            checked={value.mode === "solid"}
            onChange={() => handleModeChange("solid")}
            className="accent-accent"
          />
          <span className="text-sm text-text-primary">단색 배경</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="bg_mode"
            checked={value.mode === "ai"}
            onChange={() => handleModeChange("ai")}
            className="accent-accent"
          />
          <span className="text-sm text-text-primary">AI 배경 생성</span>
        </label>
      </div>

      {/* AI 프롬프트 */}
      {value.mode === "ai" && (
        <textarea
          value={value.ai_prompt || ""}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder="배경 이미지 설명 (예: 고급 레스토랑 분위기, 따뜻한 조명)"
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-sm text-sm resize-none focus:border-border-focus"
          maxLength={500}
        />
      )}
    </div>
  );
}
