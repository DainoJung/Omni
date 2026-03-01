import { ensureFontsLoaded } from "./fonts";
import { toOriginalUrl } from "./imageUrl";

export interface ExportOptions {
  format: "png" | "jpg";
  quality: 1 | 2 | 3;
  filename: string;
}

export interface PresetExportOptions extends ExportOptions {
  preset?: string;
  targetWidth?: number;
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// 이미지 data URL 캐시 (같은 URL 중복 fetch 방지, LRU 방식 최대 50개)
const MAX_CACHE_SIZE = 50;
const imageDataUrlCache = new Map<string, string>();

export function clearImageCache() {
  imageDataUrlCache.clear();
}

async function fetchAsDataUrl(src: string): Promise<string> {
  const cached = imageDataUrlCache.get(src);
  if (cached) return cached;

  const resp = await fetch(src, { mode: "cors" });
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // LRU eviction
  if (imageDataUrlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = imageDataUrlCache.keys().next().value;
    if (firstKey !== undefined) imageDataUrlCache.delete(firstKey);
  }
  imageDataUrlCache.set(src, dataUrl);
  return dataUrl;
}

/**
 * 외부/크로스오리진 이미지를 data URL로 변환하여
 * html-to-image가 캔버스에 그릴 수 있도록 한다.
 *
 * @param forExport true이면 원본 URL(파라미터 제거)로 fetch → 다운로드 품질 보장
 *                  false(기본)이면 현재 src를 그대로 fetch → 썸네일/프리뷰용 빠른 처리
 */
export async function inlineImages(
  root: HTMLElement,
  options?: { forExport?: boolean }
): Promise<() => void> {
  const forExport = options?.forExport ?? false;
  const imgs = root.querySelectorAll("img");
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:")) return;

      originals.push({ img, src });

      try {
        // 내보내기: 원본 풀사이즈 fetch / 썸네일: 현재 (최적화된) src 그대로
        const fetchUrl = forExport ? toOriginalUrl(src) : src;
        img.src = await fetchAsDataUrl(fetchUrl);
      } catch {
        // CORS 실패 시 transparent pixel로 대체
        img.src = TRANSPARENT_PIXEL;
      }
    })
  );

  // CSS background-image URL도 data URL로 인라인 (배경 레이어 요소)
  const bgLayers = root.querySelectorAll<HTMLElement>("[data-bg-layer]");
  const bgOriginals: { el: HTMLElement; bgImage: string }[] = [];

  await Promise.all(
    Array.from(bgLayers).map(async (el) => {
      const bgImage = el.style.backgroundImage;
      if (!bgImage || !bgImage.startsWith("url(")) return;
      const match = bgImage.match(/url\(["']?(.+?)["']?\)/);
      if (!match || match[1].startsWith("data:")) return;

      bgOriginals.push({ el, bgImage });

      try {
        const fetchUrl = forExport ? toOriginalUrl(match[1]) : match[1];
        const dataUrl = await fetchAsDataUrl(fetchUrl);
        el.style.backgroundImage = `url(${dataUrl})`;
      } catch {
        // CORS 실패 시 원본 유지
      }
    })
  );

  // 복원 함수 반환
  return () => {
    for (const { img, src } of originals) {
      img.src = src;
    }
    for (const { el, bgImage } of bgOriginals) {
      el.style.backgroundImage = bgImage;
    }
  };
}

/**
 * html-to-image가 CSS opacity/filter를 제대로 캡처하지 못하는 문제 해결.
 * 배경 레이어의 opacity와 brightness를 실제 색상값으로 베이킹한다.
 * - 단색 배경: rgba 알파 + brightness 곱연산으로 최종 색상 계산
 * - 이미지 배경: 반투명 오버레이로 brightness/opacity 시뮬레이션
 */
function bakeBgLayerEffects(root: HTMLElement): () => void {
  const layers = root.querySelectorAll<HTMLElement>("[data-bg-layer]");
  const originals: { el: HTMLElement; styles: Record<string, string> }[] = [];

  layers.forEach((el) => {
    const opacity = parseFloat(el.style.opacity || "1");
    const filterMatch = el.style.filter?.match(/brightness\(([\d.]+)\)/);
    const brightness = filterMatch ? parseFloat(filterMatch[1]) : 1;

    // opacity와 brightness 모두 기본값이면 처리 불필요
    if (opacity === 1 && brightness === 1) return;

    originals.push({
      el,
      styles: {
        opacity: el.style.opacity,
        filter: el.style.filter,
        backgroundColor: el.style.backgroundColor,
      },
    });

    const bgColor = el.style.backgroundColor;
    const hasImage = el.style.backgroundImage && el.style.backgroundImage !== "none";

    if (!hasImage && bgColor) {
      // 단색 배경: opacity + brightness를 rgba로 베이킹
      const m = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const hexM = bgColor.match(/^#([0-9a-fA-F]{6})$/);
      let r = 0, g = 0, b = 0;
      if (m) {
        r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
      } else if (hexM) {
        r = parseInt(hexM[1].slice(0, 2), 16);
        g = parseInt(hexM[1].slice(2, 4), 16);
        b = parseInt(hexM[1].slice(4, 6), 16);
      }
      // brightness 적용 후 opacity를 alpha로
      r = Math.min(255, Math.round(r * brightness));
      g = Math.min(255, Math.round(g * brightness));
      b = Math.min(255, Math.round(b * brightness));
      el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      el.style.opacity = "1";
      el.style.filter = "none";
    } else if (hasImage) {
      // 이미지 배경: opacity는 유지하되 brightness를 오버레이로 시뮬레이션
      // html-to-image는 opacity는 처리 가능하지만 filter는 불안정
      if (brightness < 1) {
        // 어둡게: 검정 오버레이 추가
        const darkAlpha = 1 - brightness;
        el.style.filter = "none";
        el.dataset.exportOverlay = "true";
        const overlay = document.createElement("div");
        overlay.dataset.bgOverlayExport = "true";
        overlay.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,${darkAlpha});pointer-events:none;`;
        el.appendChild(overlay);
      } else if (brightness > 1) {
        // 밝게: 흰색 오버레이 추가
        const lightAlpha = brightness - 1;
        el.style.filter = "none";
        el.dataset.exportOverlay = "true";
        const overlay = document.createElement("div");
        overlay.dataset.bgOverlayExport = "true";
        overlay.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,${Math.min(1, lightAlpha)});pointer-events:none;`;
        el.appendChild(overlay);
      }
    }
  });

  return () => {
    for (const { el, styles } of originals) {
      el.style.opacity = styles.opacity;
      el.style.filter = styles.filter;
      el.style.backgroundColor = styles.backgroundColor;
      delete el.dataset.exportOverlay;
      // 임시 오버레이 제거
      el.querySelectorAll("[data-bg-overlay-export]").forEach((o) => o.remove());
    }
  };
}

export async function exportImage(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  // 폰트 로딩 확인
  await ensureFontsLoaded();

  // 렌더링 안정화 대기
  await new Promise((r) => setTimeout(r, 200));

  // 외부 이미지를 data URL로 인라인 변환 (원본 품질)
  const restoreImages = await inlineImages(element, { forExport: true });

  // 배경 레이어의 opacity/brightness를 실제 색상으로 베이킹
  const restoreBgEffects = bakeBgLayerEffects(element);

  try {
    const { toPng, toJpeg } = await import("html-to-image");
    const exportFn = options.format === "jpg" ? toJpeg : toPng;
    const mimeParams = options.format === "jpg" ? { quality: 0.92 } : {};

    const dataUrl = await exportFn(element, {
      pixelRatio: options.quality,
      cacheBust: true,
      skipAutoScale: true,
      imagePlaceholder: TRANSPARENT_PIXEL,
      ...mimeParams,
    });

    const link = document.createElement("a");
    link.download = `${options.filename}.${options.format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // 원본 스타일 복원
    restoreBgEffects();
    restoreImages();
  }
}

/**
 * Export with marketplace preset width scaling.
 * Temporarily adjusts the element width before capturing.
 */
export async function exportWithPreset(
  element: HTMLElement,
  options: PresetExportOptions
): Promise<void> {
  const PRESET_WIDTHS: Record<string, number> = {
    amazon: 970,
    shopify: 2048,
    coupang: 780,
    general: 860,
  };

  const targetWidth = options.targetWidth || PRESET_WIDTHS[options.preset || "general"] || 860;
  const currentWidth = element.offsetWidth;

  // If target width differs, scale the element temporarily
  if (targetWidth !== currentWidth) {
    const scale = targetWidth / currentWidth;
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;
    const originalWidth = element.style.width;

    element.style.transformOrigin = "top left";
    element.style.transform = `scale(${scale})`;
    element.style.width = `${currentWidth}px`;

    try {
      await exportImage(element, {
        format: options.format,
        quality: options.quality,
        filename: options.filename,
      });
    } finally {
      element.style.transform = originalTransform;
      element.style.transformOrigin = originalTransformOrigin;
      element.style.width = originalWidth;
    }
  } else {
    await exportImage(element, options);
  }
}
