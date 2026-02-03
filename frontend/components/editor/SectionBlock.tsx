"use client";

import { useMemo, useRef, useEffect } from "react";
import type { RenderedSection } from "@/types";

export interface SelectedElement {
  sectionId: string;
  placeholderId: string;
  type: "text" | "image";
  currentStyles?: Record<string, string>;
}

interface SectionBlockProps {
  section: RenderedSection;
  onDataChange: (sectionId: string, placeholderId: string, newValue: string) => void;
  onElementSelect?: (element: SelectedElement | null) => void;
  selectedPlaceholderId?: string | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function SectionBlock({ section, onDataChange, onElementSelect, selectedPlaceholderId }: SectionBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef<HTMLElement | null>(null);
  const lastClickRef = useRef<{ time: number; phId: string }>({ time: 0, phId: "" });

  const propsRef = useRef({ onDataChange, onElementSelect, section });
  propsRef.current = { onDataChange, onElementSelect, section };

  const renderedHtml = useMemo(() => {
    let html = section.html_template;

    // 이미지 태그에 data-placeholder 속성이 없으면 자동 주입
    for (const [key, value] of Object.entries(section.data)) {
      if (key.endsWith("_image") && typeof value === "string" && value.startsWith("http")) {
        // src="{{key}}" 를 포함하는 <img> 태그에 data-placeholder 추가
        const srcPattern = `src="{{${key}}}"`;
        if (html.includes(srcPattern) && !html.includes(`data-placeholder="${key}"`)) {
          html = html.replace(
            new RegExp(`(<img\\b[^>]*?)${srcPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
            `$1data-placeholder="${key}" ${srcPattern}`
          );
        }
      }
    }

    for (const [key, value] of Object.entries(section.data)) {
      const skipEscape = key.endsWith("_html") || key.endsWith("_image") || key === "theme_accent";
      const escaped = skipEscape ? value : escapeHtml(value);
      html = html.replaceAll(`{{${key}}}`, escaped);
    }
    return html;
  }, [section.html_template, section.data]);

  const overrideCss = useMemo(() => {
    if (!section.style_overrides) return "";
    return Object.entries(section.style_overrides)
      .map(([phId, styles]) => {
        const props = Object.entries(styles)
          .map(([k, v]) => `${toKebab(k)}:${v} !important`)
          .join(";");
        return `[data-placeholder="${phId}"]{${props}}`;
      })
      .join("\n");
  }, [section.style_overrides]);

  const renderedCss = useMemo(() => {
    let css = section.css;
    for (const [key, value] of Object.entries(section.data)) {
      css = css.replaceAll(`{{${key}}}`, value);
    }
    return css;
  }, [section.css, section.data]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll("[data-placeholder]").forEach((el) => {
      const htmlEl = el as HTMLElement;
      const isSelected = htmlEl.dataset.placeholder === selectedPlaceholderId;
      htmlEl.style.outline = isSelected ? "2px solid #3B82F6" : "";
      htmlEl.style.outlineOffset = isSelected ? "2px" : "";
    });
  }, [selectedPlaceholderId, renderedHtml]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function findPlaceholder(target: HTMLElement): HTMLElement | null {
      if (target.dataset.placeholder) return target;
      return target.closest<HTMLElement>("[data-placeholder]");
    }

    function findEditable(target: HTMLElement): HTMLElement | null {
      if (target.dataset.editable === "true") return target;
      return target.closest<HTMLElement>("[data-editable='true']");
    }

    function startEditing(editableEl: HTMLElement) {
      const { section: sec, onDataChange: save } = propsRef.current;
      editableEl.contentEditable = "true";
      editingRef.current = editableEl;

      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableEl);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);

      editableEl.style.outline = "2px dashed #3B82F6";
      editableEl.style.outlineOffset = "2px";
      editableEl.style.borderRadius = "4px";

      const placeholderId = editableEl.dataset.placeholder;
      if (!placeholderId) return;

      const onBlur = () => {
        editableEl.contentEditable = "false";
        editableEl.style.outline = "";
        editableEl.style.outlineOffset = "";
        editableEl.style.borderRadius = "";
        editingRef.current = null;
        save(sec.section_id, placeholderId, editableEl.innerText.trim());
        editableEl.removeEventListener("blur", onBlur);
        editableEl.removeEventListener("keydown", onKey);
      };

      const onKey = (ke: KeyboardEvent) => {
        if (ke.key === "Enter" && !ke.shiftKey) { ke.preventDefault(); editableEl.blur(); }
        if (ke.key === "Escape") {
          editableEl.innerText = propsRef.current.section.data[placeholderId] || "";
          editableEl.blur();
        }
      };

      editableEl.addEventListener("blur", onBlur);
      editableEl.addEventListener("keydown", onKey);
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (editingRef.current) return;

      let placeholderEl = findPlaceholder(target);

      // placeholder가 없는 빈 영역 클릭 시 → 섹션 내 이미지 placeholder로 fallback
      if (!placeholderEl && container) {
        const imgEl = container.querySelector<HTMLElement>("[data-placeholder$='_image']");
        if (imgEl) placeholderEl = imgEl;
      }

      if (!placeholderEl || !placeholderEl.dataset.placeholder) return;

      const phId = placeholderEl.dataset.placeholder;
      const now = Date.now();

      if (now - lastClickRef.current.time < 350 && lastClickRef.current.phId === phId) {
        lastClickRef.current = { time: 0, phId: "" };
        const editableEl = findEditable(target);
        if (editableEl) { startEditing(editableEl); return; }
      }

      lastClickRef.current = { time: now, phId };

      const isImage = phId.endsWith("_image");
      const currentStyles: Record<string, string> = {};
      if (!isImage) {
        const computed = window.getComputedStyle(placeholderEl);
        currentStyles.fontFamily = computed.fontFamily;
        currentStyles.fontSize = computed.fontSize;
        currentStyles.fontWeight = computed.fontWeight;
        currentStyles.color = computed.color;
      }

      propsRef.current.onElementSelect?.({
        sectionId: propsRef.current.section.section_id,
        placeholderId: phId,
        type: isImage ? "image" : "text",
        currentStyles,
      });
    }

    container.addEventListener("click", handleClick);
    return () => { container.removeEventListener("click", handleClick); };
  }, []);

  return (
    <div ref={containerRef} className="section-block">
      <style dangerouslySetInnerHTML={{ __html: renderedCss }} />
      {overrideCss && <style dangerouslySetInnerHTML={{ __html: overrideCss }} />}
      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
    </div>
  );
}
