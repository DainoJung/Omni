"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageTypeSelector } from "./PageTypeSelector";
import { projectsApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X, GripVertical } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { PageType } from "@/types";

// ── 섹션 직접 선택용 섹션 목록 ──
const AVAILABLE_SECTIONS = [
  { type: "hero_banner", label: "히어로 배너", icon: "🖼️" },
  { type: "feature_badges", label: "특징 배지", icon: "🏷️" },
  { type: "description", label: "상세 설명", icon: "📝" },
  { type: "feature_point", label: "포인트", icon: "✨" },
  { type: "promo_hero", label: "프로모 히어로", icon: "🎪" },
  { type: "product_card", label: "상품 카드", icon: "🛍️" },
  { type: "fit_hero", label: "핏 히어로", icon: "👗" },
  { type: "fit_event_info", label: "핏 이벤트 정보", icon: "📋" },
  { type: "fit_product_trio", label: "핏 3상품", icon: "👠" },
  { type: "vip_special_hero", label: "VIP 스페셜", icon: "💎" },
  { type: "vip_private_hero", label: "VIP 프라이빗", icon: "🖤" },
  { type: "gourmet_hero", label: "고메트립 히어로", icon: "🍽️" },
  { type: "gourmet_restaurant", label: "고메트립 레스토랑", icon: "🍳" },
  { type: "gourmet_wine_intro", label: "고메트립 와인 인트로", icon: "🍷" },
  { type: "gourmet_wine", label: "고메트립 와인", icon: "🍾" },
  { type: "shinsegae_hero", label: "뱅드신세계", icon: "🏬" },
] as const;

interface ProductEntry {
  name: string;
  price: string;
  brand_name: string;
  image: File | null;
  imagePreview: string | null;
}

function ProductImageUploader({
  image,
  preview,
  onSelect,
  onRemove,
}: {
  image: File | null;
  preview: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onSelect(files[0]),
    accept: { "image/png": [], "image/jpeg": [] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: !!image,
  });

  if (image && preview) {
    return (
      <div className="relative group w-20 h-20">
        <div className="w-20 h-20 rounded-sm border border-border overflow-hidden">
          <img
            src={preview}
            alt="상품"
            className="w-full h-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`w-20 h-20 border-2 border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive
        ? "border-accent bg-bg-secondary"
        : "border-border hover:border-text-secondary"
        }`}
    >
      <input {...getInputProps()} />
      <Upload size={16} className="text-text-tertiary" />
      <span className="text-[10px] text-text-tertiary mt-1">이미지</span>
    </div>
  );
}

// ── 고메트립 전용 폼 ──
const WINE_COUNT_OPTIONS = [3, 6] as const;

function GourmetForm({
  restaurants,
  wines,
  wineCount,
  onRestaurantChange,
  onWineChange,
  onWineCountChange,
  errors,
}: {
  restaurants: string[];
  wines: string[];
  wineCount: 3 | 6;
  onRestaurantChange: (idx: number, value: string) => void;
  onWineChange: (idx: number, value: string) => void;
  onWineCountChange: (count: 3 | 6) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {/* 레스토랑 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            🍽️ 레스토랑 <span className="text-error">*</span>
          </span>
          <span className="text-xs text-text-tertiary">3개 고정</span>
        </div>
        {restaurants.map((name, i) => (
          <div key={`r-${i}`}>
            <input
              placeholder={`레스토랑 ${i + 1} 이름`}
              value={name}
              onChange={(e) => onRestaurantChange(i, e.target.value)}
              className={`w-full h-9 px-3 border rounded-sm text-sm focus:border-border-focus ${
                errors[`restaurant_${i}`] ? "border-error" : "border-border"
              }`}
            />
            {errors[`restaurant_${i}`] && (
              <p className="text-xs text-error mt-1">{errors[`restaurant_${i}`]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 와인 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              🍷 와인 <span className="text-error">*</span>
            </span>
          </div>
          <div className="flex gap-1">
            {WINE_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onWineCountChange(n)}
                className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                  wineCount === n
                    ? "border-accent bg-accent/10 text-accent font-medium"
                    : "border-border text-text-tertiary hover:border-text-secondary"
                }`}
              >
                {n}개
              </button>
            ))}
          </div>
        </div>
        {wines.slice(0, wineCount).map((name, i) => (
          <div key={`w-${i}`}>
            <input
              placeholder={`와인 ${i + 1} 이름`}
              value={name}
              onChange={(e) => onWineChange(i, e.target.value)}
              className={`w-full h-9 px-3 border rounded-sm text-sm focus:border-border-focus ${
                errors[`wine_${i}`] ? "border-error" : "border-border"
              }`}
            />
            {errors[`wine_${i}`] && (
              <p className="text-xs text-error mt-1">{errors[`wine_${i}`]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 섹션 직접 선택 폼 ──
function CustomSectionForm({
  selectedSections,
  onAdd,
  onRemove,
  products,
  onProductChange,
  onAddProduct,
  onRemoveProduct,
  errors,
}: {
  selectedSections: string[];
  onAdd: (type: string) => void;
  onRemove: (idx: number) => void;
  products: string[];
  onProductChange: (idx: number, value: string) => void;
  onAddProduct: () => void;
  onRemoveProduct: (idx: number) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {/* 섹션 선택 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            🧩 섹션 선택 <span className="text-error">*</span>
          </span>
          <span className="text-xs text-text-tertiary">
            클릭하여 추가
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_SECTIONS.map((s) => (
            <button
              key={s.type}
              type="button"
              onClick={() => onAdd(s.type)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-sm hover:border-accent hover:bg-accent/5 transition-colors flex items-center gap-1"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <Plus size={12} className="text-text-tertiary" />
            </button>
          ))}
        </div>
        {errors.sections && (
          <p className="text-xs text-error">{errors.sections}</p>
        )}
      </div>

      {/* 선택된 섹션 순서 */}
      {selectedSections.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-text-secondary">
            선택된 섹션 ({selectedSections.length}개)
          </span>
          <div className="space-y-1">
            {selectedSections.map((secType, idx) => {
              const info = AVAILABLE_SECTIONS.find((s) => s.type === secType);
              return (
                <div
                  key={`${secType}-${idx}`}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-sm border border-border"
                >
                  <span className="text-xs text-text-tertiary w-5 text-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{info?.icon}</span>
                  <span className="text-xs font-medium text-text-primary flex-1">
                    {info?.label ?? secType}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="p-0.5 text-text-tertiary hover:text-error transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 상품명 입력 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            상품명 <span className="text-error">*</span>
          </span>
          <span className="text-xs text-text-tertiary">
            {products.length}/9개
          </span>
        </div>
        {products.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              placeholder={`상품 ${i + 1} 이름`}
              value={name}
              onChange={(e) => onProductChange(i, e.target.value)}
              className={`flex-1 h-9 px-3 border rounded-sm text-sm focus:border-border-focus ${
                errors[`custom_product_${i}`] ? "border-error" : "border-border"
              }`}
            />
            {products.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveProduct(i)}
                className="p-1 text-text-tertiary hover:text-error transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {products.length < 9 && (
          <button
            type="button"
            onClick={onAddProduct}
            className="w-full h-9 border-2 border-dashed border-border rounded-sm text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={14} />
            상품 추가
          </button>
        )}
      </div>
    </div>
  );
}

interface ProjectInputFormProps {
  onSuccess?: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectInputForm({ onSuccess, compact }: ProjectInputFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageTypeId, setPageTypeId] = useState("");
  const [pageTypeConfig, setPageTypeConfig] = useState<PageType | null>(null);
  const [brandName, setBrandName] = useState("");
  const [products, setProducts] = useState<ProductEntry[]>([
    { name: "", price: "", brand_name: "", image: null, imagePreview: null },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 고메트립 전용 state
  const [restaurants, setRestaurants] = useState<string[]>(["", "", ""]);
  const [wines, setWines] = useState<string[]>(["", "", "", "", "", ""]);
  const [wineCount, setWineCount] = useState<3 | 6>(3);

  // 커스텀 섹션 선택 state
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [customProducts, setCustomProducts] = useState<string[]>([""]);

  const isGourmet = pageTypeId === "gourmet";
  const isCustom = pageTypeId === "custom";
  const requiresPrice = pageTypeConfig?.requires_price ?? true;
  const requiresBrand = pageTypeConfig?.requires_brand ?? false;
  const minProducts = pageTypeConfig?.min_products ?? 1;
  const maxProducts = pageTypeConfig?.max_products ?? 6;

  const handlePageTypeChange = (pt: PageType) => {
    setPageTypeId(pt.id);
    setPageTypeConfig(pt);
    setErrors({});

    if (pt.id === "gourmet") {
      // 고메트립은 별도 state 사용
      setRestaurants(["", "", ""]);
      setWines(["", "", "", "", "", ""]);
      setWineCount(3);
      return;
    }

    if (pt.id === "custom") {
      setCustomSections([]);
      setCustomProducts([""]);
      return;
    }

    // 상품 수를 페이지 타입의 min/max에 맞게 조정
    if (products.length < pt.min_products) {
      const toAdd = pt.min_products - products.length;
      setProducts([
        ...products,
        ...Array.from({ length: toAdd }, () => ({
          name: "",
          price: "",
          brand_name: "",
          image: null,
          imagePreview: null,
        })),
      ]);
    } else if (products.length > pt.max_products) {
      setProducts(products.slice(0, pt.max_products));
    }
  };

  const addProduct = () => {
    if (products.length >= maxProducts) return;
    setProducts([
      ...products,
      { name: "", price: "", brand_name: "", image: null, imagePreview: null },
    ]);
  };

  const removeProduct = (index: number) => {
    if (products.length <= minProducts) return;
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
  };

  const updateProduct = (
    index: number,
    field: keyof ProductEntry,
    value: string | File | null
  ) => {
    const updated = [...products];
    if (field === "image") {
      const file = value as File | null;
      updated[index] = {
        ...updated[index],
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : null,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setProducts(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!pageTypeId) newErrors.page_type = "페이지 유형을 선택하세요.";

    if (isGourmet) {
      restaurants.forEach((r, i) => {
        if (!r.trim()) newErrors[`restaurant_${i}`] = "레스토랑명을 입력하세요.";
      });
      wines.slice(0, wineCount).forEach((w, i) => {
        if (!w.trim()) newErrors[`wine_${i}`] = "와인명을 입력하세요.";
      });
    } else if (isCustom) {
      if (customSections.length === 0)
        newErrors.sections = "최소 1개 섹션을 선택하세요.";
      customProducts.forEach((name, i) => {
        if (!name.trim())
          newErrors[`custom_product_${i}`] = "상품명을 입력하세요.";
      });
    } else {
      if (requiresBrand && !brandName.trim())
        newErrors.brand_name = "브랜드명을 입력하세요.";
      if (products.length < minProducts)
        newErrors.products = `최소 ${minProducts}개 상품이 필요합니다.`;
      products.forEach((p, i) => {
        if (!p.name.trim()) newErrors[`product_${i}_name`] = "제품명을 입력하세요.";
        if (requiresPrice && !p.price.trim())
          newErrors[`product_${i}_price`] = "가격을 입력하세요.";
        if (!p.image) newErrors[`product_${i}_image`] = "이미지를 추가하세요.";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 모드별 products 변환
      let submitProducts;
      if (isGourmet) {
        submitProducts = [
          ...restaurants.map((name) => ({ name })),
          ...wines.slice(0, wineCount).map((name) => ({ name })),
        ];
      } else if (isCustom) {
        submitProducts = customProducts.map((name) => ({ name }));
      } else {
        submitProducts = products.map((p) => {
          const effectiveBrand = requiresBrand ? brandName : p.brand_name;
          return {
            name: p.name,
            ...(requiresPrice ? { price: p.price } : {}),
            ...(effectiveBrand ? { brand_name: effectiveBrand } : {}),
          };
        });
      }

      // 1. 프로젝트 생성
      const project = await projectsApi.create({
        products: submitProducts,
        page_type: pageTypeId,
        ...(isCustom ? { selected_sections: customSections } : {}),
      });

      // 2. 각 상품 이미지 업로드 (고메트립/커스텀은 이미지 없음)
      if (!isGourmet && !isCustom) {
        for (const prod of products) {
          if (prod.image) {
            await uploadApi.uploadImage(project.id, prod.image, "input");
          }
        }
      }

      // 3. 생성 페이지로 이동
      if (onSuccess) {
        onSuccess(project.id);
      } else {
        router.push(`/result/${project.id}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">POP 만들기</h2>
          <p className="text-text-secondary text-sm">
            페이지 유형을 선택하고 상품 정보를 입력하면 AI가 자동으로 생성합니다.
          </p>
        </div>
      )}

      {/* 페이지 유형 선택 */}
      <PageTypeSelector
        value={pageTypeId}
        onChange={handlePageTypeChange}
        error={errors.page_type}
      />

      {/* 고메트립 전용 폼 */}
      {isGourmet && (
        <GourmetForm
          restaurants={restaurants}
          wines={wines}
          wineCount={wineCount}
          onRestaurantChange={(i, v) => {
            const updated = [...restaurants];
            updated[i] = v;
            setRestaurants(updated);
          }}
          onWineChange={(i, v) => {
            const updated = [...wines];
            updated[i] = v;
            setWines(updated);
          }}
          onWineCountChange={setWineCount}
          errors={errors}
        />
      )}

      {/* 커스텀 섹션 선택 폼 */}
      {isCustom && (
        <CustomSectionForm
          selectedSections={customSections}
          onAdd={(type) => setCustomSections((prev) => [...prev, type])}
          onRemove={(idx) =>
            setCustomSections((prev) => prev.filter((_, i) => i !== idx))
          }
          products={customProducts}
          onProductChange={(idx, value) => {
            const updated = [...customProducts];
            updated[idx] = value;
            setCustomProducts(updated);
          }}
          onAddProduct={() => setCustomProducts((prev) => [...prev, ""])}
          onRemoveProduct={(idx) =>
            setCustomProducts((prev) => prev.filter((_, i) => i !== idx))
          }
          errors={errors}
        />
      )}

      {/* 브랜드명 (브랜드 기획전일 때) */}
      {!isGourmet && !isCustom && requiresBrand && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            브랜드명 <span className="text-error">*</span>
          </label>
          <input
            placeholder="브랜드명을 입력하세요 (예: GUCCI)"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className={`w-full h-10 px-3 border rounded-sm text-sm font-medium focus:border-border-focus ${
              errors.brand_name ? "border-error" : "border-border"
            }`}
          />
          {errors.brand_name && (
            <p className="text-xs text-error">{errors.brand_name}</p>
          )}
        </div>
      )}

      {/* 상품 목록 (고메트립/커스텀 외) */}
      {!isGourmet && !isCustom && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-text-primary">
              상품 정보 <span className="text-error">*</span>
            </label>
            <span className="text-xs text-text-tertiary">
              {products.length}/{maxProducts}개
            </span>
          </div>
          {errors.products && (
            <p className="text-xs text-error">{errors.products}</p>
          )}

          {products.map((product, index) => (
            <div
              key={index}
              className="border border-border rounded-sm p-4 space-y-3"
            >
              <div className="flex items-start gap-4">
                {/* 이미지 업로더 */}
                <div className="shrink-0">
                  <ProductImageUploader
                    image={product.image}
                    preview={product.imagePreview}
                    onSelect={(file) => updateProduct(index, "image", file)}
                    onRemove={() => updateProduct(index, "image", null)}
                  />
                  {errors[`product_${index}_image`] && (
                    <p className="text-xs text-error mt-1">
                      {errors[`product_${index}_image`]}
                    </p>
                  )}
                </div>

                {/* 텍스트 입력 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary shrink-0">
                      상품 {index + 1}
                    </span>
                    {minProducts !== maxProducts && products.length > minProducts && (
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="ml-auto p-1 text-text-tertiary hover:text-error transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    placeholder="제품명 (필수)"
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(index, "name", e.target.value)
                    }
                    className={`w-full h-9 px-3 border rounded-sm text-sm focus:border-border-focus ${errors[`product_${index}_name`]
                      ? "border-error"
                      : "border-border"
                      }`}
                  />
                  {requiresPrice && (
                    <input
                      placeholder="가격 (필수, 예: 39,000원)"
                      value={product.price}
                      onChange={(e) =>
                        updateProduct(index, "price", e.target.value)
                      }
                      className={`w-full h-9 px-3 border rounded-sm text-sm focus:border-border-focus ${errors[`product_${index}_price`]
                        ? "border-error"
                        : "border-border"
                        }`}
                    />
                  )}
                  {!requiresBrand && products.length >= 2 && (
                    <input
                      placeholder="브랜드명 (선택, 카탈로그용)"
                      value={product.brand_name}
                      onChange={(e) =>
                        updateProduct(index, "brand_name", e.target.value)
                      }
                      className="w-full h-9 px-3 border border-border rounded-sm text-sm focus:border-border-focus"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {minProducts !== maxProducts && products.length < maxProducts && (
            <button
              type="button"
              onClick={addProduct}
              className="w-full h-10 border-2 border-dashed border-border rounded-sm text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              상품 추가
            </button>
          )}
        </div>
      )}

      <div className="pt-4">
        <Button type="submit" size="lg" loading={loading} className="w-full">
          AI 상세페이지 생성하기
        </Button>
      </div>
    </form>
  );
}
