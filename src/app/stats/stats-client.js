"use client";

import { ReadingStats } from "@/components/pages/ReadingStats";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function StatsClient() {
  usePageTitle("Reading Stats");

  return <ReadingStats />;
}
