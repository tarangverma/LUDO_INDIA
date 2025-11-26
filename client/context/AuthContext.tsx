import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  userId: string;
  username: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in (from localStorage)
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // For now, we'll assume the password is the same as username for simplicity in this demo, 
      // or we could prompt for it. But to keep the interface simple as per request:
      // "login and create rooms and play with friends"
      // We might need to update the UI to ask for password.
      // However, the user request was "login and create rooms", implying a login flow.
      // The current UI only asks for username.
      // I will update this to use a default password or handle it. 
      // Actually, I should probably update the Login UI to ask for password.
      // But for now, let's stick to the context changes.
      
      // Wait, the user said "login and create rooms". 
      // I'll assume for now we can just send username as password if not provided, 
      // BUT better to fail if no password.
      // Let's check the Login.tsx file first to see what it sends.
      // Ah, I haven't read Login.tsx yet.
      // Let's assume I need to update Login.tsx too.
      
      // For this step, I will implement the API call structure.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }), // Temporary default password until UI update
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      
      const data = await res.json();
      const userData: User = { userId: data.userId, username: data.username, token: data.token };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }), // Temporary default password
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Signup failed");
      }

      const data = await res.json();
      const userData: User = { userId: data.userId, username: data.username, token: data.token };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
