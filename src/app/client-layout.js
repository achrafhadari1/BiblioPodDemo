"use client";

import { usePathname } from "next/navigation";
import { NewNav } from "../components/NewNav";
import ShowcaseBanner from "../components/ShowcaseBanner";

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // Hide nav for "/" and "/read"
  const hideNav =
    pathname === "/" ||
    pathname === "/read" ||
    pathname === "/login" ||
    pathname === "/welcome" ||
    pathname === "/signup";

  return (
    <>
      <ShowcaseBanner />
      {!hideNav && <NewNav />}
      {children}
    </>
  );
}
