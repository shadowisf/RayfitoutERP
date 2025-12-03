"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getSession, logout as authLogout } from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  userInfo: {
    name?: string;
    email?: string;
    sub?: string;
    role?: string;
    departmentID?: number;
  } | null;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  userInfo: null,
  logout: () => {},
  checkAuth: async () => {},
});

function decodeJWT(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  async function checkAuth() {
    try {
      const session = await getSession();
      if (session) {
        setIsAuthenticated(true);
        setUser(session);

        const decoded = decodeJWT(session.idToken);
        if (decoded) {
          const departmentResp = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDepartmentIdByUserRole`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: decoded["custom:role"] }),
            }
          );
          const departmentData = await departmentResp.json();
          const departmentID = departmentData?.id ?? null;

          setUserInfo({
            name: decoded.name,
            email: decoded.email,
            sub: decoded.sub,
            role: decoded["custom:role"],
            departmentID,
          });
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserInfo(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  function logout() {
    authLogout();
    setIsAuthenticated(false);
    setUser(null);
    setUserInfo(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, userInfo, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
