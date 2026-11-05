import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string) => Promise<any>;
  confirm: (email: string, code: string) => Promise<any>;
  resendCode: (email: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getApiUrl = (endpoint: string) => {
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "";
  return `${base}${endpoint}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("pingboard_token");
    const savedEmail = localStorage.getItem("pingboard_email");
    const savedUserId = localStorage.getItem("pingboard_userid");

    if (savedToken && savedEmail) {
      setUser({
        id: savedUserId || "usr_mock123",
        email: savedEmail,
      });
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    // Fallback for Quick Demo login button
    if (email === "developer@pingboard.local" && !password) {
      const mockToken = "mock-" + Math.random().toString(36).substring(2);
      const userId = "usr_mock123";
      localStorage.setItem("pingboard_token", mockToken);
      localStorage.setItem("pingboard_email", email);
      localStorage.setItem("pingboard_userid", userId);
      setUser({ id: userId, email });
      setToken(mockToken);
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const error = new Error(data.message || data.error?.message || "Invalid email or password.") as any;
        error.code = data.details?.type || data.code;
        throw error;
      }

      localStorage.setItem("pingboard_token", data.idToken);
      localStorage.setItem("pingboard_email", data.user.email);
      localStorage.setItem("pingboard_userid", data.user.id);

      setUser({ id: data.user.id, email: data.user.email });
      setToken(data.idToken);
    } catch (err: any) {
      // If demo credentials and API is in mock mode
      if (email === "developer@pingboard.local") {
        const mockToken = "mock-" + Math.random().toString(36).substring(2);
        const userId = "usr_mock123";
        localStorage.setItem("pingboard_token", mockToken);
        localStorage.setItem("pingboard_email", email);
        localStorage.setItem("pingboard_userid", userId);
        setUser({ id: userId, email });
        setToken(mockToken);
        return;
      }
      throw err;
    }
  };

  const signup = async (email: string, password?: string) => {
    const res = await fetch(getApiUrl("/api/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error?.message || "Registration failed.");
    }

    return data;
  };

  const confirm = async (email: string, code: string) => {
    const res = await fetch(getApiUrl("/api/auth/confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error?.message || "Verification failed. Please check your code.");
    }

    return data;
  };

  const resendCode = async (email: string) => {
    const res = await fetch(getApiUrl("/api/auth/resend-code"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error?.message || "Failed to resend code.");
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem("pingboard_token");
    localStorage.removeItem("pingboard_email");
    localStorage.removeItem("pingboard_userid");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        confirm,
        resendCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
