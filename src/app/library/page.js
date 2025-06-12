import LibraryClient from "./library-client";

export const metadata = {
  title: "Library - Your Digital Book Collection",
  description:
    "Browse and manage your personal digital library. Upload ePub books, organize your collection, and start reading with BiblioPod's advanced ebook reader.",
  openGraph: {
    title: "Library - Your Digital Book Collection | BiblioPod",
    description:
      "Browse and manage your personal digital library. Upload ePub books, organize your collection, and start reading.",
  },
};

export default function LibraryPage() {
  return <LibraryClient />;
}
