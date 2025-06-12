"use client";

import { Highlights } from "@/components/pages/Highlights";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function HighlightsPage() {
  usePageTitle("Highlights");

  return (
    <ProtectedRoute>
      <Highlights />
    </ProtectedRoute>
  );
}
