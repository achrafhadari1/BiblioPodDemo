"use client";

import { Highlights } from "@/components/pages/Highlights";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function HighlightsClient() {
  usePageTitle("Highlights");

  return (
    <ProtectedRoute>
      <Highlights />
    </ProtectedRoute>
  );
}
