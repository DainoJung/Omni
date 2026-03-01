"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ArrowRight, Sparkles, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      router.replace("/dashboard");
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  // Not authenticated — landing page
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-10">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Omni" width={35} height={35} />
          <span className="text-2xl font-bold">Omni</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
            로그인
          </Button>
          <Button size="sm" onClick={() => router.push("/register")}>
            무료 시작하기
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary leading-tight mb-6">
            AI가 만드는<br />
            상품 상세페이지
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
            상품 URL 하나로 프리미엄 상세페이지를 자동 생성합니다.
            AI 분석, 다국어 지원, 원클릭 Export.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => router.push("/register")}>
              무료로 시작하기
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="border border-border rounded-sm p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-accent" />
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-2">AI 상품 분석</h3>
              <p className="text-xs text-text-tertiary">
                URL을 입력하면 AI가 상품을 분석하고 최적의 템플릿을 추천합니다.
              </p>
            </div>
            <div className="border border-border rounded-sm p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe size={24} className="text-accent" />
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-2">다국어 지원</h3>
              <p className="text-xs text-text-tertiary">
                한국어, 영어, 일본어, 중국어로 상세페이지를 생성할 수 있습니다.
              </p>
            </div>
            <div className="border border-border rounded-sm p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-accent" />
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-2">원클릭 Export</h3>
              <p className="text-xs text-text-tertiary">
                Amazon, Shopify, Coupang 등 마켓별 최적 사이즈로 내보내기합니다.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
