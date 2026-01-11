/**
 * Screen Navigation Hook
 * Simplifies multi-screen state management within a feature
 */

import { useState, useCallback } from "react";

export function useScreenNavigation<T extends string>(defaultScreen: T | null = null) {
  const [activeScreen, setActiveScreen] = useState<T | null>(defaultScreen);

  const navigate = useCallback((screen: T | null) => {
    setActiveScreen(screen);
  }, []);

  const is = useCallback(
    (screen: T) => {
      return activeScreen === screen;
    },
    [activeScreen]
  );

  const close = useCallback(() => {
    setActiveScreen(null);
  }, []);

  return {
    /** Current active screen */
    activeScreen,
    /** Navigate to a specific screen */
    navigate,
    /** Check if a specific screen is active */
    is,
    /** Close/clear current screen (set to null) */
    close,
  };
}
