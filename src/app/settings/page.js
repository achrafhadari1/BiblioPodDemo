"use client";

import Settings from "@/components/pages/Settings";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SettingsPage() {
  usePageTitle("Settings");
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  );
}
