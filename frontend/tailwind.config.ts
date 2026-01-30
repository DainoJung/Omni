import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // 관리자 UI
        border: "#DEE2E6",
        "border-focus": "#000000",
        "text-primary": "#212529",
        "text-secondary": "#868E96",
        "text-tertiary": "#ADB5BD",
        accent: "#000000",
        "accent-hover": "#343A40",
        success: "#2B8A3E",
        warning: "#E67700",
        error: "#C92A2A",
        "bg-secondary": "#F8F9FA",
        "bg-tertiary": "#F1F3F5",

        // 식품 템플릿
        "tpl-food-bg": "#FFFDF7",
        "tpl-food-primary": "#8B4513",
        "tpl-food-secondary": "#D4A574",
        "tpl-food-accent": "#C41E3A",
        "tpl-food-text": "#3D2B1F",
        "tpl-food-divider": "#E8D5B7",

        // 패션 템플릿
        "tpl-fashion-bg": "#FFFFFF",
        "tpl-fashion-primary": "#000000",
        "tpl-fashion-secondary": "#1A1A1A",
        "tpl-fashion-accent": "#B8860B",
        "tpl-fashion-text": "#333333",
        "tpl-fashion-divider": "#E0E0E0",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif-kr)", "serif"],
        sans: ["var(--font-noto-sans-kr)", "sans-serif"],
        playfair: ["var(--font-playfair)", "serif"],
        cormorant: ["var(--font-cormorant)", "serif"],
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        raleway: ["var(--font-raleway)", "sans-serif"],
        "libre-baskerville": ["var(--font-libre-baskerville)", "serif"],
        "bebas-neue": ["var(--font-bebas-neue)", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
        md: "0 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
