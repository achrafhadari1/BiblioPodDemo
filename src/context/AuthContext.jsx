"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bookStorageDB } from "../utils/bookStorageDB";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const router = useRouter();

  const getUser = async () => {
    try {
      // Check if user exists in IndexedDB
      const userData = await bookStorageDB.getUser();
      if (userData) {
        setUser(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const createUser = async (username) => {
    try {
      // Initialize the database
      await bookStorageDB.init();

      // Create user data
      const userData = {
        id: `user-${Date.now()}`,
        name: username,
        email: `${username.toLowerCase().replace(/\s+/g, "")}@bibliopod.local`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save user to IndexedDB
      await bookStorageDB.setUser(userData);

      // Initialize demo data (books, etc.)
      await bookStorageDB.initializeDemoData();

      // Set user in state
      setUser(userData);

      return userData;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  const login = async (data) => {
    try {
      // Clear any previous login errors
      setLoginError(null);

      // Initialize demo data
      await bookStorageDB.initializeDemoData();

      // For demo purposes, accept any email/password combination
      // In a real app, you would validate credentials here
      const demoToken = "demo-token-" + Date.now();
      localStorage.setItem("token", demoToken);

      const userData = await getUser();
      if (userData) {
        toast.success("Welcome to BiblioPod!", {
          description: "You're now using the demo version",
        });
        router.push("/library");
        return { success: true };
      } else {
        throw new Error("Failed to initialize demo user");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = "An error occurred during demo login.";
      setLoginError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  const logout = async () => {
    // Clear all data
    await bookStorageDB.clearAllData();
    setUser(null);
  };

  const register = async (formData) => {
    try {
      // Clear any previous signup errors
      setSignUpError(null);

      // Initialize demo data
      await bookStorageDB.initializeDemoData();

      // For demo purposes, accept any registration data
      const demoToken = "demo-token-" + Date.now();
      localStorage.setItem("token", demoToken);

      const userData = await getUser();
      if (userData) {
        toast.success("Welcome to BiblioPod!", {
          description: "You're now using the demo version",
        });
        router.push("/library");
        return { success: true };
      } else {
        throw new Error("Failed to initialize demo user");
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = "An error occurred during demo registration.";
      setSignUpError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginError,
        signUpError,
        getUser,
        createUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
