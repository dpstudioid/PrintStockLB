import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { login as doLogin, logout as doLogout, getSession, UserRole } from "@/lib/auth-store";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = getSession();
    return session ? { id: session.id, username: session.username, name: session.name, role: session.role } : null;
  });

  

  const login = useCallback(async (username: string, password: string) => {
    const result = await doLogin(username, password);
    if (result) {
      setUser({ id: result.id, username: result.username, name: result.name, role: result.role });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
