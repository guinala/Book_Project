import { createContext } from "react";

export type ThemeContextValue = {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
