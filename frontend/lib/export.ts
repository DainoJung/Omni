import { toPng, toJpeg } from "html-to-image";
import { ensureFontsLoaded } from "./fonts";

export interface ExportOptions {
  format: "png" | "jpg";
  quality: 1 | 2 | 3;
  filename: string;
}

export async function exportImage(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  // 폰트 로딩 확인
  await ensureFontsLoaded();

  // 렌더링 안정화 대기
  await new Promise((r) => setTimeout(r, 200));

  const exportFn = options.format === "jpg" ? toJpeg : toPng;
  const mimeParams = options.format === "jpg" ? { quality: 0.92 } : {};

  const dataUrl = await exportFn(element, {
    pixelRatio: options.quality,
    cacheBust: true,
    skipAutoScale: true,
    ...mimeParams,
  });

  const link = document.createElement("a");
  link.download = `${options.filename}.${options.format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
