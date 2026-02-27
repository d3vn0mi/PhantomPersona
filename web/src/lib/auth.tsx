"use client";

import { createContext, useContext, type ReactNode } from "react";

interface AuthContextValue {
  // Placeholder for future authentication state
}

const AuthContext = createContext<AuthContextValue>({});

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
