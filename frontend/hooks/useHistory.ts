import { useCallback, useRef } from "react";
import type { RenderedSection } from "@/types";

const MAX_SNAPSHOTS = 50;

function deepClone(sections: RenderedSection[]): RenderedSection[] {
  return JSON.parse(JSON.stringify(sections));
}

interface UseHistoryReturn {
  pushSnapshot: (sections: RenderedSection[]) => void;
  undo: () => RenderedSection[] | null;
  redo: () => RenderedSection[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export function useHistory(): UseHistoryReturn {
  const snapshotsRef = useRef<RenderedSection[][]>([]);
  const indexRef = useRef(-1);

  const pushSnapshot = useCallback((sections: RenderedSection[]) => {
    const snapshots = snapshotsRef.current;
    const currentIndex = indexRef.current;

    // Discard any redo history beyond current position
    if (currentIndex < snapshots.length - 1) {
      snapshots.splice(currentIndex + 1);
    }

    snapshots.push(deepClone(sections));

    // Evict oldest if over limit
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.shift();
    }

    indexRef.current = snapshots.length - 1;
  }, []);

  const undo = useCallback((): RenderedSection[] | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current -= 1;
    return deepClone(snapshotsRef.current[indexRef.current]);
  }, []);

  const redo = useCallback((): RenderedSection[] | null => {
    if (indexRef.current >= snapshotsRef.current.length - 1) return null;
    indexRef.current += 1;
    return deepClone(snapshotsRef.current[indexRef.current]);
  }, []);

  const canUndo = useCallback(() => indexRef.current > 0, []);
  const canRedo = useCallback(() => indexRef.current < snapshotsRef.current.length - 1, []);

  return { pushSnapshot, undo, redo, canUndo, canRedo };
}
