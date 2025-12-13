/**
 * Hook for managing modal/drawer state with consistent patterns
 * Consolidates common open/close state management used across UI components
 */

import { useCallback, useState } from "react";

export interface ModalStateActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (isOpen: boolean) => void;
}

export interface ModalState {
  isOpen: boolean;
}

export function useModalState(initialState = false): ModalState & ModalStateActions {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setOpen = useCallback((newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen,
  };
}

/**
 * Hook for managing modal state with selected item pattern
 * Common pattern where opening a modal also sets a selected item
 */
export function useModalWithSelection<T = unknown>(initialState = false) {
  const modal = useModalState(initialState);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const openWith = useCallback(
    (item: T) => {
      setSelectedItem(item);
      modal.open();
    },
    [modal],
  );

  const closeAndClear = useCallback(() => {
    setSelectedItem(null);
    modal.close();
  }, [modal]);

  return {
    ...modal,
    selectedItem,
    setSelectedItem,
    openWith,
    closeAndClear,
  };
}
