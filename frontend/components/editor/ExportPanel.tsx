"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Download, Monitor, ChevronDown } from "lucide-react";

export interface MarketplacePreset {
  id: string;
  name: string;
  width: number;
  description: string;
}

const MARKETPLACE_PRESETS: MarketplacePreset[] = [
  { id: "general", name: "일반", width: 860, description: "기본 860px" },
  { id: "amazon", name: "Amazon A+", width: 970, description: "970px 폭" },
  { id: "shopify", name: "Shopify", width: 2048, description: "2048px 정사각형" },
  { id: "coupang", name: "Coupang", width: 780, description: "780px 폭" },
  { id: "custom", name: "커스텀", width: 0, description: "직접 입력" },
];

interface ExportPanelProps {
  onExport: (options: {
    format: "png" | "jpg";
    quality: 1 | 2 | 3;
    filename: string;
    preset?: string;
    customWidth?: number;
  }) => void;
  loading?: boolean;
  projectName?: string;
}

export function ExportPanel({ onExport, loading, projectName }: ExportPanelProps) {
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState<1 | 2 | 3>(2);
  const [preset, setPreset] = useState("general");
  const [customWidth, setCustomWidth] = useState(860);
  const [showPresets, setShowPresets] = useState(false);

  const selectedPreset = MARKETPLACE_PRESETS.find((p) => p.id === preset);

  const handleExport = () => {
    const filename = projectName || "omni-export";
    onExport({
      format,
      quality,
      filename,
      preset,
      customWidth: preset === "custom" ? customWidth : selectedPreset?.width,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h4 className="text-sm font-medium text-text-primary">내보내기 설정</h4>

      {/* Marketplace Preset */}
      <div className="space-y-2">
        <span className="text-xs text-text-tertiary">마켓 프리셋</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="w-full h-9 px-3 border border-border rounded-sm text-sm text-left flex items-center justify-between hover:border-text-secondary transition-colors"
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} className="text-text-tertiary" />
              <span>{selectedPreset?.name}</span>
              <span className="text-text-tertiary text-xs">
                {selectedPreset?.description}
              </span>
            </div>
            <ChevronDown size={14} className="text-text-tertiary" />
          </button>
          {showPresets && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-sm shadow-lg z-10">
              {MARKETPLACE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPreset(p.id);
                    setShowPresets(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary flex items-center justify-between ${
                    preset === p.id ? "bg-accent/5 text-accent" : "text-text-primary"
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-text-tertiary">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Width */}
      {preset === "custom" && (
        <div className="space-y-2">
          <span className="text-xs text-text-tertiary">너비 (px)</span>
          <input
            type="number"
            value={customWidth}
            onChange={(e) => setCustomWidth(Math.max(320, parseInt(e.target.value) || 860))}
            min={320}
            max={4096}
            className="w-full h-9 px-3 border border-border rounded-sm text-sm focus:border-border-focus"
          />
        </div>
      )}

      {/* Format */}
      <div className="space-y-2">
        <span className="text-xs text-text-tertiary">파일 형식</span>
        <div className="flex gap-2">
          {(["png", "jpg"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`flex-1 h-9 text-xs font-medium rounded-sm border transition-colors ${
                format === f
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-tertiary hover:border-text-secondary"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <span className="text-xs text-text-tertiary">품질 (배율)</span>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={`flex-1 h-9 text-xs font-medium rounded-sm border transition-colors ${
                quality === q
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-tertiary hover:border-text-secondary"
              }`}
            >
              {q}x
            </button>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        loading={loading}
        className="w-full flex items-center justify-center gap-2"
      >
        <Download size={16} />
        이미지 내보내기
      </Button>
    </div>
  );
}
