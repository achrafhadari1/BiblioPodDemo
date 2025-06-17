"use client";

import { usePathname } from "next/navigation";
import { NewNav } from "../components/NewNav";

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // Hide nav for "/" and "/read"
  const hideNav =
    pathname === "/" ||
    pathname === "/read" ||
    pathname === "/login" ||
    pathname === "/welcome" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/signup";

  return (
    <>
      {!hideNav && <NewNav />}
      {children}
    </>
  );
}
