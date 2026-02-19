import { ensureFontsLoaded } from "./fonts";
import { toOriginalUrl } from "./imageUrl";

export interface ExportOptions {
  format: "png" | "jpg";
  quality: 1 | 2 | 3;
  filename: string;
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
    // 원본 src 복원
    restoreImages();
  }
}
