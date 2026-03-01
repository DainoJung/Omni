/**
 * Simple object-based i18n for UI strings (ko/en).
 * No external library — MVP pragmatism.
 */

type Locale = "ko" | "en";

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Common
    "common.loading": "로딩 중...",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.delete": "삭제",
    "common.confirm": "확인",
    "common.next": "다음",
    "common.prev": "이전",
    "common.close": "닫기",

    // Auth
    "auth.login": "로그인",
    "auth.logout": "로그아웃",
    "auth.register": "회원가입",
    "auth.email": "이메일",
    "auth.password": "비밀번호",
    "auth.username": "사용자명",
    "auth.freeStart": "무료로 시작하기",

    // Landing
    "landing.title": "AI가 만드는\n상품 상세페이지",
    "landing.subtitle": "상품 URL 하나로 프리미엄 상세페이지를 자동 생성합니다.\nAI 분석, 다국어 지원, 원클릭 Export.",
    "landing.featureAnalysis": "AI 상품 분석",
    "landing.featureAnalysisDesc": "URL을 입력하면 AI가 상품을 분석하고 최적의 템플릿을 추천합니다.",
    "landing.featureMultilang": "다국어 지원",
    "landing.featureMultilangDesc": "한국어, 영어, 일본어, 중국어로 상세페이지를 생성할 수 있습니다.",
    "landing.featureExport": "원클릭 Export",
    "landing.featureExportDesc": "Amazon, Shopify, Coupang 등 마켓별 최적 사이즈로 내보내기합니다.",

    // Dashboard
    "dashboard.title": "내 프로젝트",
    "dashboard.newProject": "새 프로젝트",
    "dashboard.credits": "크레딧",
    "dashboard.totalProjects": "총 프로젝트",
    "dashboard.recentActivity": "최근 활동",
    "dashboard.noProjects": "아직 생성된 프로젝트가 없습니다.",
    "dashboard.createFirst": "첫 번째 프로젝트 만들기",

    // Product Input
    "input.title": "상품 상세페이지 만들기",
    "input.subtitle": "상품 URL을 입력하면 AI가 자동으로 분석하고 최적의 상세페이지를 생성합니다.",
    "input.urlTab": "URL 입력",
    "input.manualTab": "직접 입력",
    "input.urlLabel": "상품 URL",
    "input.urlPlaceholder": "https://www.amazon.com/dp/B09V3KXJPB",
    "input.urlHelp": "Amazon, Coupang, Shopify 등 상품 페이지 URL을 붙여넣으세요.",
    "input.analyze": "상품 분석하기",
    "input.analyzing": "분석 중...",
    "input.productName": "상품명",
    "input.description": "상품 설명",
    "input.brand": "브랜드",
    "input.price": "가격",
    "input.images": "상품 이미지",

    // Template
    "template.title": "템플릿 스타일 선택",
    "template.subtitle": "AI가 추천한 스타일이 강조 표시됩니다. 원하는 스타일을 선택하세요.",
    "template.aiRecommend": "AI 추천",

    // Settings
    "settings.title": "생성 설정",
    "settings.template": "템플릿",
    "settings.language": "생성 언어",
    "settings.generate": "AI 상세페이지 생성하기",
    "settings.generating": "생성 중...",

    // Editor
    "editor.generating": "AI 광고 콘텐츠 생성 중",
    "editor.generatingDesc": "입력하신 정보로 상세페이지를 생성하고 있습니다.",
    "editor.language": "생성 언어",
    "editor.templateStyle": "템플릿 스타일",
    "editor.regenerating": "콘텐츠 재생성 중...",
    "editor.inputInfo": "입력한 정보",
    "editor.undo": "실행 취소",
    "editor.redo": "다시 실행",

    // Export
    "export.title": "내보내기 설정",
    "export.preset": "마켓 프리셋",
    "export.format": "파일 형식",
    "export.quality": "품질 (배율)",
    "export.download": "이미지 내보내기",
    "export.success": "이미지가 다운로드되었습니다.",
    "export.error": "이미지 출력에 실패했습니다.",
  },

  en: {
    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.next": "Next",
    "common.prev": "Back",
    "common.close": "Close",

    // Auth
    "auth.login": "Log In",
    "auth.logout": "Log Out",
    "auth.register": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.username": "Username",
    "auth.freeStart": "Get Started Free",

    // Landing
    "landing.title": "AI-Powered\nProduct Detail Pages",
    "landing.subtitle": "Generate premium product pages from a single URL.\nAI analysis, multilingual support, one-click export.",
    "landing.featureAnalysis": "AI Product Analysis",
    "landing.featureAnalysisDesc": "Enter a URL and AI analyzes your product and recommends the optimal template.",
    "landing.featureMultilang": "Multilingual",
    "landing.featureMultilangDesc": "Generate product detail pages in Korean, English, Japanese, and Chinese.",
    "landing.featureExport": "One-Click Export",
    "landing.featureExportDesc": "Export optimized images for Amazon, Shopify, Coupang, and more.",

    // Dashboard
    "dashboard.title": "My Projects",
    "dashboard.newProject": "New Project",
    "dashboard.credits": "Credits",
    "dashboard.totalProjects": "Total Projects",
    "dashboard.recentActivity": "Recent Activity",
    "dashboard.noProjects": "No projects yet.",
    "dashboard.createFirst": "Create Your First Project",

    // Product Input
    "input.title": "Create Product Detail Page",
    "input.subtitle": "Enter a product URL and AI will automatically analyze and generate the optimal detail page.",
    "input.urlTab": "Enter URL",
    "input.manualTab": "Manual Input",
    "input.urlLabel": "Product URL",
    "input.urlPlaceholder": "https://www.amazon.com/dp/B09V3KXJPB",
    "input.urlHelp": "Paste a product page URL from Amazon, Coupang, Shopify, etc.",
    "input.analyze": "Analyze Product",
    "input.analyzing": "Analyzing...",
    "input.productName": "Product Name",
    "input.description": "Description",
    "input.brand": "Brand",
    "input.price": "Price",
    "input.images": "Product Images",

    // Template
    "template.title": "Choose Template Style",
    "template.subtitle": "AI-recommended style is highlighted. Select your preferred style.",
    "template.aiRecommend": "AI Pick",

    // Settings
    "settings.title": "Generation Settings",
    "settings.template": "Template",
    "settings.language": "Language",
    "settings.generate": "Generate Detail Page",
    "settings.generating": "Generating...",

    // Editor
    "editor.generating": "Generating AI Content",
    "editor.generatingDesc": "Creating your product detail page from the input data.",
    "editor.language": "Language",
    "editor.templateStyle": "Template Style",
    "editor.regenerating": "Regenerating content...",
    "editor.inputInfo": "Input Data",
    "editor.undo": "Undo",
    "editor.redo": "Redo",

    // Export
    "export.title": "Export Settings",
    "export.preset": "Marketplace Preset",
    "export.format": "File Format",
    "export.quality": "Quality (Scale)",
    "export.download": "Export Image",
    "export.success": "Image downloaded successfully.",
    "export.error": "Failed to export image.",
  },
};

let currentLocale: Locale = "ko";

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("ui_locale", locale);
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("ui_locale") as Locale | null;
    if (stored && translations[stored]) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

export function t(key: string): string {
  return translations[currentLocale]?.[key] || translations.ko[key] || key;
}

export function tWith(locale: Locale, key: string): string {
  return translations[locale]?.[key] || key;
}
