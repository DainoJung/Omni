import { create } from "zustand";
import type { PipelineResult, TextArea } from "@/types";

interface EditorState {
  result: PipelineResult | null;
  history: PipelineResult[];
  historyIndex: number;

  // Actions
  setResult: (result: PipelineResult) => void;
  updateTextArea: (sectionOrder: number, areaId: string, updates: Partial<TextArea>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  result: null,
  history: [],
  historyIndex: -1,

  setResult: (result) => {
    set({
      result,
      history: [result],
      historyIndex: 0,
    });
  },

  updateTextArea: (sectionOrder, areaId, updates) => {
    const { result, history, historyIndex } = get();
    if (!result) return;

    const newSections = result.sections.map((section) => {
      if (section.order !== sectionOrder) return section;
      return {
        ...section,
        text_areas: section.text_areas.map((ta) =>
          ta.id === areaId ? { ...ta, ...updates } : ta
        ),
      };
    });

    const newResult: PipelineResult = {
      ...result,
      sections: newSections,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newResult);

    set({
      result: newResult,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      result: history[newIndex],
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      result: history[newIndex],
      historyIndex: newIndex,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
