import React from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { ThemeMode } from "@/store/ui.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "header" | "button" | "segmented";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "header",
  className = "",
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // 1. QUICK BUTTON (1-Click Toggle)
  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={`h-9 w-9 rounded-xl border border-border/60 bg-background/80 hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-foreground ${className}`}
        title={`Current: ${theme === "system" ? `System (${resolvedTheme})` : theme}. Click to switch theme.`}
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200 transition-transform duration-200" />
        )}
      </Button>
    );
  }

  // 2. SEGMENTED CONTROL (For Settings & Preferences Pages)
  if (variant === "segmented") {
    const options: { value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { value: "light", label: "Light", icon: Sun },
      { value: "dark", label: "Dark", icon: Moon },
      { value: "system", label: "System", icon: Laptop },
    ];

    return (
      <div className={`grid grid-cols-3 gap-2.5 p-1.5 bg-muted/60 dark:bg-slate-900/60 rounded-2xl border border-border/70 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              }`}
            >
              <Icon className={`h-4 w-4 ${isSelected && opt.value === "dark" ? "text-indigo-400" : isSelected && opt.value === "light" ? "text-amber-500" : ""}`} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 3. HEADER DROPDOWN TOGGLE (Default Header Style)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl border border-border/60 bg-background/80 hover:bg-accent hover:text-accent-foreground text-foreground transition-all duration-200 shrink-0 ${className}`}
          title="Change theme (Light / Dark / System)"
          aria-label="Change theme"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4 text-sky-400 transition-all" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500 transition-all" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-38 p-1.5 rounded-xl bg-popover border border-border shadow-lg">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center justify-between text-xs font-semibold px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
            theme === "light" ? "bg-accent text-accent-foreground font-bold" : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-between text-xs font-semibold px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
            theme === "dark" ? "bg-accent text-accent-foreground font-bold" : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-sky-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center justify-between text-xs font-semibold px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
            theme === "system" ? "bg-accent text-accent-foreground font-bold" : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Laptop className="h-3.5 w-3.5 text-slate-400" />
            <span>System</span>
          </div>
          {theme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
