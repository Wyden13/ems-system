import {
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api, login, logout, refreshSession } from "../api/client";
import type { Account } from "../api/types";
import { AuthContext } from "./context";
export default function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const previousAccount = useRef<Account | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const reload = useCallback(async () => {
    const next = await api<Account>("/api/v1/accounts/me");
    if (
      previousAccount.current &&
      (previousAccount.current.id !== next.id ||
        previousAccount.current.role !== next.role)
    )
      cache.clear();
    previousAccount.current = next;
    setAccount(next);
  }, [cache]);
  const restore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshSession();
      await reload();
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 401))
        setError(failure as Error);
    } finally {
      setLoading(false);
    }
  }, [reload]);
  useEffect(() => {
    const clear = () => {
      cache.clear();
      previousAccount.current = null;
      setAccount(null);
    };
    const refreshed = () => {
      void reload().catch(() => {
        /* The initiating request exposes refresh failures. */
      });
    };
    window.addEventListener("ems:session-cleared", clear);
    window.addEventListener("ems:session-refreshed", refreshed);
    // Initial loading is already true; only update state when the external request resolves.
    let live = true;
    refreshSession()
      .then(reload)
      .catch((failure) => {
        if (live && !(failure instanceof ApiError && failure.status === 401))
          setError(failure as Error);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      window.removeEventListener("ems:session-cleared", clear);
      window.removeEventListener("ems:session-refreshed", refreshed);
    };
  }, [cache, reload]);
  async function signIn(email: string, password: string) {
    await login(email, password);
    cache.clear();
    await reload();
  }
  async function signOut() {
    await logout();
  }
  return (
    <AuthContext.Provider
      value={{ account, loading, error, signIn, signOut, reload, restore }}
    >
      {children}
    </AuthContext.Provider>
  );
}
