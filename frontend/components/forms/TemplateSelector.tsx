"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical, X, Plus } from "lucide-react";
import type { SectionType } from "@/types";

const ALL_SECTIONS: SectionType[] = [
  "hero_banner",
  "feature_badges",
  "description",
  "feature_point",
  "promo_hero",
  "product_card",
  "fit_hero",
  "fit_event_info",
  "fit_product_trio",
];

const SECTION_META: Record<
  SectionType,
  { label: string; description: string }
> = {
  hero_banner: {
    label: "히어로 배너",
    description: "배경 이미지 + 카테고리, 타이틀, 서브타이틀",
  },
  feature_badges: {
    label: "특징 뱃지",
    description: "핵심 특징 3가지 아이콘 뱃지",
  },
  description: {
    label: "상세 설명",
    description: "제목, 본문, 해시태그, 원형 이미지",
  },
  feature_point: {
    label: "특징 포인트",
    description: "포인트 라벨, 제목, 본문, 와이드 이미지",
  },
  promo_hero: {
    label: "프로모 헤더",
    description: "필기체 타이틀 + 카테고리 + 히어로 이미지",
  },
  product_card: {
    label: "상품 카드",
    description: "상품 이미지 + 브랜드 + 상품명 + 가격",
  },
  fit_hero: {
    label: "FIT 히어로",
    description: "배경 이미지 + 브랜드명 + 이벤트 타이틀 + 기간",
  },
  fit_event_info: {
    label: "FIT 행사 정보",
    description: "이벤트명, 혜택, 기간, 장소, CTA 버튼",
  },
  fit_product_trio: {
    label: "FIT 상품 3종",
    description: "상품 3개 가로 배열 (이미지 + 이름 + 설명 + 가격)",
  },
};

interface TemplateSelectorProps {
  selectedSections: SectionType[];
  onChange: (sections: SectionType[]) => void;
  error?: string;
}

export function TemplateSelector({
  selectedSections,
  onChange,
  error,
}: TemplateSelectorProps) {
  const [customMode, setCustomMode] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    index: number;
    position: "before" | "after";
  } | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  // ── 드래그 ──
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      dragNodeRef.current = e.currentTarget;
      e.dataTransfer.effectAllowed = "move";
      requestAnimationFrame(() => {
        if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4";
      });
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragIndex === null || dragIndex === index) {
        setDropTarget(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "before" : "after";
      setDropTarget({ index, position });
    },
    [dragIndex]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragIndex !== null && dropTarget !== null) {
      const next = [...selectedSections];
      const [moved] = next.splice(dragIndex, 1);
      let insertAt = dropTarget.index;
      // splice 후 인덱스 보정
      if (dragIndex < dropTarget.index) insertAt--;
      if (dropTarget.position === "after") insertAt++;
      next.splice(insertAt, 0, moved);
      onChange(next);
    }
    setDragIndex(null);
    setDropTarget(null);
    dragNodeRef.current = null;
  }, [dragIndex, dropTarget, selectedSections, onChange]);

  // ── 추가 / 삭제 ──
  const addSection = (type: SectionType) => {
    onChange([...selectedSections, type]);
    setAddMenuOpen(false);
  };

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addMenuOpen]);

  const removeSection = (index: number) => {
    onChange(selectedSections.filter((_, i) => i !== index));
  };

  // ── 모드 전환 ──
  const handleAutoSelect = () => {
    setCustomMode(false);
    onChange([...ALL_SECTIONS]);
  };

  const handleCustomMode = () => {
    setCustomMode(true);
  };

  const availableSections = ALL_SECTIONS;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        페이지 구성
      </label>

      <div className="border border-border rounded-sm">
        {/* 자동 / 직접 지정 탭 */}
        <div className="flex">
          <button
            type="button"
            onClick={handleAutoSelect}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${!customMode
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
              }`}
          >
            자동 (전체)
          </button>
          <button
            type="button"
            onClick={handleCustomMode}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${customMode
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
              }`}
          >
            직접 지정
          </button>
        </div>

        {/* 직접 지정 모드 */}
        {customMode && (
          <>
            {/* 선택된 섹션 — 드래그 순서 변경, X 삭제 */}
            {selectedSections.length > 0 ? (
              <div className="border-t border-border">
                {selectedSections.map((type, index) => {
                  const meta = SECTION_META[type];
                  const showBefore =
                    dropTarget?.index === index &&
                    dropTarget.position === "before";
                  const showAfter =
                    dropTarget?.index === index &&
                    dropTarget.position === "after";
                  const isDragging = dragIndex === index;

                  return (
                    <div key={index} className="relative">
                      {showBefore && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-black z-10" />
                      )}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-4 py-2.5 bg-white select-none border-b border-border last:border-b-0 ${isDragging ? "opacity-40" : ""
                          }`}
                      >
                        <span className="cursor-grab active:cursor-grabbing text-text-tertiary shrink-0">
                          <GripVertical size={14} />
                        </span>
                        <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center shrink-0 text-xs font-mono">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            {meta.label}
                          </p>
                          <p className="text-xs text-text-tertiary truncate">
                            {meta.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="p-1 text-text-tertiary hover:text-error transition-colors shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {showAfter && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black z-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-text-tertiary border-t border-border">
                아래에서 섹션을 추가해 주세요.
              </div>
            )}

            {/* + 섹션 추가 버튼 */}
            <div className="border-t border-border relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setAddMenuOpen((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm text-text-secondary hover:text-accent hover:bg-bg-secondary transition-colors"
              >
                <Plus size={14} />
                섹션 추가
              </button>

              {addMenuOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-0.5 bg-white border border-border rounded-sm shadow-lg z-20">
                  {availableSections.map((type) => {
                    const meta = SECTION_META[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addSection(type)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-bg-secondary transition-colors"
                      >
                        <span className="w-5 h-5 rounded border border-dashed border-text-tertiary flex items-center justify-center shrink-0">
                          <Plus size={12} className="text-text-tertiary" />
                        </span>
                        <p className="text-sm text-text-primary flex-1">
                          {meta.label}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
