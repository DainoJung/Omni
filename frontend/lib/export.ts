import { toPng, toJpeg } from "html-to-image";
import { ensureFontsLoaded } from "./fonts";

export interface ExportOptions {
  format: "png" | "jpg";
  quality: 1 | 2 | 3;
  filename: string;
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * 외부/크로스오리진 이미지를 data URL로 변환하여
 * html-to-image가 캔버스에 그릴 수 있도록 한다.
 */
export async function inlineImages(root: HTMLElement): Promise<() => void> {
  const imgs = root.querySelectorAll("img");
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:")) return;

      originals.push({ img, src });

      try {
        const resp = await fetch(src, { mode: "cors" });
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch {
        // CORS 실패 시 transparent pixel로 대체
        img.src = TRANSPARENT_PIXEL;
      }
    })
  );

  // 복원 함수 반환
  return () => {
    for (const { img, src } of originals) {
      img.src = src;
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

  // 외부 이미지를 data URL로 인라인 변환
  const restoreImages = await inlineImages(element);

  try {
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
