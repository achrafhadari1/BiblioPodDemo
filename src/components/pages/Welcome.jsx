"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../../context/AuthContext";

const Welcome = () => {
  const router = useRouter();
  const { createUser } = useAuthContext();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (username.trim().length < 2) {
      toast.error("Name should be at least 2 characters long");
      return;
    }

    setIsLoading(true);
    setIsAnimating(true);

    try {
      await createUser(username.trim());

      // Add a small delay for smooth animation
      setTimeout(() => {
        router.push("/library");
      }, 800);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
      setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-200/30 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-amber-300/20 rounded-full blur-xl animate-bounce delay-500"></div>
      </div>

      <div
        className={`w-full max-w-md relative transition-all duration-800 ${
          isAnimating ? "scale-110 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-30 h-30 pb-1 pt-1 bg-amber-500 rounded-2xl mb-4 shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <img src="/logo-long.png" alt="" srcset="" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-gray-800 mb-2">
            Welcome to BiblioPod
          </h1>
          <p className="text-gray-600 font-medium">
            Let's start your reading journey
          </p>
        </div>

        {/* Welcome Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/50 p-8 transform hover:scale-[1.02] transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                What should we call you?
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-lg placeholder-gray-400"
                  disabled={isLoading}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Sparkles size={20} className="text-amber-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium py-3 px-6 rounded-xl hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Setting up your library...
                </>
              ) : (
                <>
                  Let's begin
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              We'll create your personal reading space where you can track
              books, highlights, and reading progress.
            </p>
          </div>
        </div>

        {/* Fun fact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 italic">
            📚 Fun fact: The average reader finishes 12 books per year. Let's
            beat that record!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
