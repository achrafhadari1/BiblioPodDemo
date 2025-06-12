"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

// Create a context for theme management
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check if dark mode is stored in localStorage, default to false
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("darkMode");
      return savedTheme ? JSON.parse(savedTheme) : false;
    }
    return false;
  });

  // Update localStorage and apply theme when isDarkMode changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", JSON.stringify(isDarkMode));

      // Apply theme to document body using data-theme attribute
      if (isDarkMode) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
      }
    }
  }, [isDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  // Context value
  const value = {
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
