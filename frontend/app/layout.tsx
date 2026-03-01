import type { Metadata } from "next";
import {
  Noto_Sans_KR,
  Noto_Serif_KR,
  Playfair_Display,
  Cormorant_Garamond,
  Montserrat,
  Raleway,
  Libre_Baskerville,
  Bebas_Neue,
} from "next/font/google";
import { Toaster } from "sonner";
import { ClientLayout } from "@/components/auth/ClientLayout";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-raleway",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omni - 신세계백화점 POP 자동 생성",
  description: "AI 기반 POP 자동 생성 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} ${notoSerifKR.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} ${montserrat.variable} ${raleway.variable} ${libreBaskerville.variable} ${bebasNeue.variable} font-sans antialiased bg-white text-text-primary`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
