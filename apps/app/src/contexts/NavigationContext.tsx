import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

export type Screen = "home" | "deposit" | "my-notes";

export interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface NavigationState {
  screen: Screen;
  asset?: Asset;
}

interface NavigationContextType {
  currentScreen: Screen;
  currentAsset?: Asset;
  setCurrentScreen: (screen: Screen) => void;
  navigateToScreen: (screen: Screen, asset?: Asset) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    screen: "home",
  });

  const setCurrentScreen = useCallback((screen: Screen) => {
    setNavigationState((prev) => ({ ...prev, screen }));
  }, []);

  const navigateToScreen = useCallback((screen: Screen, asset?: Asset) => {
    setNavigationState({ screen, asset });
  }, []);

  const contextValue = useMemo(
    () => ({
      currentScreen: navigationState.screen,
      currentAsset: navigationState.asset,
      setCurrentScreen,
      navigateToScreen,
    }),
    [navigationState.screen, navigationState.asset, setCurrentScreen, navigateToScreen],
  );

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
