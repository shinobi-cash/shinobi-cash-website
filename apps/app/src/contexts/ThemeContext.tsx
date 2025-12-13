import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  effectiveTheme: "light" | "dark";
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  toggleTheme: () => null,
  effectiveTheme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "shinobi.cash.theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    (typeof window !== 'undefined' ? localStorage.getItem(storageKey) as Theme : null) || defaultTheme
  );

  // Calculate the effective theme (what's actually applied)
  const getEffectiveTheme = useCallback((): "light" | "dark" => {
    if (theme === "system") {
      if (typeof window === 'undefined') return "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(getEffectiveTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    const newEffectiveTheme = getEffectiveTheme();

    root.setAttribute("data-theme", newEffectiveTheme);
    setEffectiveTheme(newEffectiveTheme);
  }, [getEffectiveTheme]);

  useEffect(() => {
    // Listen for system theme changes when theme is set to "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const handleChange = () => {
        const root = window.document.documentElement;
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.setAttribute("data-theme", systemTheme);
        setEffectiveTheme(systemTheme);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const nextTheme = systemTheme === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, nextTheme);
      setTheme(nextTheme);
    } else {
      const nextTheme = theme === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, nextTheme);
      setTheme(nextTheme);
    }
  }, [theme, storageKey]);

  const updateTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setTheme(newTheme);
  }, [storageKey]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: updateTheme,
      toggleTheme,
      effectiveTheme,
    }),
    [theme, updateTheme, toggleTheme, effectiveTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
