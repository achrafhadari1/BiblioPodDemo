"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "sonner";
import { NewNav } from "../components/NewNav";
import ShowcaseBanner from "../components/ShowcaseBanner";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-playfair",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();

  // Hide nav for "/" and "/read"
  const hideNav =
    pathname === "/" ||
    pathname === "/read" ||
    pathname === "/login" ||
    pathname === "/welcome" ||
    pathname === "/signup";

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <ShowcaseBanner />
          {!hideNav && <NewNav />}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
