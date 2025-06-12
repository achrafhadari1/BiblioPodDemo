"use client";

import { Collection } from "@/components/pages/Collection/Collection";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function CollectionPage() {
  usePageTitle("Collections");

  return (
    <ProtectedRoute>
      <Collection />
    </ProtectedRoute>
  );
}
