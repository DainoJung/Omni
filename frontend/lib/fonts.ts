/**
 * 하이브리드 동적 폰트 시스템
 * - 큐레이션 폰트: next/font/google 프리로드 → CSS 변수로 즉시 적용
 * - 비큐레이션 폰트: Google Fonts API로 런타임 동적 로드
 */

/** 큐레이션 폰트 키 → CSS variable 매핑 */
export const CURATED_FONTS: Record<string, string> = {
  "noto-sans-kr": "var(--font-noto-sans-kr)",
  "noto-serif-kr": "var(--font-noto-serif-kr)",
  playfair: "var(--font-playfair)",
  cormorant: "var(--font-cormorant)",
  montserrat: "var(--font-montserrat)",
  raleway: "var(--font-raleway)",
  "libre-baskerville": "var(--font-libre-baskerville)",
  "bebas-neue": "var(--font-bebas-neue)",
};

const loadedFonts = new Set<string>();

/** Google Fonts CSS API로 동적 로드 (중복 방지) */
export function loadGoogleFont(fontName: string): void {
  if (typeof document === "undefined") return;
  const key = fontName.toLowerCase();
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  const family = fontName.replace(/\s+/g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/** 폰트 키를 CSS font-family 값으로 변환 */
export function resolveFontFamily(fontFamily?: string): {
  css: string;
  needsLoad: boolean;
} {
  if (!fontFamily) {
    return { css: CURATED_FONTS["noto-sans-kr"], needsLoad: false };
  }

  const key = fontFamily.toLowerCase().replace(/\s+/g, "-");
  if (CURATED_FONTS[key]) {
    return { css: CURATED_FONTS[key], needsLoad: false };
  }

  // 비큐레이션 폰트: 이름 그대로 반환, 런타임 로드 필요
  return { css: `"${fontFamily}", sans-serif`, needsLoad: true };
}

/**
 * html-to-image 변환 전에 폰트가 로딩되었는지 확인한다.
 * Next.js의 next/font가 이미 로딩하지만,
 * Canvas 변환 시 명시적으로 확인이 필요하다.
 */
export async function ensureFontsLoaded(): Promise<void> {
  await document.fonts.ready;
}
