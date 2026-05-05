import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext_init";

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
