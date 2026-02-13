"use client";

import { memo, useRef } from "react";
import { Send, ImagePlus, X, Eraser, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RenderedSection } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  attachedImage?: { url: string; sectionId: string; placeholderId: string };
  imageVersions?: string[];
  sectionId?: string;
  placeholderId?: string;
}

interface ChatMessagesProps {
  sections: RenderedSection[];
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onSelectVariant: (sectionId: string, placeholderId: string, imageUrl: string) => void;
}

function ChatPanelInner({
  sections,
  chatMessages,
  chatLoading,
  chatEndRef,
  onSelectVariant,
}: ChatMessagesProps) {

  return (
    <>
      {/* Chat Messages */}
      {chatMessages.length > 0 && (
        <>
          <div className="h-px bg-border my-4" />
          <div className="space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex flex-col items-end gap-1.5">
                    {msg.attachedImage && (
                      <div className="w-16 h-16 rounded-lg border border-border overflow-hidden">
                        <img src={msg.attachedImage.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="bg-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]">
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="bg-bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[85%]">
                      <p className="text-sm text-text-primary">{msg.text}</p>
                    </div>
                    {msg.imageVersions && msg.imageVersions.length > 0 && msg.sectionId && msg.placeholderId && (
                      <div className="w-full">
                        <p className="text-xs text-text-secondary mb-2">
                          버전 선택 ({msg.imageVersions.length})
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {msg.imageVersions.map((url, vi) => {
                            const isLatest = vi === msg.imageVersions!.length - 1;
                            const isFirst = vi === 0;
                            const currentSec = sections.find((s) => s.section_id === msg.sectionId);
                            const isApplied = currentSec?.data[msg.placeholderId!] === url;
                            return (
                              <button
                                key={vi}
                                onClick={() => onSelectVariant(msg.sectionId!, msg.placeholderId!, url)}
                                className={`group relative rounded-lg overflow-hidden transition-colors ${
                                  isApplied
                                    ? "border-2 border-accent"
                                    : "border border-border hover:border-accent"
                                }`}
                              >
                                <img src={url} alt={`v${vi + 1}`} className="w-full aspect-square object-cover" />
                                <span
                                  className={`absolute bottom-0 inset-x-0 text-white text-[10px] py-0.5 text-center ${
                                    isApplied
                                      ? "bg-accent"
                                      : isFirst
                                        ? "bg-black/60"
                                        : isLatest
                                          ? "bg-blue-500/80"
                                          : "bg-black/50"
                                  }`}
                                >
                                  {isApplied ? "적용됨" : isFirst ? "원본" : `v${vi}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start gap-1.5">
                <div className="bg-bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-text-tertiary border-t-accent rounded-full animate-spin" />
                    <span className="text-sm text-text-secondary">이미지 생성중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </>
      )}

      {/* 빈 공간으로 채팅을 하단에 밀기 */}
      <div className="flex-1" />
    </>
  );
}

export const ChatMessages = memo(ChatPanelInner);

/* ────────────────────────── Chat Input ────────────────────────── */

interface ChatInputProps {
  chatMessage: string;
  chatAttachedImage: { url: string; sectionId: string; placeholderId: string } | null;
  chatLoading: boolean;
  bgRemoving: boolean;
  onChatMessageChange: (msg: string) => void;
  onChatSend: () => void;
  onRemoveBg: () => void;
  onClearAttachment: () => void;
  onFileAttach: (file: File) => void;
}

function ChatInputInner({
  chatMessage,
  chatAttachedImage,
  chatLoading,
  bgRemoving,
  onChatMessageChange,
  onChatSend,
  onRemoveBg,
  onClearAttachment,
  onFileAttach,
}: ChatInputProps) {
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-border bg-white p-4">
      <div
        className={`bg-bg-secondary rounded-lg border transition-colors duration-200 ${
          chatAttachedImage ? "border-accent" : "border-border"
        }`}
      >
        {/* 첨부 이미지 */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: chatAttachedImage ? "80px" : "0px",
            opacity: chatAttachedImage ? 1 : 0,
            padding: chatAttachedImage ? "10px 12px 0 12px" : "0 12px",
          }}
        >
          {chatAttachedImage && (
            <div className="flex items-start justify-between">
              <div className="relative group inline-block">
                <div className="w-14 h-14 rounded-lg border border-border overflow-hidden bg-white">
                  <img src={chatAttachedImage.url} alt="" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={onClearAttachment}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-text-secondary text-white rounded-full flex items-center justify-center hover:bg-text-primary transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
              <button
                onClick={onRemoveBg}
                disabled={bgRemoving || chatLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-tertiary hover:text-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bgRemoving ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>제거중...</span>
                  </>
                ) : (
                  <>
                    <Eraser size={12} />
                    <span>배경제거</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 텍스트 입력 */}
        <div className="px-3 pt-3 pb-1.5">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => onChatMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onChatSend();
              }
            }}
            placeholder={chatAttachedImage ? "이미지를 어떻게 편집할까요?" : "이미지를 클릭하여 AI로 수정해보세요."}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            disabled={chatLoading}
          />
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1.5">
          <div>
            <input
              ref={chatFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  toast.error("이미지 파일만 업로드할 수 있습니다.");
                  if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("파일 크기는 10MB 이하여야 합니다.");
                  if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                  return;
                }
                onFileAttach(file);
                if (chatFileInputRef.current) chatFileInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              <ImagePlus size={16} />
              <span>이미지 추가</span>
            </button>
          </div>
          <button
            onClick={onChatSend}
            className="p-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
            disabled={!chatMessage.trim() || !chatAttachedImage || chatLoading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ChatInput = memo(ChatInputInner);
