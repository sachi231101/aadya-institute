import React, { createContext, useContext, useEffect } from "react";
import { useUIStore, applyThemeToDocument, type ThemeMode } from "@/store/ui.store";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, syncTheme } = useUIStore();

  useEffect(() => {
    // Initial sync
    syncTheme();

    // Listen to system theme changes if set to system
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const currentTheme = useUIStore.getState().theme;
      if (currentTheme === "system") {
        syncTheme();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemChange);
      return () => mediaQuery.removeEventListener("change", handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [syncTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback directly to Zustand store if used outside provider
    const { theme, resolvedTheme, setTheme, toggleTheme } = useUIStore.getState();
    return { theme, resolvedTheme, setTheme, toggleTheme };
  }
  return context;
};
