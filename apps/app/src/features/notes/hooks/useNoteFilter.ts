/**
 * Note Filter Hook
 * Manages filter selection state
 */

import { useState, useCallback } from "react";
import type { NoteFilter } from "../protocol/noteFiltering";

export function useNoteFilter(initialFilter: NoteFilter = "available") {
  const [activeFilter, setActiveFilter] = useState<NoteFilter>(initialFilter);

  const setFilter = useCallback((filter: NoteFilter) => {
    setActiveFilter(filter);
  }, []);

  const reset = useCallback(() => {
    setActiveFilter("available");
  }, []);

  return {
    activeFilter,
    setFilter,
    reset,
  };
}
