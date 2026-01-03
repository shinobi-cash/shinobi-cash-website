// hooks/useSelectionState.ts
"use client";

import { useState, useCallback } from "react";

export function useSelectionState<T>() {
  const [selected, setSelected] = useState<T | null>(null);

  const select = useCallback((item: T) => {
    setSelected(item);
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
  }, []);

  return {
    selected,
    isSelected: selected !== null,
    select,
    clear,
  };
}
