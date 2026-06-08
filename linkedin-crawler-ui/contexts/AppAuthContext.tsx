"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AppUser } from "@/types/unified.types";
import { authService } from "@/services/all-platform.service";

// ─── Context ─────────────────────────────────────────────────────────────────
interface AppAuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setLwuuSession: (email: string, remember: boolean) => void;
  clearLwuuSession: () => void;
}

const AppAuthContext = createContext<AppAuthContextType | undefined>(undefined);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.me();
      if (res.success && res.data) {
        setUser(res.data as AppUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  /** Cookie-based session; no localStorage session needed */
  const setLwuuSession = useCallback((_email: string, _remember: boolean) => {
    // no-op (kept for backward compatibility with AuthPage)
  }, []);

  /** Cookie-based session; no localStorage session needed */
  const clearLwuuSession = useCallback(() => {
    // no-op
  }, []);

  /** On mount: attempt to load current user from cookie */
  useEffect(() => {
    void refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Login failed");
      }
      // Cookie is set by backend; just take user.
      const data = res.data as { user: AppUser };
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await authService.register({ email, password, name });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Registration failed");
      }
      // Cookie is set by backend; just take user.
      const data = res.data as { user: AppUser };
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AppAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        setLwuuSession,
        clearLwuuSession,
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth(): AppAuthContextType {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }
  return ctx;
}
