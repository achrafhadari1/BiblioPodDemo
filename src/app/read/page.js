"use client";

import EpubReader from "@/components/pages/EpubReader";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ReadPage() {
  usePageTitle("Reading");

  return (
    <ProtectedRoute>
      <EpubReader />
    </ProtectedRoute>
  );
}
