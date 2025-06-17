import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "sonner";
import { NewNav } from "../components/NewNav";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ClientLayout from "./client-layout.js";

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

export const metadata = {
  title: {
    default: "BiblioPod - Your Personal Digital Library & Reading Platform",
    template: "%s | BiblioPod",
  },
  description:
    "BiblioPod is a comprehensive digital library and reading platform. Upload ePub books, track reading progress, create collections, set reading challenges, and enjoy a privacy-first reading experience with local storage.",
  keywords: [
    "ebook reader",
    "digital library",
    "epub reader",
    "reading tracker",
    "book management",
    "reading challenges",
    "book collections",
    "privacy-first",
    "offline reading",
    "book highlights",
    "reading statistics",
    "personal library",
  ],
  authors: [{ name: "BiblioPod Team" }],
  creator: "BiblioPod",
  publisher: "BiblioPod",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://bibliopod.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bibliopod.vercel.app",
    title: "BiblioPod - Your Personal Digital Library & Reading Platform",
    description:
      "Upload ePub books, track reading progress, create collections, and enjoy a privacy-first reading experience with local storage. No registration required.",
    siteName: "BiblioPod",
    images: [
      {
        url: "/logo_long_bg.png",
        width: 1200,
        height: 630,
        alt: "BiblioPod - Digital Library Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BiblioPod - Your Personal Digital Library",
    description:
      "Privacy-first ebook reader with local storage, reading challenges, and comprehensive library management.",
    images: ["/logo_long_bg.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add verification codes when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/Untitled-1.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
