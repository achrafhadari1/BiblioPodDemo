import StatsClient from "./stats-client";

export const metadata = {
  title: "Reading Statistics - Track Your Reading Progress",
  description:
    "View comprehensive reading statistics and analytics. Track your reading habits, progress over time, and gain insights into your reading patterns with detailed charts and metrics.",
  openGraph: {
    title: "Reading Statistics - Track Your Reading Progress | BiblioPod",
    description:
      "View comprehensive reading statistics and analytics. Track your reading habits and gain insights into your reading patterns.",
  },
};

export default function StatsPage() {
  return <StatsClient />;
}
