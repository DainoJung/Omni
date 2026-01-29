/**
 * html-to-image 변환 전에 폰트가 로딩되었는지 확인한다.
 * Next.js의 next/font가 이미 로딩하지만,
 * Canvas 변환 시 명시적으로 확인이 필요하다.
 */
export async function ensureFontsLoaded(): Promise<void> {
  await document.fonts.ready;
}
