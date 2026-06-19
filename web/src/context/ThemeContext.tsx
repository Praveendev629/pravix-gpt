"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeColor = "purple" | "red" | "green" | "orange" | "blue" | "cyan";

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (t: ThemeColor) => void;
  primary: string;
}

const THEME_COLORS: Record<ThemeColor, string> = {
  purple: "#8B5CF6",
  red: "#EF4444",
  green: "#10B981",
  orange: "#F97316",
  blue: "#3B82F6",
  cyan: "#06B6D4"
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "purple",
  setTheme: () => {},
  primary: "#8B5CF6"
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>("purple");

  useEffect(() => {
    const saved = localStorage.getItem("pravix-theme") as ThemeColor;
    if (saved) setThemeState(saved);
  }, []);

  const setTheme = (t: ThemeColor) => {
    setThemeState(t);
    localStorage.setItem("pravix-theme", t);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.setProperty("--primary", THEME_COLORS[t]);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--primary", THEME_COLORS[theme]);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primary: THEME_COLORS[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { THEME_COLORS };
