"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import type { RenderedSection } from "@/types";

interface SectionBlockProps {
  section: RenderedSection;
  onDataChange: (sectionId: string, placeholderId: string, newValue: string) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function SectionBlock({ section, onDataChange }: SectionBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. {{placeholder}}를 data 값으로 치환
  const renderedHtml = useMemo(() => {
    let html = section.html_template;
    for (const [key, value] of Object.entries(section.data)) {
      // html 타입 placeholder(_html 접미사)나 이미지/색상은 escape 하지 않음
      const skipEscape = key.endsWith("_html") || key.endsWith("_image") || key === "theme_accent";
      const escaped = skipEscape ? value : escapeHtml(value);
      html = html.replaceAll(`{{${key}}}`, escaped);
    }
    return html;
  }, [section.html_template, section.data]);

  // 2. CSS에서도 {{theme_accent}} 등 치환
  const renderedCss = useMemo(() => {
    let css = section.css;
    for (const [key, value] of Object.entries(section.data)) {
      css = css.replaceAll(`{{${key}}}`, value);
    }
    return css;
  }, [section.css, section.data]);

  // 3. 더블클릭 → contentEditable, blur → 저장
  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editableEl =
        target.dataset.editable === "true"
          ? target
          : target.closest<HTMLElement>("[data-editable='true']");

      if (!editableEl) return;

      e.preventDefault();
      editableEl.contentEditable = "true";
      editableEl.focus();
      editableEl.style.outline = "2px solid #3B82F6";
      editableEl.style.outlineOffset = "2px";
      editableEl.style.borderRadius = "4px";

      const placeholderId = editableEl.dataset.placeholder;
      if (!placeholderId) return;

      const handleBlur = () => {
        editableEl.contentEditable = "false";
        editableEl.style.outline = "";
        editableEl.style.outlineOffset = "";
        editableEl.style.borderRadius = "";
        const newValue = editableEl.innerText.trim();
        onDataChange(section.section_id, placeholderId, newValue);
        editableEl.removeEventListener("blur", handleBlur);
        editableEl.removeEventListener("keydown", handleKeyDown);
      };

      const handleKeyDown = (ke: KeyboardEvent) => {
        if (ke.key === "Enter" && !ke.shiftKey) {
          ke.preventDefault();
          editableEl.blur();
        }
        if (ke.key === "Escape") {
          editableEl.innerText = section.data[placeholderId] || "";
          editableEl.blur();
        }
      };

      editableEl.addEventListener("blur", handleBlur);
      editableEl.addEventListener("keydown", handleKeyDown);
    },
    [section.section_id, section.data, onDataChange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("dblclick", handleDoubleClick);
    return () => container.removeEventListener("dblclick", handleDoubleClick);
  }, [handleDoubleClick]);

  return (
    <div ref={containerRef} className="section-block">
      <style dangerouslySetInnerHTML={{ __html: renderedCss }} />
      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </div>
  );
}
