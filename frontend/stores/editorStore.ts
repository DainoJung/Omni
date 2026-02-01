import { create } from "zustand";
import type { RenderedSection } from "@/types";

interface EditorState {
  sections: RenderedSection[];
  history: RenderedSection[][];
  historyIndex: number;

  setSections: (sections: RenderedSection[]) => void;
  updateSectionData: (sectionId: string, placeholderId: string, value: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  sections: [],
  history: [],
  historyIndex: -1,

  setSections: (sections) => {
    set({
      sections,
      history: [sections],
      historyIndex: 0,
    });
  },

  updateSectionData: (sectionId, placeholderId, value) => {
    const { sections, history, historyIndex } = get();

    const newSections = sections.map((sec) =>
      sec.section_id === sectionId
        ? { ...sec, data: { ...sec.data, [placeholderId]: value } }
        : sec
    );

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSections);

    set({
      sections: newSections,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      sections: history[newIndex],
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      sections: history[newIndex],
      historyIndex: newIndex,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
