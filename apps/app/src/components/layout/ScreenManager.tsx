/**
 * Screen Manager - Native app style screen switching
 *
 * Manages which screen is active and provides smooth transitions
 * Each screen is mounted/unmounted based on navigation state
 */

import { useNavigation } from "@/contexts/NavigationContext";
import React from "react";
import { Screen } from "./ScreenLayout";

/**
 * Screen Registration System
 */
export interface ScreenConfig {
  id: string;
  component: React.ComponentType;
  props?: Record<string, unknown>;
  title?: string;
  scrollable?: boolean;
}

interface ScreenManagerProps {
  screens: ScreenConfig[];
  fallbackScreen?: React.ComponentType;
}

export function ScreenManager({ screens, fallbackScreen: FallbackScreen }: ScreenManagerProps) {
  const { currentScreen } = useNavigation();

  // Find the active screen configuration
  const activeScreen = screens.find((screen) => screen.id === currentScreen);

  if (!activeScreen) {
    if (FallbackScreen) {
      return (
        <Screen>
          <FallbackScreen />
        </Screen>
      );
    }

    return (
      <Screen>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-app-primary mb-2">Screen Not Found</h2>
            <p className="text-app-secondary">The requested screen "{currentScreen}" could not be found.</p>
          </div>
        </div>
      </Screen>
    );
  }

  const { component: ScreenComponent, props = {}, scrollable = true } = activeScreen;

  return (
    <Screen key={activeScreen.id} scrollable={scrollable}>
      <ScreenComponent {...props} />
    </Screen>
  );
}

/**
 * Simple Screen Router - For basic screen switching
 */
interface ScreenRoute {
  path: string;
  component: React.ComponentType;
  title?: string;
  scrollable?: boolean;
}

interface SimpleScreenRouterProps {
  routes: ScreenRoute[];
  currentPath: string;
}

export function SimpleScreenRouter({ routes, currentPath }: SimpleScreenRouterProps) {
  const currentRoute = routes.find((route) => route.path === currentPath);

  if (!currentRoute) {
    return (
      <Screen>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-secondary">Route not found: {currentPath}</p>
        </div>
      </Screen>
    );
  }

  const { component: Component, scrollable = true } = currentRoute;

  return (
    <Screen scrollable={scrollable}>
      <Component />
    </Screen>
  );
}

/**
 * Hook for easy screen registration
 */
export function useScreenRegistry() {
  const [screens, setScreens] = React.useState<ScreenConfig[]>([]);

  const registerScreen = React.useCallback((config: ScreenConfig) => {
    setScreens((prev) => {
      const existing = prev.find((s) => s.id === config.id);
      if (existing) {
        return prev.map((s) => (s.id === config.id ? config : s));
      }
      return [...prev, config];
    });
  }, []);

  const unregisterScreen = React.useCallback((id: string) => {
    setScreens((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { screens, registerScreen, unregisterScreen };
}
