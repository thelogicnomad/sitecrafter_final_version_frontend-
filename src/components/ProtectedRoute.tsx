import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";

const ProtectedRoute = () => {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we already have a user and token
        if (user && token) {
          setIsAuthenticating(false);
          return;
        }
        
        // Check for token in localStorage
        const tokenFromStorage = localStorage.getItem("token");
        const userFromStorage = localStorage.getItem("user");
        
        if (tokenFromStorage && userFromStorage) {
          setIsAuthenticating(false);
          return;
        }
        
        // Check for Google auth token in URL after redirect
        const query = new URLSearchParams(window.location.search);
        const urlToken = query.get("token");
        const userData = query.get("user");
        
        if (urlToken && userData) {
          try {
            const user = JSON.parse(decodeURIComponent(userData));
            await login(user, urlToken);
            
            // Clean the URL (remove query parameters)
            window.history.replaceState({}, document.title, location.pathname);
            setIsAuthenticating(false);
            return;
          } catch (error) {
            console.error("Failed to process Google auth:", error);
            navigate("/login", { replace: true });
            return;
          }
        }
        
        // As a last resort, check if there's an active session
        try {
          const response = await axios.get(`${BACKEND_URL}/auth/check-session`, { 
            withCredentials: true 
          });
          
          if (response.data.user && response.data.token) {
            await login(response.data.user, response.data.token);
            setIsAuthenticating(false);
          } else {
            navigate("/login", { replace: true });
          }
        } catch (error) {
          console.error("No active session:", error);
          navigate("/login", { replace: true });
        }
      } finally {
        // Ensure we always set isAuthenticating to false when done
        setIsAuthenticating(false);
      }
    };

    checkAuth();
  }, [user, token, login, navigate, location.pathname]);

  // Show loading spinner while checking authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if user is authenticated
  const isAuthenticated = user && token;
  
  // If not authenticated after all checks, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected content
  return <Outlet />;
};

export default ProtectedRoute;