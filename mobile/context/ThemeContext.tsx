import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeColor = "purple" | "red" | "green" | "orange" | "blue" | "cyan";

export interface ThemeConfig {
  primary: string;
  secondary: string;
  label: string;
}

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  purple: { primary: "#8B5CF6", secondary: "#6D28D9", label: "Purple" },
  red:    { primary: "#EF4444", secondary: "#DC2626", label: "Red" },
  green:  { primary: "#10B981", secondary: "#059669", label: "Green" },
  orange: { primary: "#F97316", secondary: "#EA580C", label: "Orange" },
  blue:   { primary: "#3B82F6", secondary: "#2563EB", label: "Blue" },
  cyan:   { primary: "#06B6D4", secondary: "#0891B2", label: "Cyan" },
};

interface ThemeContextType {
  theme: ThemeColor;
  config: ThemeConfig;
  setTheme: (t: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "purple",
  config: THEMES.purple,
  setTheme: () => {}
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>("purple");

  useEffect(() => {
    AsyncStorage.getItem("pravix-theme").then(t => {
      if (t && THEMES[t as ThemeColor]) setThemeState(t as ThemeColor);
    });
  }, []);

  const setTheme = async (t: ThemeColor) => {
    setThemeState(t);
    await AsyncStorage.setItem("pravix-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, config: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
