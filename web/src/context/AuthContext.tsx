import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "../api/client";

interface AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (orgName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("specter_token")
  );
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await api.login(email, password);
      api.setToken(data.access_token);
      localStorage.setItem("specter_refresh", data.refresh_token);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    }
  }, []);

  const register = useCallback(
    async (orgName: string, name: string, email: string, password: string) => {
      setError(null);
      try {
        const data = await api.register(orgName, name, email, password);
        api.setToken(data.access_token);
        localStorage.setItem("specter_refresh", data.refresh_token);
        setIsAuthenticated(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    api.clearToken();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
