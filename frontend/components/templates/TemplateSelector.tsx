"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TemplateCard } from "./TemplateCard";
import { templatesApi, projectsApi } from "@/lib/api";
import type { Template } from "@/types";
import { toast } from "sonner";

export function TemplateSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectCategory, setProjectCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tplRes, project] = await Promise.all([
          templatesApi.list(),
          projectId ? projectsApi.get(projectId) : null,
        ]);
        setTemplates(tplRes.items);
        if (project?.category) {
          setProjectCategory(project.category);
        }
      } catch {
        toast.error("템플릿 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleNext = async () => {
    if (!selectedId || !projectId) return;

    setSubmitting(true);
    try {
      await projectsApi.update(projectId, { template_id: selectedId });
      router.push(`/style/${projectId}`);
    } catch {
      toast.error("템플릿 선택 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">템플릿을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">템플릿 선택</h2>
      </div>

      {projectCategory && (
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-text-primary">
            {projectCategory}
          </span>{" "}
          카테고리에 추천하는 템플릿
        </p>
      )}

      <div className="flex flex-wrap gap-6 justify-center">
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            selected={tpl.id === selectedId}
            recommended={tpl.category === projectCategory}
            onSelect={() => setSelectedId(tpl.id)}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleNext}
          disabled={!selectedId}
          loading={submitting}
        >
          다음: 스타일 선택
        </Button>
      </div>
    </div>
  );
}
