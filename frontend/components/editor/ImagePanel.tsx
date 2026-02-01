"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SelectedElement } from "./SectionBlock";

const PROMPT_FIELD_LABELS: Record<string, string> = {
  products: "상품",
  theme: "테마",
  section_context: "섹션 내용",
  style_hint: "스타일 힌트",
  no_text_rule: "텍스트 금지 규칙",
  custom_prompt: "커스텀 프롬프트",
};

interface ImagePanelProps {
  selected: SelectedElement;
  imageUrl: string;
  imagePrompt: Record<string, string> | string;
  onRegenerate: (sectionId: string, prompt: string) => Promise<void>;
}

export function ImagePanel({ selected, imageUrl, imagePrompt, onRegenerate }: ImagePanelProps) {
  // dict → 필드별 state, string → 단일 textarea
  const isStructured = typeof imagePrompt === "object" && imagePrompt !== null;

  const [fields, setFields] = useState<Record<string, string>>(
    isStructured ? imagePrompt : {}
  );
  const [flatPrompt, setFlatPrompt] = useState(
    isStructured ? "" : (imagePrompt as string)
  );
  const [loading, setLoading] = useState(false);

  // 선택 변경 시 리셋
  useEffect(() => {
    const structured = typeof imagePrompt === "object" && imagePrompt !== null;
    if (structured) {
      setFields(imagePrompt);
      setFlatPrompt("");
    } else {
      setFields({});
      setFlatPrompt(imagePrompt as string);
    }
  }, [imagePrompt, selected.placeholderId]);

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const buildPrompt = (): string => {
    if (!isStructured) return flatPrompt;
    // 필드를 하나의 프롬프트 문자열로 조합
    const parts: string[] = [];
    if (fields.custom_prompt) {
      parts.push(fields.custom_prompt);
    } else {
      if (fields.products) parts.push(`상품: ${fields.products}.`);
      if (fields.theme) parts.push(`${fields.theme}.`);
      if (fields.section_context) parts.push(`${fields.section_context}.`);
      if (fields.style_hint) parts.push(`${fields.style_hint}.`);
    }
    if (fields.no_text_rule) parts.push(fields.no_text_rule);
    return parts.join(" ");
  };

  const handleRegenerate = async () => {
    const prompt = buildPrompt();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      await onRegenerate(selected.sectionId, prompt);
    } finally {
      setLoading(false);
    }
  };

  // 편집 가능한 필드 (no_text_rule은 읽기 전용)
  const editableFields = ["products", "theme", "section_context", "style_hint", "custom_prompt"];
  const readonlyFields = ["no_text_rule"];

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0">
        <h3 className="text-sm font-bold mb-1">이미지 설정</h3>
        <p className="text-xs text-text-tertiary">{selected.placeholderId}</p>
      </div>

      {/* 미리보기 */}
      {imageUrl && (
        <div className="shrink-0 mt-5 space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary">미리보기</label>
          <div className="border border-border rounded-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="섹션 이미지" className="w-full h-auto object-cover" />
          </div>
        </div>
      )}

      {/* 프롬프트 */}
      <div className="flex-1 min-h-0 mt-5 flex flex-col overflow-y-auto space-y-3">
        <label className="shrink-0 block text-xs font-medium text-text-secondary">
          생성 프롬프트
        </label>

        {isStructured ? (
          <>
            {editableFields.map((key) => {
              const value = fields[key];
              if (value === undefined || value === "") return null;
              return (
                <div key={key} className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-tertiary">
                    {PROMPT_FIELD_LABELS[key] || key}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    rows={key === "style_hint" || key === "section_context" ? 3 : 1}
                    className="w-full px-2.5 py-1.5 border border-border rounded-sm text-xs resize-y bg-bg-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus/10"
                  />
                </div>
              );
            })}
            {readonlyFields.map((key) => {
              const value = fields[key];
              if (!value) return null;
              return (
                <div key={key} className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-tertiary">
                    {PROMPT_FIELD_LABELS[key] || key}
                  </label>
                  <p className="px-2.5 py-1.5 border border-border rounded-sm text-xs bg-bg-secondary text-text-secondary">
                    {value}
                  </p>
                </div>
              );
            })}
          </>
        ) : (
          <textarea
            value={flatPrompt}
            onChange={(e) => setFlatPrompt(e.target.value)}
            className="flex-1 w-full px-3 py-2 border border-border rounded-sm text-sm resize-none bg-bg-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus/10 placeholder:text-text-tertiary"
            placeholder="이미지 생성에 사용할 프롬프트를 입력하세요..."
          />
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="shrink-0 pt-4 border-t border-border mt-4">
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
          <p className="text-xs text-text-tertiary text-center mt-2">
            이미지를 생성하고 있습니다...
          </p>
        )}
      </div>
    </div>
  );
}
