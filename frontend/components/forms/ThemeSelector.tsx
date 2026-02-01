"use client";

import { useEffect, useState } from "react";
import { themesApi } from "@/lib/api";
import type { Theme } from "@/types";

interface ThemeSelectorProps {
  value: string;
  onChange: (themeId: string) => void;
  error?: string;
}

export function ThemeSelector({ value, onChange, error }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    themesApi
      .list()
      .then(setThemes)
      .catch(() => {
        // 폴백: 하드코딩 테마
        setThemes([
          { id: "holiday", name: "홀리데이", icon: "🎄", background_prompt: "", is_active: true },
          { id: "spring_sale", name: "봄 세일", icon: "🌸", background_prompt: "", is_active: true },
          { id: "summer_special", name: "여름 특가", icon: "☀️", background_prompt: "", is_active: true },
          { id: "autumn_new", name: "가을 신상", icon: "🍂", background_prompt: "", is_active: true },
          { id: "winter_promo", name: "겨울 프로모션", icon: "❄️", background_prompt: "", is_active: true },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          테마 선택 <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-sm border border-border bg-bg-secondary animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        테마 선택 <span className="text-error">*</span>
      </label>
      <div className="grid grid-cols-5 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-sm border-2 transition-all ${
              value === theme.id
                ? "border-accent bg-accent/5 shadow-sm"
                : "border-border hover:border-text-secondary"
            }`}
          >
            <span className="text-2xl">{theme.icon}</span>
            <span className="text-xs font-medium text-text-primary">
              {theme.name}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
