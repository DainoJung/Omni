"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { productAnalysisApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Link2,
  Search,
  Loader2,
  CheckCircle,
  X,
  Plus,
  Pencil,
  ImageIcon,
} from "lucide-react";
import type { AnalysisResponse } from "@/types";

type InputTab = "name" | "url";

interface ProductInputProps {
  /** 사용자가 "다음 단계"를 눌러 결과를 확정했을 때 */
  onAnalysisComplete: (analysis: AnalysisResponse) => void;
  /** 분석 완료/리셋 시 부모에게 알림 (스텝 트래킹용) */
  onAnalysisFetched?: (analysis: AnalysisResponse | null) => void;
}

const TONE_OPTIONS = ["premium", "playful", "professional", "warm", "modern"];

export function ProductInput({ onAnalysisComplete, onAnalysisFetched }: ProductInputProps) {
  const [activeTab, setActiveTab] = useState<InputTab>("name");
  const [loading, setLoading] = useState(false);

  // Name search state
  const [searchName, setSearchName] = useState("");
  // URL state
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState("");

  // Editable result state
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Editable fields — product info
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  // Editable fields — analysis
  const [editCategory, setEditCategory] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editTone, setEditTone] = useState("");
  const [editUsp, setEditUsp] = useState<string[]>([]);
  const [editSummary, setEditSummary] = useState("");
  const [editColors, setEditColors] = useState<string[]>([]);
  const [newUsp, setNewUsp] = useState("");

  // Populate editable fields from result
  const populateEditFields = (r: AnalysisResponse) => {
    setEditName(r.scraped_data?.name || "");
    setEditBrand(r.scraped_data?.brand || "");
    setEditPrice(
      r.scraped_data?.price
        ? `${r.scraped_data.currency ? r.scraped_data.currency + " " : ""}${r.scraped_data.price}`
        : ""
    );
    setEditDescription(r.scraped_data?.description || "");
    setEditImages(r.scraped_data?.images || []);
    setEditCategory(r.category);
    setEditSubcategory(r.subcategory);
    setEditTarget(r.target_customer);
    setEditTone(r.tone);
    setEditUsp([...r.usp_points]);
    setEditSummary(r.summary);
    setEditColors([...r.color_palette]);
  };

  // Build final AnalysisResponse from edited fields
  const buildEditedResult = (): AnalysisResponse => {
    return {
      category: editCategory,
      subcategory: editSubcategory,
      usp_points: editUsp,
      target_customer: editTarget,
      tone: editTone,
      recommended_template_style: result?.recommended_template_style || "clean_minimal",
      color_palette: editColors,
      summary: editSummary,
      scraped_data: {
        name: editName,
        description: editDescription,
        price: editPrice.replace(/^[A-Z]{3}\s*/, ""),
        currency: result?.scraped_data?.currency || "",
        brand: editBrand,
        images: editImages,
        category: editCategory,
        url: result?.scraped_data?.url || url || "",
        platform: result?.scraped_data?.platform || "",
      },
    };
  };

  const handleAnalysisResult = (r: AnalysisResponse) => {
    setResult(r);
    populateEditFields(r);
    setEditMode(false);
    onAnalysisFetched?.(r);
  };

  const handleNameSearch = async () => {
    const trimmed = searchName.trim();
    if (!trimmed) {
      setInputError("상품명을 입력해주세요.");
      return;
    }
    setInputError("");
    setLoading(true);
    try {
      const r = await productAnalysisApi.searchByName(trimmed);
      handleAnalysisResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상품 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!url.trim()) {
      setInputError("상품 URL을 입력해주세요.");
      return;
    }
    try {
      new URL(url);
    } catch {
      setInputError("올바른 URL 형식이 아닙니다.");
      return;
    }
    setInputError("");
    setLoading(true);
    try {
      const r = await productAnalysisApi.analyzeUrl(url);
      handleAnalysisResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상품 분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    const final = buildEditedResult();
    onAnalysisComplete(final);
  };

  const handleReset = () => {
    setResult(null);
    setEditMode(false);
    setInputError("");
    onAnalysisFetched?.(null);
  };

  const removeUsp = (idx: number) => {
    setEditUsp((prev) => prev.filter((_, i) => i !== idx));
  };

  const addUsp = () => {
    const trimmed = newUsp.trim();
    if (trimmed && editUsp.length < 5) {
      setEditUsp((prev) => [...prev, trimmed]);
      setNewUsp("");
    }
  };

  const removeImage = (idx: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ──────────────── Result View (Step 2: 분석 결과 확인 & 수정) ────────────────
  if (result) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">분석 완료</span>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Pencil size={12} />
            {editMode ? "미리보기" : "수정하기"}
          </button>
        </div>

        {/* Product Info */}
        <div className="border border-border rounded-sm p-4 space-y-3">
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            상품 정보
          </h4>

          {editMode ? (
            <div className="space-y-3">
              <Field label="상품명" value={editName} onChange={setEditName} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="브랜드" value={editBrand} onChange={setEditBrand} />
                <Field label="가격" value={editPrice} onChange={setEditPrice} />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-text-tertiary">설명</span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-sm text-xs resize-none focus:border-border-focus"
                  maxLength={500}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <InfoRow label="상품명" value={editName} />
              <InfoRow label="브랜드" value={editBrand} />
              <InfoRow label="가격" value={editPrice} />
              {result.scraped_data?.platform && (
                <InfoRow label="플랫폼" value={result.scraped_data.platform} />
              )}
              {editDescription && (
                <div className="col-span-2">
                  <span className="text-text-tertiary">설명</span>
                  <p className="text-text-primary mt-0.5 line-clamp-2">{editDescription}</p>
                </div>
              )}
            </div>
          )}

          {/* Images */}
          {(editImages.length > 0 || editMode) && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary flex items-center gap-1">
                  <ImageIcon size={12} />
                  상품 이미지
                </span>
                {editImages.length > 0 && (
                  <span className="text-[10px] text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded">
                    {editImages.length}장
                  </span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {editImages.map((imgUrl, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <img
                      src={imgUrl}
                      alt={`상품 이미지 ${i + 1}`}
                      className="w-24 h-24 rounded-sm object-cover border border-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {i === 0 && (
                      <span className="absolute top-0.5 left-0.5 text-[9px] bg-accent text-white px-1 py-0.5 rounded leading-none">
                        대표
                      </span>
                    )}
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!editMode && editImages.length > 0 && (
                <p className="text-[10px] text-text-tertiary">
                  이 이미지들이 상세페이지 생성 시 참조 이미지로 사용됩니다.
                </p>
              )}
              {editImages.length === 0 && !editMode && (
                <p className="text-[10px] text-warning">
                  상품 이미지가 없습니다. 수정하기를 눌러 이미지를 추가하거나, 이미지 없이 생성할 수 있습니다.
                </p>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div className="border border-border rounded-sm p-4 space-y-3">
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            AI 분석 결과
          </h4>

          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="카테고리" value={editCategory} onChange={setEditCategory} />
                <Field label="세부 카테고리" value={editSubcategory} onChange={setEditSubcategory} />
              </div>
              <Field label="타겟 고객" value={editTarget} onChange={setEditTarget} />
              <div className="space-y-1">
                <span className="text-xs text-text-tertiary">톤앤매너</span>
                <div className="flex gap-1.5 flex-wrap">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditTone(t)}
                      className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                        editTone === t
                          ? "border-accent bg-accent/10 text-accent font-medium"
                          : "border-border text-text-tertiary hover:border-text-secondary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-text-tertiary">USP (핵심 셀링포인트)</span>
                <div className="flex flex-wrap gap-1.5">
                  {editUsp.map((u, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-secondary rounded-sm text-xs text-text-primary"
                    >
                      {u}
                      <button type="button" onClick={() => removeUsp(i)} className="text-text-tertiary hover:text-error">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                {editUsp.length < 5 && (
                  <div className="flex gap-1.5 mt-1">
                    <input
                      value={newUsp}
                      onChange={(e) => setNewUsp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUsp())}
                      placeholder="USP 추가..."
                      className="flex-1 h-7 px-2 border border-border rounded-sm text-xs focus:border-border-focus"
                    />
                    <button
                      type="button"
                      onClick={addUsp}
                      className="h-7 px-2 border border-border rounded-sm text-xs text-text-tertiary hover:border-accent hover:text-accent"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
              <Field label="요약" value={editSummary} onChange={setEditSummary} />
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <AnalysisRow label="카테고리" value={`${editCategory} > ${editSubcategory}`} />
              <AnalysisRow label="타겟" value={editTarget} />
              <AnalysisRow label="톤" value={editTone} />
              <div className="flex items-start gap-2">
                <span className="text-text-tertiary w-14 shrink-0">USP</span>
                <div className="flex flex-wrap gap-1">
                  {editUsp.map((u, i) => (
                    <span key={i} className="px-2 py-0.5 bg-bg-secondary rounded-sm text-text-primary">
                      {u}
                    </span>
                  ))}
                </div>
              </div>
              {editColors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary w-14 shrink-0">컬러</span>
                  <div className="flex gap-1">
                    {editColors.map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            다시 검색
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            다음 단계
          </Button>
        </div>
      </div>
    );
  }

  // ──────────────── Input View (Step 1: 상품 입력) ────────────────
  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab("name");
            setInputError("");
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "name"
              ? "border-accent text-accent"
              : "border-transparent text-text-tertiary hover:text-text-primary"
          }`}
        >
          <Search size={16} />
          상품명 검색
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("url");
            setInputError("");
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "url"
              ? "border-accent text-accent"
              : "border-transparent text-text-tertiary hover:text-text-primary"
          }`}
        >
          <Link2 size={16} />
          URL 입력
        </button>
      </div>

      {/* Name Search Tab */}
      {activeTab === "name" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              상품명 <span className="text-error">*</span>
            </label>
            <p className="text-xs text-text-tertiary">
              상품명을 입력하면 웹에서 상품 정보를 자동으로 검색합니다.
            </p>
            <input
              type="text"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setInputError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleNameSearch()}
              placeholder="예: 아이폰 15 프로, 나이키 에어맥스 90"
              className={`w-full h-10 px-3 border rounded-sm text-sm focus:border-border-focus ${
                inputError ? "border-error" : "border-border"
              }`}
            />
            {inputError && <p className="text-xs text-error">{inputError}</p>}
          </div>
          <Button onClick={handleNameSearch} loading={loading} className="w-full">
            {loading ? "검색 중..." : "상품 검색하기"}
          </Button>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === "url" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              상품 URL <span className="text-error">*</span>
            </label>
            <p className="text-xs text-text-tertiary">
              Amazon, Coupang, Shopify 등 상품 페이지 URL을 붙여넣으세요.
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setInputError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleUrlAnalyze()}
              placeholder="https://www.amazon.com/dp/B09V3KXJPB"
              className={`w-full h-10 px-3 border rounded-sm text-sm focus:border-border-focus ${
                inputError ? "border-error" : "border-border"
              }`}
            />
            {inputError && <p className="text-xs text-error">{inputError}</p>}
          </div>
          <Button onClick={handleUrlAnalyze} loading={loading} className="w-full">
            {loading ? "분석 중..." : "상품 분석하기"}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-text-secondary">
            {activeTab === "name"
              ? "웹에서 상품 정보를 검색하고 AI가 분석하고 있습니다..."
              : "상품 페이지를 스크래핑하고 AI가 분석하고 있습니다..."}
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────── Sub-components ────────────────

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-text-tertiary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2.5 border border-border rounded-sm text-xs focus:border-border-focus"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-text-tertiary">{label}</span>
      <p className="text-text-primary font-medium">{value}</p>
    </div>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-tertiary w-14 shrink-0">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
