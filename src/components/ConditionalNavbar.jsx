"use client";

import { usePathname } from "next/navigation";
import { NewNav } from "./NewNav";

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Hide navbar on these paths (same as original App.jsx)
  const hideNavbarRoutes = ["/read", "/", "/login", "/signup", "/welcome"];

  const shouldHideNavbar = hideNavbarRoutes.includes(pathname);

  console.log("ConditionalNavbar - pathname:", pathname);
  console.log("ConditionalNavbar - shouldHideNavbar:", shouldHideNavbar);

  // Don't render navbar if it should be hidden
  if (shouldHideNavbar) {
    console.log("ConditionalNavbar - hiding navbar");
    return null;
  }

  console.log("ConditionalNavbar - showing navbar");
  return <NewNav />;
}
