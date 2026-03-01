"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { getLocale, setLocale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  onChange?: (locale: "ko" | "en") => void;
}

export function LanguageSwitcher({ onChange }: LanguageSwitcherProps) {
  const [locale, setLocaleState] = useState<"ko" | "en">("ko");

  useEffect(() => {
    setLocaleState(getLocale());
  }, []);

  const toggle = () => {
    const next = locale === "ko" ? "en" : "ko";
    setLocaleState(next);
    setLocale(next);
    onChange?.(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-sm hover:border-text-secondary transition-colors text-text-secondary"
      title="Switch language"
    >
      <Globe size={14} />
      <span className="font-medium">{locale === "ko" ? "한국어" : "EN"}</span>
    </button>
  );
}
