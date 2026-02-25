"use client";

// --- Section Wireframe Components ---

function HeroBanner() {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="hero_banner" />
      <div className="w-full aspect-[4/3] bg-gray-200 rounded" />
      <div className="space-y-1 px-1">
        <div className="h-3 bg-gray-300 rounded-full w-3/4" />
        <div className="h-2 bg-gray-300 rounded-full w-full" />
        <div className="h-2 bg-gray-300 rounded-full w-5/6" />
      </div>
    </div>
  );
}

function FeatureBadges() {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="feature_badges" />
      <div className="flex justify-center gap-3 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-1.5 bg-gray-300 rounded-full w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Description() {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="description" />
      <div className="px-1 space-y-1.5">
        <div className="h-3 bg-gray-300 rounded-full w-1/2" />
        <div className="h-2 bg-gray-300 rounded-full w-full" />
        <div className="h-2 bg-gray-300 rounded-full w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
          <div className="h-1.5 bg-gray-300 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

function FeaturePoint({ index }: { index: number }) {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="feature_point" count={index + 1} />
      <div className="px-1 space-y-1">
        <div className="h-1.5 bg-gray-300 rounded-full w-12" />
        <div className="h-3 bg-gray-300 rounded-full w-2/3" />
        <div className="h-2 bg-gray-300 rounded-full w-full" />
        <div className="h-2 bg-gray-300 rounded-full w-4/5" />
      </div>
      <div className="w-full aspect-[16/9] bg-gray-200 rounded" />
    </div>
  );
}

function PromoHero() {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="promo_hero" />
      <div className="w-full aspect-[3/4] bg-gray-200 rounded" />
      <div className="px-1 space-y-1">
        <div className="h-3.5 bg-gray-300 rounded-full w-3/4" />
        <div className="h-2 bg-gray-300 rounded-full w-1/3" />
      </div>
    </div>
  );
}

function ProductCard({ index }: { index: number }) {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="product_card" count={index + 1} />
      <div className="w-full aspect-square bg-gray-200 rounded" />
      <div className="px-1 space-y-1">
        <div className="h-1.5 bg-gray-300 rounded-full w-14" />
        <div className="h-2.5 bg-gray-300 rounded-full w-3/4" />
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-gray-400 font-mono">₩</span>
          <div className="h-2.5 bg-gray-300 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

function GourmetHero() {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="gourmet_hero" />
      <div className="w-full aspect-[16/9] bg-gray-200 rounded" />
      <div className="px-1 space-y-1">
        <div className="h-3.5 bg-gray-300 rounded-full w-2/3" />
        <div className="h-2 bg-gray-300 rounded-full w-1/3" />
      </div>
    </div>
  );
}

function GourmetRestaurant({ index }: { index: number }) {
  return (
    <div className="space-y-1.5">
      <SectionLabel name="gourmet_restaurant" count={index + 1} />
      <div className="w-full aspect-[3/2] bg-gray-200 rounded" />
      <div className="px-1 space-y-1">
        <div className="h-3 bg-gray-300 rounded-full w-1/2" />
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 aspect-square bg-gray-200 rounded" />
        <div className="flex-1 aspect-square bg-gray-200 rounded" />
      </div>
      <div className="px-1 space-y-0.5">
        <div className="h-1.5 bg-gray-300 rounded-full w-3/4" />
        <div className="h-1.5 bg-gray-300 rounded-full w-2/3" />
      </div>
    </div>
  );
}

// --- Helpers ---

function SectionLabel({ name, count }: { name: string; count?: number }) {
  return (
    <div className="text-[9px] text-gray-400 font-mono leading-none px-1">
      {name}
      {count != null && <span className="ml-0.5 text-gray-300">#{count}</span>}
    </div>
  );
}

// --- Template Configurations ---

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

// --- Exported Component ---

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
