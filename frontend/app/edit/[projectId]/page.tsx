"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/stores/editorStore";
import { projectsApi, templatesApi } from "@/lib/api";
import { exportImage } from "@/lib/export";
import { Undo2, Download, Save } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import type { Project, Template } from "@/types";
import { useRef } from "react";

export default function EditPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const { content, setContent, updateText, undo, canUndo } = useEditorStore();

  useEffect(() => {
    async function load() {
      try {
        const proj = await projectsApi.get(projectId);
        setProject(proj);

        if (proj.template_id) {
          const tpl = await templatesApi.get(proj.template_id);
          setTemplate(tpl);
        }

        if (proj.generated_content) {
          setContent(proj.generated_content);
        }
      } catch {
        toast.error("프로젝트를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, setContent]);

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await projectsApi.update(projectId, { generated_content: content });
      toast.success("저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    try {
      await exportImage(previewRef.current, {
        format: "png",
        quality: 2,
        filename: `${project?.brand_name || "pop"}_${Date.now()}`,
      });
      toast.success("이미지가 다운로드되었습니다.");
    } catch {
      toast.error("이미지 출력에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!content || !template) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          생성된 콘텐츠가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with actions */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center">
          <Image src="/logo.png" alt="SHINSEGAE" width={28} height={28} />
          <h1 className="text-lg font-semibold tracking-widest">
            SHINSEGAE POP MAKER
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSave} loading={saving}>
            <Save size={16} className="mr-1.5" />
            저장
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1.5" />
            내보내기
          </Button>
        </div>
      </header>

      <StepIndicator currentStep={5} />

      {/* Editor layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Edit tools */}
        <aside className="w-[280px] border-r border-border overflow-y-auto p-5 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">텍스트 편집</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  메인 카피
                </label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm focus:border-border-focus"
                  value={content.texts.main_copy}
                  onChange={(e) => updateText("main_copy", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  서브 카피
                </label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm focus:border-border-focus"
                  value={content.texts.sub_copy}
                  onChange={(e) => updateText("sub_copy", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  CTA 문구
                </label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-sm text-sm focus:border-border-focus"
                  value={content.texts.cta_text}
                  onChange={(e) => updateText("cta_text", e.target.value)}
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          <div className="space-y-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary disabled:text-text-tertiary transition-colors"
            >
              <Undo2 size={16} />
              되돌리기
            </button>
          </div>
        </aside>

        {/* Right: Preview */}
        <main className="flex-1 bg-bg-secondary overflow-auto p-8 flex justify-center">
          <div
            ref={previewRef}
            className="shadow-lg"
            style={{
              width: template.width,
              minHeight: template.height,
              backgroundColor: template.styles.background_color,
              fontFamily: template.styles.font_family_body,
            }}
          >
            {/* Header section */}
            <div className="px-10 pt-10">
              {/* Banner placeholder */}
              <div
                className="w-full bg-bg-tertiary rounded-sm flex items-center justify-center"
                style={{ height: 400 }}
              >
                {content.images.banner ? (
                  <img
                    src={content.images.banner}
                    alt="배너"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-text-tertiary text-sm">배너 이미지</p>
                )}
              </div>

              {/* Text content */}
              <div className="mt-8 text-center">
                <h2
                  className="font-serif font-bold"
                  style={{
                    fontSize: template.styles.font_sizes.main_copy,
                    color: template.styles.primary_color,
                    letterSpacing:
                      template.styles.letter_spacing?.main_copy || "0",
                  }}
                >
                  {content.texts.main_copy}
                </h2>

                <div
                  className="mx-auto my-4"
                  style={{
                    width: 60,
                    height: 1,
                    backgroundColor: template.styles.divider_color,
                  }}
                />

                <p
                  className="font-serif"
                  style={{
                    fontSize: template.styles.font_sizes.sub_copy,
                    color: template.styles.secondary_color,
                  }}
                >
                  {content.texts.sub_copy}
                </p>
              </div>
            </div>

            {/* Body texts */}
            <div className="px-10 py-12 space-y-4">
              {content.texts.body_texts.map((text, i) => (
                <p
                  key={i}
                  className="text-center leading-relaxed"
                  style={{
                    fontSize: template.styles.font_sizes.body,
                    color: template.styles.text_color,
                  }}
                >
                  {text}
                </p>
              ))}
            </div>

            {/* Products */}
            <div className="px-10 py-8">
              <div className="grid grid-cols-2 gap-5">
                {content.texts.product_descriptions.map((prod, i) => (
                  <div
                    key={i}
                    className="border rounded-sm p-4 text-center"
                    style={{ borderColor: template.styles.divider_color }}
                  >
                    <div className="w-full aspect-square bg-bg-tertiary rounded-sm mb-3 flex items-center justify-center">
                      <p className="text-xs text-text-tertiary">상품 {i + 1}</p>
                    </div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: template.styles.primary_color }}
                    >
                      {prod.name}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: template.styles.text_color }}
                    >
                      {prod.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-10 py-12 text-center">
              <button
                className="px-10 py-3 text-white font-medium rounded-sm"
                style={{
                  backgroundColor: template.styles.accent_color,
                  fontSize: template.styles.font_sizes.cta,
                }}
              >
                {content.texts.cta_text}
              </button>
            </div>

            {/* Hashtags */}
            <div className="px-10 pb-8 text-center">
              <p className="text-sm text-text-secondary">
                {content.texts.hashtags.join("  ")}
              </p>
            </div>

            {/* Footer */}
            <div className="px-10 py-8 border-t" style={{ borderColor: template.styles.divider_color }}>
              <p className="text-xs text-text-tertiary text-center leading-relaxed">
                ※ 이미지는 실제와 다를 수 있습니다.
                <br />
                ※ 행사 기간은 변경될 수 있습니다.
                <br />
                <br />
                문의: 신세계백화점 고객센터 1588-1234
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
