"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../../context/AuthContext";
import { localStorageDB } from "../../utils/localStorageDB";

export const SignUp = () => {
  const router = useRouter();
  const { register, signUpError } = useAuthContext();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const user = localStorageDB.getUser();

    if (token && user) {
      // User is already logged in, redirect to library
      router.push("/library");
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      // If we get here, registration was successful (AuthContext handles navigation and success toast)
    } catch (error) {
      console.error("Registration error:", error);
      // Error is already set in signUpError state by AuthContext and will be displayed in the form
      // Don't show additional toast as the error is already visible in the form
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-amber-500 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <img
              className="w-[10rem] h-[2rem] ml-6"
              src="/logo-long.png"
              alt=""
            />
          </Link>
          <h1 className="mt-6 text-3xl font-bold font-playfair">
            Join BiblioPod
          </h1>
          <p className="mt-2 text-gray-600">
            Create an account to start your reading journey
          </p>
        </div>

        <div className="bg-white shadow-md rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {signUpError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                {typeof signUpError === "string" ? (
                  <p className="text-sm text-red-600">{signUpError}</p>
                ) : signUpError.status === false && signUpError.errors ? (
                  <div className="space-y-1">
                    {signUpError.errors.name && (
                      <p className="text-sm text-red-600">
                        • {signUpError.errors.name[0]}
                      </p>
                    )}
                    {signUpError.errors.email && (
                      <p className="text-sm text-red-600">
                        • {signUpError.errors.email[0]}
                      </p>
                    )}
                    {signUpError.errors.password && (
                      <p className="text-sm text-red-600">
                        • {signUpError.errors.password[0]}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">
                    {signUpError.message ||
                      "An error occurred during registration."}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="pl-10 w-full px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <User size={18} />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10 w-full px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Mail size={18} />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10 w-full px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10 w-full px-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                {formData.password && formData.confirmPassword && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {formData.password === formData.confirmPassword ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <div className="text-red-500 text-xs">Doesn't match</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                className="h-4 w-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                checked={formData.acceptTerms}
                onChange={handleChange}
                required
              />
              <label
                htmlFor="acceptTerms"
                className="ml-2 block text-sm text-gray-700"
              >
                I accept the{" "}
                <a href="#" className="text-amber-500 hover:text-amber-600">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-amber-500 hover:text-amber-600">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white !bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-300"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-amber-500 hover:text-amber-600"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
