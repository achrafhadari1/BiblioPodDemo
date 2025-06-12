"use client";

import ChallengesPage from "@/components/pages/Challenges";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Challenges() {
  usePageTitle("Challenges");

  return (
    <ProtectedRoute>
      <ChallengesPage />
    </ProtectedRoute>
  );
}
