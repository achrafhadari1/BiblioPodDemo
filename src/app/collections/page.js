"use client";

import CollectionLists from "@/components/pages/Collection/CollectionLists";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function CollectionsPage() {
  usePageTitle("Collections");

  return <CollectionLists />;
}
