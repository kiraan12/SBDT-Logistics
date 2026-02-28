import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { User } from "@/types";
import { authService } from "@/services/api";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 8000);
    refreshUser().then(() => {
      if (!cancelled) clearTimeout(t);
    });
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [refreshUser]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
  }, []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isOperator = user?.role === "OPERATOR";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isOperator,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
