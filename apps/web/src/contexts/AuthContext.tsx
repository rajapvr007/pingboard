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
  signup: (email: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent session
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

  const login = async (email: string, _password?: string) => {
    // In production with AWS Cognito:
    // const authResult = await cognitoAuth.signIn(email, password);
    // const idToken = authResult.idToken;
    const mockToken = "mock-" + Math.random().toString(36).substring(2);
    const userId = "usr_mock123";

    localStorage.setItem("pingboard_token", mockToken);
    localStorage.setItem("pingboard_email", email);
    localStorage.setItem("pingboard_userid", userId);

    setUser({ id: userId, email });
    setToken(mockToken);
  };

  const signup = async (email: string, password?: string) => {
    // Sign up automatically logs in for the dev/mock setup
    await login(email, password);
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
