"use client";
import { createContext, useContext, useEffect, useState } from "react";

type ViewMode = "list" | "grid";

const ViewModeContext = createContext<{
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}>({ viewMode: "list", setViewMode: () => {} });

export function useViewMode() {
  return useContext(ViewModeContext);
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = localStorage.getItem("away-view-mode") as ViewMode | null;
    if (stored) setViewModeState(stored);
  }, []);

  const setViewMode = (v: ViewMode) => {
    setViewModeState(v);
    localStorage.setItem("away-view-mode", v);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}
