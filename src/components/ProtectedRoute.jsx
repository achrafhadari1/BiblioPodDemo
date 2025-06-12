"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/AuthContext";
import { CircularProgress } from "@nextui-org/react";

const ProtectedRoute = ({ children }) => {
  const { user, getUser } = useAuthContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If user is not loaded yet, try to get user data
        if (!user) {
          const userData = await getUser();
          if (!userData) {
            router.push("/");
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/");
      }
    };

    checkAuth();
  }, [user, getUser, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <CircularProgress size="lg" color="default" />
      </div>
    );
  }

  // If user is authenticated, render the protected content
  if (user) {
    return children;
  }

  // If not authenticated, don't render anything (redirect is happening)
  return null;
};

export default ProtectedRoute;
