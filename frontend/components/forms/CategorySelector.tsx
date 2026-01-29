"use client";

const CATEGORIES = [
  { value: "food", label: "식품" },
  { value: "fashion", label: "패션" },
  { value: "beauty", label: "뷰티" },
  { value: "electronics", label: "가전" },
  { value: "etc", label: "기타" },
];

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary">
        카테고리
      </label>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value === value ? "" : cat.value)}
            className={`px-4 py-2 text-sm rounded-sm border transition-colors ${
              cat.value === value
                ? "bg-accent text-white border-accent"
                : "bg-white text-text-primary border-border hover:border-text-secondary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
