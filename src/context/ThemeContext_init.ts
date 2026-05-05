import { createContext } from "react";

export interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
