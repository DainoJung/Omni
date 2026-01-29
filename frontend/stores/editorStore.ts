import { create } from "zustand";
import type { GeneratedContent, EditHistoryEntry } from "@/types";

interface EditorState {
  content: GeneratedContent | null;
  history: GeneratedContent[];
  historyIndex: number;

  // Actions
  setContent: (content: GeneratedContent) => void;
  updateText: (field: string, value: string) => void;
  updateImage: (field: string, storagePath: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: null,
  history: [],
  historyIndex: -1,

  setContent: (content) => {
    set({
      content,
      history: [content],
      historyIndex: 0,
    });
  },

  updateText: (field, value) => {
    const { content, history, historyIndex } = get();
    if (!content) return;

    const newTexts = { ...content.texts, [field]: value };
    const newContent: GeneratedContent = {
      ...content,
      texts: newTexts,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);

    set({
      content: newContent,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateImage: (field, storagePath) => {
    const { content, history, historyIndex } = get();
    if (!content) return;

    const newImages = { ...content.images, [field]: storagePath };
    const newContent: GeneratedContent = {
      ...content,
      images: newImages,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);

    set({
      content: newContent,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      content: history[newIndex],
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      content: history[newIndex],
      historyIndex: newIndex,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
