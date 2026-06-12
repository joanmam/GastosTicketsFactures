"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  getToken: async () => null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function getToken() {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, getToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
