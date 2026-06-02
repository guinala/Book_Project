import { createContext } from "react";
import type { User } from "firebase/auth";

export type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  enterAsGuest: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);
