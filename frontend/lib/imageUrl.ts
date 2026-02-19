const SUPABASE_STORAGE_HOST =
  "https://vphfowdnhjvefahkzkmg.supabase.co/storage/v1/";
const OBJECT_PREFIX = `${SUPABASE_STORAGE_HOST}object/public/`;
const RENDER_PREFIX = `${SUPABASE_STORAGE_HOST}render/image/public/`;

type ImagePreset = "thumbnail" | "editor" | "original";

const PRESETS: Record<Exclude<ImagePreset, "original">, { width: number; quality: number }> = {
  thumbnail: { width: 200, quality: 50 },
  editor: { width: 800, quality: 75 },
};

/**
 * Supabase /render/image/ 엔드포인트로 변환하여 서버사이드 리사이징 적용.
 * Pro 플랜에서 동작하며, Free 플랜에서는 SectionBlock의 onerror 핸들러가 원본으로 폴백.
 * 브라우저가 WebP 지원 시 자동 변환됨.
 */
export function optimizeImageUrl(url: string, preset: ImagePreset): string {
  if (!url || preset === "original") return url;
  if (!url.startsWith(OBJECT_PREFIX)) return url;
  // 누끼 제거된 투명 PNG는 render 엔드포인트에서 잘림 → 원본 사용
  if (url.includes("bg_removed")) return url;
  const base = url.split("?")[0];
  const path = base.slice(OBJECT_PREFIX.length);
  const p = PRESETS[preset];
  return `${RENDER_PREFIX}${path}?width=${p.width}&quality=${p.quality}`;
}

/** 원본 /object/public/ URL 복원 (쿼리파라미터 제거 + render→object 변환) */
export function toOriginalUrl(url: string): string {
  if (!url.includes(SUPABASE_STORAGE_HOST)) return url;
  const base = url.split("?")[0];
  return base.replace(RENDER_PREFIX, OBJECT_PREFIX);
}

/** render/image URL인지 확인 */
export function isRenderUrl(url: string): boolean {
  return url.includes(RENDER_PREFIX);
}
