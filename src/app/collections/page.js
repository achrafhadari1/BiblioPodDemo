import CollectionsClient from "./collections-client";

export const metadata = {
  title: "Collections - Organize Your Books",
  description:
    "Create and manage custom book collections. Organize your digital library by genre, author, reading status, or any custom categories with BiblioPod.",
  openGraph: {
    title: "Collections - Organize Your Books | BiblioPod",
    description:
      "Create and manage custom book collections. Organize your digital library by genre, author, or custom categories.",
  },
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
