"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SelectedElement } from "./SectionBlock";

interface ImagePanelProps {
  selected: SelectedElement;
  imagePrompt: string;
  onRegenerate: (sectionId: string, prompt: string) => Promise<void>;
}

export function ImagePanel({ selected, imagePrompt, onRegenerate }: ImagePanelProps) {
  const [prompt, setPrompt] = useState(imagePrompt);
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      await onRegenerate(selected.sectionId, prompt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold mb-1">이미지 설정</h3>
        <p className="text-xs text-text-tertiary">{selected.placeholderId}</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-secondary">
          생성 프롬프트
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-border rounded-sm text-sm resize-y bg-bg-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus/10 placeholder:text-text-tertiary"
          placeholder="이미지 생성에 사용할 프롬프트를 입력하세요..."
        />
      </div>

      <Button
        size="sm"
        className="w-full"
        loading={loading}
        onClick={handleRegenerate}
      >
        <RefreshCw size={14} className="mr-1.5" />
        이미지 재생성
      </Button>

      {loading && (
        <p className="text-xs text-text-tertiary text-center">
          이미지를 생성하고 있습니다...
        </p>
      )}
    </div>
  );
}
