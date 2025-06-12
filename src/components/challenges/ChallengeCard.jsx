import React from "react";
import { BookOpen, Calendar, Clock, Trophy } from "lucide-react";

const ChallengeCard = ({
  challenge,
  onChallengeClick,
  challengeCategories,
}) => {
  const getTimeRemaining = (deadline) => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const now = new Date();

    if (deadlineDate <= now) {
      return "Expired";
    }

    const diffTime = Math.abs(deadlineDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer transform hover:-rotate-1 hover:scale-[1.01] "
      onClick={() => onChallengeClick(challenge)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-['Playfair_Display',serif] text-xl font-bold">
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="text-gray-600 text-sm mt-1">
                {challenge.description}
              </p>
            )}
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              challenge.status === "completed"
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {challenge.status === "completed" ? "Completed" : "In Progress"}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <BookOpen size={14} />
                Progress
              </span>
              <span className="font-semibold">
                {challenge.booksInChallenge || 0}/{challenge.goal_count} books
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  challenge.status === "completed"
                    ? "bg-green-500"
                    : "bg-amber-500"
                }`}
                style={{
                  width: `${Math.min(
                    ((challenge.booksInChallenge || 0) / challenge.goal_count) *
                      100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(challenge.created_at).toLocaleDateString()}
            </div>

            {challenge.deadline && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {getTimeRemaining(challenge.deadline)}
              </div>
            )}
          </div>

          {challenge.categories && challenge.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {challenge.categories.map((categoryId) => {
                const category = challengeCategories.find(
                  (cat) => cat.id === categoryId
                );
                return category ? (
                  <span
                    key={categoryId}
                    className={`text-xs px-2 py-0.5 rounded-full ${category.color}`}
                  >
                    {category.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
