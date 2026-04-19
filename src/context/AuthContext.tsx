import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/services/firebase/firebase_init";
import { AuthContext } from "@/context/auth_init";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const isEmailPasswordUser = firebaseUser?.providerData[0]?.providerId === "password";
      if (firebaseUser && isEmailPasswordUser && !firebaseUser.emailVerified) {
        setUser(null);
      } else {
        setUser(firebaseUser);
        if (firebaseUser) setIsGuest(false);
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
