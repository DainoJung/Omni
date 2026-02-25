"use client";

// --- Helpers ---

function SectionLabel({ name, count }: { name: string; count?: number }) {
  return (
    <div className="text-[9px] text-gray-400 font-mono leading-none px-1 mb-1">
      {name}
      {count != null && <span className="ml-0.5 text-gray-300">#{count}</span>}
    </div>
  );
}

function TextBar({ w = "w-full", h = "h-1.5", color = "bg-gray-300" }: { w?: string; h?: string; color?: string }) {
  return <div className={`${h} ${color} rounded-full ${w}`} />;
}

function ImageBox({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded ${className}`} />;
}

// ─── hero_banner ─────────────────────────────────────────
// 실제: 전체 배경 이미지 + 그라데이션 오버레이 + 텍스트 오버레이 (category, title, subtitle)
// 높이 비율: spacer-top(122) + text + spacer-bottom(984) → 약 860:1200

function HeroBanner() {
  return (
    <div>
      <SectionLabel name="hero_banner" />
      <div className="relative bg-gray-700 rounded overflow-hidden" style={{ aspectRatio: "860/1200" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        <div className="absolute top-[8%] left-0 right-0 flex flex-col items-center gap-1.5 px-4">
          <TextBar w="w-1/3" h="h-2" color="bg-white/50" />
          <TextBar w="w-3/4" h="h-3.5" color="bg-blue-300/70" />
          <TextBar w="w-1/2" h="h-2" color="bg-white/50" />
        </div>
      </div>
    </div>
  );
}

// ─── feature_badges ──────────────────────────────────────
// 실제: 3열 가로 배치, 열 사이 border-right, 각 열에 체크 아이콘(72x72) + 텍스트

function FeatureBadges() {
  return (
    <div>
      <SectionLabel name="feature_badges" />
      <div className="flex py-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex-1 flex flex-col items-center gap-1.5 py-1 ${
              i < 2 ? "border-r border-gray-300" : ""
            }`}
          >
            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
            <TextBar w="w-10" h="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── description ─────────────────────────────────────────
// 실제: 중앙정렬 세로 레이아웃
// title(main + accent 두 줄) → body → 해시태그 pill 뱃지들 → 큰 원형 이미지(600x600, accent 테두리)

function Description() {
  return (
    <div>
      <SectionLabel name="description" />
      <div className="flex flex-col items-center gap-2.5 px-2 py-4">
        {/* Title: main + accent */}
        <div className="flex flex-col items-center gap-0.5">
          <TextBar w="w-28" h="h-2.5" />
          <TextBar w="w-20" h="h-2.5" color="bg-blue-200" />
        </div>
        {/* Body text */}
        <div className="flex flex-col items-center gap-0.5 w-full">
          <TextBar w="w-full" />
          <TextBar w="w-4/5" />
        </div>
        {/* Hashtag pills */}
        <div className="flex gap-1 flex-wrap justify-center">
          {["w-10", "w-12", "w-9", "w-11"].map((w, i) => (
            <div key={i} className={`h-3.5 ${w} rounded-full border border-gray-300`} />
          ))}
        </div>
        {/* Large circular image with accent border */}
        <div className="w-20 h-20 rounded-full bg-gray-200 border-[3px] border-blue-300 mt-1" />
      </div>
    </div>
  );
}

// ─── feature_point ───────────────────────────────────────
// 실제: 중앙정렬 세로 레이아웃
// 검정 pill 뱃지 → title(main + accent) → body(중앙, 좁은 너비) → 와이드 이미지(860x675)

function FeaturePoint({ index }: { index: number }) {
  return (
    <div>
      <SectionLabel name="feature_point" count={index + 1} />
      <div className="flex flex-col items-center gap-2.5 py-4">
        {/* Pill badge */}
        <div className="h-4 w-16 bg-gray-700 rounded-full" />
        {/* Title: main + accent */}
        <div className="flex flex-col items-center gap-0.5">
          <TextBar w="w-28" h="h-2.5" />
          <TextBar w="w-20" h="h-2.5" color="bg-blue-200" />
        </div>
        {/* Body text (narrower) */}
        <div className="flex flex-col items-center gap-0.5 w-3/4">
          <TextBar w="w-full" />
          <TextBar w="w-4/5" />
        </div>
        {/* Wide product image */}
        <ImageBox className="w-full aspect-[860/675]" />
      </div>
    </div>
  );
}

// ─── promo_hero ──────────────────────────────────────────
// 실제: 상단 텍스트 영역(단색 bg) + 하단 이미지 영역(430px)
// 텍스트: script(cursive, accent) → category(bold) → subtitle → location

function PromoHero() {
  return (
    <div>
      <SectionLabel name="promo_hero" />
      {/* Text area with solid bg */}
      <div className="bg-gray-100 rounded-t px-4 py-5 flex flex-col items-center gap-1.5">
        <TextBar w="w-2/3" h="h-3" color="bg-gray-300/60" />
        <TextBar w="w-3/4" h="h-3" color="bg-gray-400" />
        <TextBar w="w-1/2" h="h-1.5" />
        <TextBar w="w-1/3" h="h-1.5" color="bg-gray-200" />
      </div>
      {/* Image area */}
      <ImageBox className="w-full aspect-[2/1] rounded-t-none rounded-b" />
    </div>
  );
}

// ─── product_card ────────────────────────────────────────
// 실제: **가로 레이아웃** (flex row) — 이미지(420x420) + 정보(brand, name, price, note)
// data-layout="right"이면 좌우 반전 (홀수 인덱스)

function ProductCard({ index }: { index: number }) {
  const reversed = index % 2 === 1;
  return (
    <div>
      <SectionLabel name="product_card" count={index + 1} />
      <div className={`flex gap-2.5 items-center px-1 py-2 ${reversed ? "flex-row-reverse" : ""}`}>
        {/* Product image */}
        <ImageBox className="w-[44%] aspect-square shrink-0" />
        {/* Info */}
        <div className="flex-1 space-y-1.5">
          <TextBar w="w-12" h="h-1.5" />
          <TextBar w="w-full" h="h-2" />
          <div className="flex items-center gap-0.5">
            <span className="text-[8px] text-gray-400 font-mono">₩</span>
            <TextBar w="w-14" h="h-2" />
          </div>
          <TextBar w="w-3/4" h="h-1" color="bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ─── gourmet_hero ────────────────────────────────────────
// 실제: **이미지 없음** — 순수 텍스트 섹션
// title → subtitle → divider(40px) → tag(소문자, accent) → heading(bold) → deco(큰 글자, accent) → desc

function GourmetHero() {
  return (
    <div>
      <SectionLabel name="gourmet_hero" />
      <div className="flex flex-col items-center gap-2 py-4 px-3">
        <TextBar w="w-2/3" h="h-2" />
        <TextBar w="w-1/2" h="h-2" />
        <div className="w-6 h-px bg-amber-800/40 my-0.5" />
        <TextBar w="w-10" h="h-1" color="bg-amber-800/30" />
        <TextBar w="w-3/4" h="h-2.5" color="bg-gray-400" />
        <TextBar w="w-1/3" h="h-5" color="bg-amber-800/25" />
        <div className="flex flex-col items-center gap-0.5 w-full">
          <TextBar w="w-full" />
          <TextBar w="w-4/5" />
        </div>
      </div>
    </div>
  );
}

// ─── gourmet_restaurant ──────────────────────────────────
// 실제: 카드(bg #f5f6f8, rounded, shadow)
// travel tag → travel desc → scene 이미지(오버레이: 가게명+층수) → 설명
// → 메뉴 2개 나란히(이미지+이름+설명) → 이벤트(라인+타이틀+라인) → 이벤트 항목 2개

function GourmetRestaurant({ index }: { index: number }) {
  return (
    <div>
      <SectionLabel name="gourmet_restaurant" count={index + 1} />
      <div className="bg-gray-50 rounded-lg p-2.5 space-y-2 shadow-sm">
        {/* Travel tag + desc */}
        <div className="flex flex-col items-center gap-0.5">
          <TextBar w="w-12" h="h-1" color="bg-amber-800/30" />
          <TextBar w="w-3/4" />
        </div>
        {/* Scene image with name overlay */}
        <div className="relative w-full aspect-[5/3] bg-gray-200 rounded-md overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-1.5 left-2 flex items-baseline gap-1">
            <TextBar w="w-12" h="h-2" color="bg-white/80" />
            <TextBar w="w-6" h="h-1.5" color="bg-white/50" />
          </div>
        </div>
        {/* Restaurant desc */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <TextBar w="w-full" />
          <TextBar w="w-3/4" />
        </div>
        {/* 2 food items side by side */}
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <ImageBox className="w-full aspect-square" />
              <TextBar w="w-3/4" h="h-1.5" />
              <TextBar w="w-full" h="h-1" color="bg-gray-200" />
            </div>
          ))}
        </div>
        {/* Event divider line */}
        <div className="flex items-center gap-1 px-2">
          <div className="flex-1 h-px bg-amber-800/30" />
          <TextBar w="w-8" h="h-1" color="bg-amber-800/20" />
          <div className="flex-1 h-px bg-amber-800/30" />
        </div>
        {/* Event items */}
        <div className="flex flex-col items-center gap-0.5 px-3">
          <TextBar w="w-3/4" h="h-1" color="bg-gray-200" />
          <TextBar w="w-2/3" h="h-1" color="bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ─── Template Configurations ─────────────────────────────

const TEMPLATE_SECTIONS: Record<string, React.ReactNode[]> = {
  product_detail: [
    <HeroBanner key="hero" />,
    <FeatureBadges key="badges" />,
    <Description key="desc" />,
    <FeaturePoint key="fp1" index={0} />,
    <FeaturePoint key="fp2" index={1} />,
    <FeaturePoint key="fp3" index={2} />,
  ],
  promotion: [
    <PromoHero key="hero" />,
    <ProductCard key="pc1" index={0} />,
    <ProductCard key="pc2" index={1} />,
    <ProductCard key="pc3" index={2} />,
  ],
  gourmet: [
    <GourmetHero key="hero" />,
    <GourmetRestaurant key="gr1" index={0} />,
    <GourmetRestaurant key="gr2" index={1} />,
  ],
};

// ─── Exported Component ──────────────────────────────────

interface TemplateWireframeProps {
  templateId: string;
}

export function TemplateWireframe({ templateId }: TemplateWireframeProps) {
  const sections = TEMPLATE_SECTIONS[templateId];
  if (!sections) return null;

  return (
    <div className="space-y-4 p-3">
      {sections.map((section, i) => (
        <div key={i}>{section}</div>
      ))}
    </div>
  );
}
