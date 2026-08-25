import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

export const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("aadya-theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage access errors
  }
  return "light";
};

export const applyThemeToDocument = (theme: ThemeMode): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }

  return resolved;
};

interface UIStore {
  sidebarOpen: boolean;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  syncTheme: () => void;
}

const initialTheme = getStoredTheme();
const initialResolved = typeof window !== "undefined" ? applyThemeToDocument(initialTheme) : "light";

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: true,
  theme: initialTheme,
  resolvedTheme: initialResolved,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem("aadya-theme", theme);
    } catch (e) {}
    const resolved = applyThemeToDocument(theme);
    set({ theme, resolvedTheme: resolved });
  },
  toggleTheme: () => {
    const current = get().theme;
    const currentResolved = get().resolvedTheme;
    // If currently dark (either explicitly or via system), switch to light, else dark
    const nextTheme: ThemeMode = currentResolved === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("aadya-theme", nextTheme);
    } catch (e) {}
    const resolved = applyThemeToDocument(nextTheme);
    set({ theme: nextTheme, resolvedTheme: resolved });
  },
  syncTheme: () => {
    const currentTheme = get().theme;
    const resolved = applyThemeToDocument(currentTheme);
    set({ resolvedTheme: resolved });
  },
}));
