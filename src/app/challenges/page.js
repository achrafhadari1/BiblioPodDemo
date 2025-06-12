import ChallengesClient from "./challenges-client";

export const metadata = {
  title: "Reading Challenges - Set and Track Your Reading Goals",
  description:
    "Create custom reading challenges, set goals, and track your progress. Challenge yourself to read more books and achieve your reading objectives with BiblioPod.",
  openGraph: {
    title: "Reading Challenges - Set and Track Your Reading Goals | BiblioPod",
    description:
      "Create custom reading challenges, set goals, and track your progress. Challenge yourself to read more books.",
  },
};

export default function Challenges() {
  return <ChallengesClient />;
}
