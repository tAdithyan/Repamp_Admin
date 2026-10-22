import React, {
  createContext,
  useState,
  useEffect,
} from "react";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Firebase user
  const [currentUser, setCurrentUser] = useState(null);

  // Your MongoDB/application user
  const [appUser, setAppUser] = useState(null);

  // Your backend JWT
  const [token, setToken] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUser) {
      try {
        setAppUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Invalid stored user");

        localStorage.removeItem("user");
      }
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Called after your backend login succeeds
  const login = (loginData) => {
    const { token, user } = loginData;

    localStorage.setItem("token", token);
    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    setToken(token);
    setAppUser(user);
  };

  const logout = async () => {
    try {
      // Firebase logout
      await signOut(auth);

      // Application logout
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToken(null);
      setAppUser(null);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const hasPermission = (permission) => {
    if (!appUser) return false;
    return appUser.permissions?.includes(permission);
  };

  const updateAppUser = (updates) => {
    const nextUser = { ...appUser, ...updates };
    localStorage.setItem("user", JSON.stringify(nextUser));
    setAppUser(nextUser);
    return nextUser;
  };

  // Check if user has at least one
  const hasAnyPermission = (permissions) => {
    if (!appUser) return false;

    return permissions.some((permission) =>
      appUser.permissions?.includes(permission)
    );
  };

  // Check if user has all
  const hasAllPermissions = (permissions) => {
    if (!appUser) return false;

    return permissions.every((permission) =>
      appUser.permissions?.includes(permission)
    );
  };

  const value = {
    // Firebase
    currentUser,

    // Application
    appUser,
    token,

    // Authentication
    login,
    logout,
    setAppUser,
    updateAppUser,


    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Status
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
