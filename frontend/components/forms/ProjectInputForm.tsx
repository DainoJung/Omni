"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CategorySelector } from "./CategorySelector";
import { ImageUploader } from "./ImageUploader";
import { projectsApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";

export function ProjectInputForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    description: "",
    category: "",
    event_period_start: "",
    event_period_end: "",
    price_info: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.brand_name.trim()) newErrors.brand_name = "브랜드명을 입력하세요.";
    if (!form.description.trim())
      newErrors.description = "행사/상품 설명을 입력하세요.";
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
        brand_name: form.brand_name,
        description: form.description,
        category: form.category || undefined,
        event_period_start: form.event_period_start || undefined,
        event_period_end: form.event_period_end || undefined,
        price_info: form.price_info || undefined,
      });

      // 2. 이미지 업로드
      for (const file of images) {
        await uploadApi.uploadImage(project.id, file, "input");
      }

      // 3. 템플릿 선택 페이지로 이동
      router.push(`/create/template?projectId=${project.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">POP 상세페이지 만들기</h2>
        <p className="text-text-secondary text-sm">
          기본 정보를 입력하면 AI가 상세페이지를 만들어 드립니다.
        </p>
      </div>

      <Input
        label="브랜드명"
        required
        placeholder="브랜드명을 입력하세요"
        value={form.brand_name}
        onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
        error={errors.brand_name}
      />

      <Textarea
        label="행사/상품 설명"
        required
        placeholder="행사 또는 상품에 대해 자세히 설명해 주세요.&#10;(AI가 이 내용을 바탕으로 카피를 생성합니다)"
        maxLength={2000}
        showCount
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        error={errors.description}
      />

      <CategorySelector
        value={form.category}
        onChange={(v) => setForm({ ...form, category: v })}
      />

      <ImageUploader files={images} onChange={setImages} />

      {/* 추가 정보 (선택) */}
      <details className="group">
        <summary className="text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary">
          추가 정보 (선택)
        </summary>
        <div className="mt-4 space-y-4 pl-0">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              행사 기간
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={form.event_period_start}
                onChange={(e) =>
                  setForm({ ...form, event_period_start: e.target.value })
                }
                className="h-11 px-4 border border-border rounded-sm text-sm focus:border-border-focus"
              />
              <span className="text-text-secondary">~</span>
              <input
                type="date"
                value={form.event_period_end}
                onChange={(e) =>
                  setForm({ ...form, event_period_end: e.target.value })
                }
                className="h-11 px-4 border border-border rounded-sm text-sm focus:border-border-focus"
              />
            </div>
          </div>

          <Input
            label="가격/할인 정보"
            placeholder="예) 정가 50,000원 → 39,000원 (22% 할인)"
            value={form.price_info}
            onChange={(e) => setForm({ ...form, price_info: e.target.value })}
          />
        </div>
      </details>

      <div className="pt-4">
        <Button type="submit" size="lg" loading={loading} className="w-full">
          다음: 템플릿 선택
        </Button>
      </div>
    </form>
  );
}
