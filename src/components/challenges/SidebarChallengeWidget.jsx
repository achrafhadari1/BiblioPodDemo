"use client";
import React, { useState, useEffect } from "react";
import { Trophy, Plus, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { bookStorageDB } from "../../utils/bookStorageDB";

const SidebarChallengeWidget = () => {
  const router = useRouter();
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveChallenge();
  }, []);

  const fetchActiveChallenge = async () => {
    try {
      console.log("Fetching active challenge from IndexedDB");

      // Get all challenges and find the most recent one (or first one for demo)
      const challenges = await bookStorageDB.getChallenges();

      if (challenges.length > 0) {
        // For demo purposes, use the first challenge as "active"
        // In a real app, you'd have an "active" flag or similar
        const activeChallenge = challenges[0];

        // Get full challenge details with books
        const challengeWithBooks = await bookStorageDB.getChallenge(
          activeChallenge.id
        );
        setActiveChallenge(challengeWithBooks);

        console.log("Active challenge loaded:", challengeWithBooks);
      }
    } catch (error) {
      console.error("Error fetching active challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-playfair font-bold text-lg">Reading Challenge</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-playfair font-bold text-lg">Reading Challenge</h3>
        <button
          onClick={() => router.push("/challenges")}
          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
        >
          View All
        </button>
      </div>

      {activeChallenge ? (
        <div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border border-amber-100"
          onClick={() => router.push("/challenges")}
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mr-3">
              <Trophy size={20} />
            </div>
            <div>
              <h4 className="font-medium text-sm">{activeChallenge.title}</h4>
              <p className="text-xs text-gray-600">
                {activeChallenge.progress || 0} of {activeChallenge.goal_count}{" "}
                books
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span>
                {Math.round(
                  ((activeChallenge.progress || 0) /
                    activeChallenge.goal_count) *
                    100
                )}
                %
              </span>
            </div>
            <div className="w-full h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    ((activeChallenge.progress || 0) /
                      activeChallenge.goal_count) *
                      100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          {activeChallenge.deadline && (
            <div className="mt-3 text-xs text-gray-500">
              Deadline:{" "}
              {new Date(activeChallenge.deadline).toLocaleDateString()}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-500 mr-3">
              <Trophy size={20} />
            </div>
            <div>
              <h4 className="font-medium text-sm">No Active Challenge</h4>
              <p className="text-xs text-gray-500">
                Create your first challenge
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/challenges")}
            className="w-full bg-amber-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Create Challenge
          </button>
        </div>
      )}
    </div>
  );
};

export default SidebarChallengeWidget;
