"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type LayoutVersion = "old" | "new";

interface LayoutContextType {
  version: LayoutVersion;
  toggleVersion: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<LayoutVersion>("old");

  const toggleVersion = () => {
    setVersion((prev) => (prev === "old" ? "new" : "old"));
  };

  return (
    <LayoutContext.Provider value={{ version, toggleVersion }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}
