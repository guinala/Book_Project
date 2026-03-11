import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase_init";

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  enterAsGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const enterAsGuest = () => {
    setIsGuest(true);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsGuest(false);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, isGuest, loading, isAuthenticated, enterAsGuest, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}