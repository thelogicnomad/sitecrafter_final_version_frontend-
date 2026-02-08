import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } catch (error) {
          console.error("Failed to restore auth state:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (userData: User, authToken: string) => {
    try {
      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      setUser(userData);
      setToken(authToken);

      // Note: Navigation is handled by the calling component (Login.tsx or ProtectedRoute.tsx)
      // to ensure proper history management for back button behavior
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;