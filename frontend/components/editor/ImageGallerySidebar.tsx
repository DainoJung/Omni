"use client";

import { memo, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

interface UploadedImage {
  url: string;
  type: "upload" | "bg_removed" | "background";
}

interface AiImage {
  sectionId: string;
  key: string;
  url: string;
}

interface ImageGallerySidebarProps {
  originalAiImages: AiImage[];
  uploadedImages: UploadedImage[];
  uploading: boolean;
  onApplyImage: (url: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgApplyPopup: (info: { url: string; x: number; y: number }) => void;
}

function ImageGallerySidebarInner({
  originalAiImages,
  uploadedImages,
  uploading,
  onApplyImage,
  onImageUpload,
  onBgApplyPopup,
}: ImageGallerySidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-3 flex flex-col h-full">
      <p className="text-xs text-text-secondary mb-3">이미지 추가</p>

      {/* Image Grid */}
      <div className="grid grid-cols-2 gap-2 auto-rows-min flex-1 overflow-y-auto">
        {/* AI 생성 이미지 */}
        {originalAiImages.map(({ sectionId, key, url }) => (
          <div
            key={`ai-${sectionId}-${key}`}
            className="relative rounded-lg overflow-hidden border border-border hover:border-accent/50 cursor-pointer transition-colors aspect-square"
            onClick={() => onApplyImage(url)}
          >
            <img src={url} alt={key} className="w-full h-full object-cover" loading="lazy" />
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `${key}_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(blobUrl);
                } catch {
                  toast.error("이미지 다운로드에 실패했습니다.");
                }
              }}
              className="absolute top-1.5 left-1.5 p-1 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
            >
              <Download size={12} className="text-text-primary" />
            </button>
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-accent text-white text-[10px] font-medium rounded shadow-sm">
              AI
            </span>
          </div>
        ))}
        {/* 업로드 및 배경 제거 이미지 */}
        {uploadedImages.map((img, index) => (
          <div
            key={`uploaded-${index}`}
            className="relative rounded-lg overflow-hidden border border-border hover:border-accent/50 cursor-pointer transition-colors aspect-square"
            onClick={(e) => {
              if (img.type === "background") {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onBgApplyPopup({ url: img.url, x: rect.right + 8, y: rect.top });
              } else {
                onApplyImage(img.url);
              }
            }}
          >
            <img
              src={img.url}
              alt={
                img.type === "bg_removed"
                  ? `누끼 ${index + 1}`
                  : img.type === "background"
                    ? `배경 ${index + 1}`
                    : `업로드 ${index + 1}`
              }
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(img.url);
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `${img.type === "bg_removed" ? "bg_removed" : img.type === "background" ? "background" : "uploaded"}_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(blobUrl);
                } catch {
                  toast.error("이미지 다운로드에 실패했습니다.");
                }
              }}
              className="absolute top-1.5 left-1.5 p-1 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
            >
              <Download size={12} className="text-text-primary" />
            </button>
            <span
              className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-white text-[10px] font-medium rounded shadow-sm ${
                img.type === "bg_removed"
                  ? "bg-purple-500"
                  : img.type === "background"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
            >
              {img.type === "bg_removed" ? "누끼" : img.type === "background" ? "배경" : "업로드"}
            </span>
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mt-3 w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <Upload size={16} />
            이미지 업로드
          </>
        )}
      </button>
    </div>
  );
}

export const ImageGallerySidebar = memo(ImageGallerySidebarInner);
