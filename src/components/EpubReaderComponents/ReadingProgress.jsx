"use client";

import { useState, useEffect } from "react";
import { Clock, BookOpen, Target } from "lucide-react";

const ReadingProgress = ({
  currentPage,
  totalPages,
  currentPercentage,
  currentChapter,
  book,
  rendition,
}) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [readingSpeed, setReadingSpeed] = useState(250); // words per minute
  const [chapterTimeLeft, setChapterTimeLeft] = useState(null);

  // Calculate reading time estimates
  useEffect(() => {
    console.log("[READING_PROGRESS] Props received:", {
      currentPage,
      totalPages,
      currentPercentage,
      currentChapter,
      hasBook: !!book,
      hasRendition: !!rendition,
    });

    // Debug currentChapter specifically
    if (currentChapter) {
      console.log("[READING_PROGRESS] Current chapter is set:", currentChapter);
    } else {
      console.log("[READING_PROGRESS] Current chapter is empty/null");
    }

    if (!book || !rendition || !currentPercentage) return;

    const calculateReadingTime = async () => {
      try {
        // Get total word count (approximate)
        let totalWords = 0;
        let currentChapterWords = 0;
        let wordsRead = 0;

        const spine = book.spine;
        const currentLocation = rendition.currentLocation();
        let currentChapterIndex = -1;

        // Find current chapter index
        for (let i = 0; i < spine.length; i++) {
          const item = spine.get(i);
          if (currentLocation && currentLocation.start.href === item.href) {
            currentChapterIndex = i;
            break;
          }
        }

        for (let i = 0; i < spine.length; i++) {
          const item = spine.get(i);
          await item.load(book.load.bind(book));

          if (item.document) {
            const text = item.document.body.textContent || "";
            const words = text
              .split(/\s+/)
              .filter((word) => word.length > 0).length;
            totalWords += words;

            // Check if this is the current chapter
            if (i === currentChapterIndex) {
              currentChapterWords = words;
              // Estimate words read in current chapter based on percentage
              const chapterProgress = (currentPercentage / 100) * words;
              wordsRead += chapterProgress;
            } else if (i < currentChapterIndex) {
              // Chapters before current one are fully read
              wordsRead += words;
            }
          }
        }

        // Calculate time left
        const wordsRemaining = totalWords - wordsRead;
        const minutesLeft = Math.ceil(wordsRemaining / readingSpeed);

        // Calculate chapter time left
        const chapterWordsRemaining =
          currentChapterWords - currentChapterWords * (currentPercentage / 100);
        const chapterMinutesLeft = Math.ceil(
          chapterWordsRemaining / readingSpeed
        );

        setTimeLeft(minutesLeft);
        setChapterTimeLeft(chapterMinutesLeft);
      } catch (error) {
        console.warn("Could not calculate reading time:", error);
      }
    };

    calculateReadingTime();
  }, [book, rendition, currentPercentage, readingSpeed]);

  // Format time display
  const formatTime = (minutes) => {
    if (!minutes || minutes < 0) return "Unknown";

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage < 25) return "bg-red-500";
    if (percentage < 50) return "bg-orange-500";
    if (percentage < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-4">
      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Overall Progress
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.round(currentPercentage || 0)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
              currentPercentage || 0
            )}`}
            style={{ width: `${currentPercentage || 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Page {currentPage || 0}</span>
          <span>of {totalPages || 0}</span>
        </div>
      </div>

      {/* Chapter Info */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Current Chapter
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {currentChapter || (book ? "Current Chapter" : "Loading chapter...")}
        </div>
      </div>

      {/* Time Estimates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
              Chapter Left
            </span>
          </div>
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {formatTime(chapterTimeLeft)}
          </div>
        </div>

        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-900 dark:text-green-100">
              Book Left
            </span>
          </div>
          <div className="text-sm font-semibold text-green-900 dark:text-green-100">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Reading Speed Adjustment */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Reading Speed
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {readingSpeed} WPM
          </span>
        </div>

        <input
          type="range"
          min="100"
          max="500"
          step="25"
          value={readingSpeed}
          onChange={(e) => setReadingSpeed(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Slow</span>
          <span>Average</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        <div>Estimates based on {readingSpeed} words per minute</div>
        <div className="mt-1">
          Adjust reading speed above for better accuracy
        </div>
      </div>
    </div>
  );
};

export default ReadingProgress;
