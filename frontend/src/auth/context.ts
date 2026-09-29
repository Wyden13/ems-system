import { createContext, useContext } from "react";
import type { Account } from "../api/types";
export interface AuthState {
  account: Account | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  restore: () => Promise<void>;
}
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Auth provider missing");
  return context;
}
