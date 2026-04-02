import { useContext } from "react";
import { AuthContext } from "@/context/auth_init";
import type { AuthContextType } from "@/context/auth_init";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
