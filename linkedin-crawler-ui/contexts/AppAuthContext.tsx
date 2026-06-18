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
const AUTH_CHECK_TIMEOUT_MS = 6000;
const AUTH_USER_CACHE_KEY = "markee_app_user";

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function readCachedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AppUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {
    // localStorage can be unavailable in hardened browsers.
  }
}

function isPermanentAuthFailure(message?: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("missing or invalid authorization") ||
    m.includes("invalid or expired token") ||
    m.includes("invalid token payload") ||
    m.includes("user not found") ||
    m.includes("inactive")
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Auth check timeout")), ms);
    promise.then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await withTimeout(authService.me(), AUTH_CHECK_TIMEOUT_MS);
        if (res.success && res.data) {
          const nextUser = res.data as AppUser;
          setUser(nextUser);
          writeCachedUser(nextUser);
          return;
        }
        if (isPermanentAuthFailure(res.message)) {
          setUser(null);
          writeCachedUser(null);
          return;
        }
      } catch {
        // Network/backend hiccup: retry once, then keep the last known user.
      }
      if (attempt === 0) await wait(450);
    }
    setUser(prev => prev || readCachedUser());
  }, []);

  /** Cookie-based session; no localStorage session needed */
  const setLwuuSession = useCallback((_email: string, _remember: boolean) => {
    void _email;
    void _remember;
    // no-op (kept for backward compatibility with AuthPage)
  }, []);

  /** Cookie-based session; no localStorage session needed */
  const clearLwuuSession = useCallback(() => {
    // no-op
  }, []);

  /** On mount: attempt to load current user from cookie */
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      void refreshUser().finally(() => {
        if (alive) setIsLoading(false);
      });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
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
      writeCachedUser(data.user);
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
      writeCachedUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    writeCachedUser(null);
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
