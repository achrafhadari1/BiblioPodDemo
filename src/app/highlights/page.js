import HighlightsClient from "./highlights-client";

export const metadata = {
  title: "Highlights - Your Reading Notes and Quotes",
  description:
    "View and manage all your book highlights and notes. Search through your saved quotes, organize your thoughts, and revisit important passages from your reading.",
  openGraph: {
    title: "Highlights - Your Reading Notes and Quotes | BiblioPod",
    description:
      "View and manage all your book highlights and notes. Search through your saved quotes and revisit important passages.",
  },
};

export default function HighlightsPage() {
  return <HighlightsClient />;
}
