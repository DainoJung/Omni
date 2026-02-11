"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageTypeSelector } from "./PageTypeSelector";
import { projectsApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { PageType } from "@/types";

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

interface ProjectInputFormProps {
  onSuccess?: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectInputForm({ onSuccess, compact }: ProjectInputFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageTypeId, setPageTypeId] = useState("");
  const [pageTypeConfig, setPageTypeConfig] = useState<PageType | null>(null);
  const [products, setProducts] = useState<ProductEntry[]>([
    { name: "", price: "", brand_name: "", image: null, imagePreview: null },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requiresPrice = pageTypeConfig?.requires_price ?? true;
  const minProducts = pageTypeConfig?.min_products ?? 1;
  const maxProducts = pageTypeConfig?.max_products ?? 6;

  const handlePageTypeChange = (pt: PageType) => {
    setPageTypeId(pt.id);
    setPageTypeConfig(pt);

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

    if (products.length < minProducts) {
      newErrors.products = `최소 ${minProducts}개 상품이 필요합니다.`;
    }

    products.forEach((p, i) => {
      if (!p.name.trim()) newErrors[`product_${i}_name`] = "제품명을 입력하세요.";
      if (requiresPrice && !p.price.trim())
        newErrors[`product_${i}_price`] = "가격을 입력하세요.";
      if (!p.image) newErrors[`product_${i}_image`] = "이미지를 추가하세요.";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. 프로젝트 생성
      const project = await projectsApi.create({
        products: products.map((p) => ({
          name: p.name,
          ...(requiresPrice ? { price: p.price } : {}),
          ...(p.brand_name ? { brand_name: p.brand_name } : {}),
        })),
        page_type: pageTypeId,
      });

      // 2. 각 상품 이미지 업로드
      for (const prod of products) {
        if (prod.image) {
          await uploadApi.uploadImage(project.id, prod.image, "input");
        }
      }

      // 3. 생성 페이지로 이동
      if (onSuccess) {
        onSuccess(project.id);
      } else {
        router.push(`/generate/${project.id}`);
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

      {/* 상품 목록 */}
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
                  {products.length > minProducts && (
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
                {products.length >= 2 && (
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

        {products.length < maxProducts && (
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

      <div className="pt-4">
        <Button type="submit" size="lg" loading={loading} className="w-full">
          AI 상세페이지 생성하기
        </Button>
      </div>
    </form>
  );
}
