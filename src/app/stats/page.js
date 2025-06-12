"use client";

import { ReadingStats } from "@/components/pages/ReadingStats";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function StatsPage() {
  usePageTitle("Reading Stats");

  return <ReadingStats />;
}
