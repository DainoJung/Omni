"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { RenderedSection, BackgroundSettings, SectionBg } from "@/types";

interface BackgroundPanelProps {
  sections: RenderedSection[];
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
  onGenerateAI: (prompt: string, sectionId?: string, sectionType?: string) => Promise<void>;
  generating: boolean;
  sectionThumbnails: Record<string, string>;
}

export function BackgroundPanel({
  sections,
  settings,
  onSettingsChange,
  onGenerateAI,
  generating,
  sectionThumbnails,
}: BackgroundPanelProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [globalPrompt, setGlobalPrompt] = useState(settings.global.ai_prompt || "");
  const [sectionPrompts, setSectionPrompts] = useState<Record<string, string>>({});

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const updateScope = (scope: "all" | "per_section") => {
    onSettingsChange({ ...settings, scope });
  };

  const updateGlobalType = (type: "solid" | "ai") => {
    onSettingsChange({
      ...settings,
      global: { ...settings.global, type },
    });
  };

  const updateGlobalColor = (hex_color: string) => {
    onSettingsChange({
      ...settings,
      global: { ...settings.global, type: "solid", hex_color },
    });
  };

  const getSectionBg = (sectionId: string): SectionBg => {
    return settings.per_section[sectionId] || { type: "solid" };
  };

  const updateSectionBg = (sectionId: string, bg: Partial<SectionBg>) => {
    const current = getSectionBg(sectionId);
    onSettingsChange({
      ...settings,
      per_section: {
        ...settings.per_section,
        [sectionId]: { ...current, ...bg },
      },
    });
  };

  const handleGenerateGlobal = async () => {
    if (!globalPrompt.trim()) return;
    await onGenerateAI(globalPrompt.trim());
  };

  const handleGenerateSection = async (sectionId: string, sectionType: string) => {
    const prompt = sectionPrompts[sectionId]?.trim();
    if (!prompt) return;
    await onGenerateAI(prompt, sectionId, sectionType);
  };

  return (
    <div className="p-3 space-y-4">
      {/* Scope Selector */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">적용 범위</p>
        <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg">
          <button
            onClick={() => updateScope("all")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              settings.scope === "all"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => updateScope("per_section")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              settings.scope === "per_section"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            섹션별
          </button>
        </div>
      </div>

      {/* Global Mode */}
      {settings.scope === "all" && (
        <>
          {/* Type Selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">배경 타입</p>
            <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg">
              <button
                onClick={() => updateGlobalType("solid")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  settings.global.type === "solid"
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                단색
              </button>
              <button
                onClick={() => updateGlobalType("ai")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  settings.global.type === "ai"
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                AI 생성
              </button>
            </div>
          </div>

          {/* Solid Color Picker */}
          {settings.global.type === "solid" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">배경색</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.global.hex_color || "#ffffff"}
                  onChange={(e) => updateGlobalColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.global.hex_color || "#ffffff"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      updateGlobalColor(v);
                    }
                  }}
                  className="flex-1 h-10 px-3 border border-border rounded-lg text-sm font-mono"
                  maxLength={7}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          )}

          {/* AI Generation */}
          {settings.global.type === "ai" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">프롬프트</p>
                <textarea
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  placeholder="원하는 배경 분위기를 설명해주세요..."
                  className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm resize-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <button
                onClick={handleGenerateGlobal}
                disabled={generating || !globalPrompt.trim()}
                className="w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    배경 생성하기
                  </>
                )}
              </button>
              {/* AI preview */}
              {settings.global.ai_image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={settings.global.ai_image_url}
                    alt="AI 배경"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          )}

          {/* Global Opacity & Brightness Sliders */}
          {(settings.global.type === "solid" || settings.global.type === "ai") && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-text-secondary">투명도</p>
                  <span className="text-xs text-text-tertiary tabular-nums">{settings.global.opacity ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.global.opacity ?? 100}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      global: { ...settings.global, opacity: parseInt(e.target.value) },
                    })
                  }
                  className="w-full h-1.5 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-text-secondary">밝기</p>
                  <span className="text-xs text-text-tertiary tabular-nums">{settings.global.brightness ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={settings.global.brightness ?? 100}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      global: { ...settings.global, brightness: parseInt(e.target.value) },
                    })
                  }
                  className="w-full h-1.5 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Per-Section Mode */}
      {settings.scope === "per_section" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">섹션 선택</p>
          <div className="space-y-1.5">
            {sorted.map((section, index) => {
              const isSelected = selectedSectionId === section.section_id;
              const sectionBg = getSectionBg(section.section_id);

              return (
                <div key={section.section_id}>
                  <button
                    onClick={() =>
                      setSelectedSectionId(isSelected ? null : section.section_id)
                    }
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 bg-bg-tertiary border border-border rounded shrink-0 overflow-hidden">
                      {sectionThumbnails[section.section_id] ? (
                        <img
                          src={sectionThumbnails[section.section_id]}
                          alt={section.section_type}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {section.section_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-text-tertiary">
                        섹션 {index + 1}
                        <span className="ml-1.5 text-accent">
                          {sectionBg.type === "solid" ? "단색" : "AI"}
                        </span>
                      </p>
                    </div>
                    {/* Color indicator */}
                    {sectionBg.type === "solid" && sectionBg.hex_color && (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                        style={{ backgroundColor: sectionBg.hex_color }}
                      />
                    )}
                  </button>

                  {/* Expanded section controls */}
                  {isSelected && (
                    <div className="mt-1.5 ml-2 pl-3 border-l-2 border-accent/20 space-y-3 pb-2">
                      {/* Type selector */}
                      <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg">
                        <button
                          onClick={() => updateSectionBg(section.section_id, { type: "solid" })}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sectionBg.type === "solid"
                              ? "bg-white text-text-primary shadow-sm"
                              : "text-text-tertiary hover:text-text-primary"
                          }`}
                        >
                          단색
                        </button>
                        <button
                          onClick={() => updateSectionBg(section.section_id, { type: "ai" })}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sectionBg.type === "ai"
                              ? "bg-white text-text-primary shadow-sm"
                              : "text-text-tertiary hover:text-text-primary"
                          }`}
                        >
                          AI
                        </button>
                      </div>

                      {/* Section solid color */}
                      {sectionBg.type === "solid" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={sectionBg.hex_color || "#ffffff"}
                            onChange={(e) =>
                              updateSectionBg(section.section_id, {
                                type: "solid",
                                hex_color: e.target.value,
                              })
                            }
                            className="w-8 h-8 rounded border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={sectionBg.hex_color || "#ffffff"}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                                updateSectionBg(section.section_id, {
                                  type: "solid",
                                  hex_color: v,
                                });
                              }
                            }}
                            className="flex-1 h-8 px-2 border border-border rounded text-xs font-mono"
                            maxLength={7}
                            placeholder="#ffffff"
                          />
                        </div>
                      )}

                      {/* Section AI */}
                      {sectionBg.type === "ai" && (
                        <div className="space-y-2">
                          <textarea
                            value={sectionPrompts[section.section_id] || sectionBg.ai_prompt || ""}
                            onChange={(e) =>
                              setSectionPrompts((prev) => ({
                                ...prev,
                                [section.section_id]: e.target.value,
                              }))
                            }
                            placeholder="배경 분위기를 설명..."
                            className="w-full h-16 px-2.5 py-2 border border-border rounded-lg text-xs resize-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                          />
                          <button
                            onClick={() =>
                              handleGenerateSection(section.section_id, section.section_type)
                            }
                            disabled={
                              generating ||
                              !(sectionPrompts[section.section_id] || sectionBg.ai_prompt || "").trim()
                            }
                            className="w-full py-2 bg-black text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors disabled:opacity-50"
                          >
                            {generating ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                생성 중...
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                생성하기
                              </>
                            )}
                          </button>
                          {sectionBg.ai_image_url && (
                            <div className="rounded-lg overflow-hidden border border-border">
                              <img
                                src={sectionBg.ai_image_url}
                                alt="AI 배경"
                                className="w-full h-auto"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Section Opacity & Brightness Sliders */}
                      {(sectionBg.type === "solid" || sectionBg.type === "ai") && (
                        <div className="space-y-2.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-medium text-text-secondary">투명도</p>
                              <span className="text-[11px] text-text-tertiary tabular-nums">{sectionBg.opacity ?? 100}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={sectionBg.opacity ?? 100}
                              onChange={(e) =>
                                updateSectionBg(section.section_id, {
                                  opacity: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-1.5 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-medium text-text-secondary">밝기</p>
                              <span className="text-[11px] text-text-tertiary tabular-nums">{sectionBg.brightness ?? 100}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={200}
                              value={sectionBg.brightness ?? 100}
                              onChange={(e) =>
                                updateSectionBg(section.section_id, {
                                  brightness: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-1.5 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
