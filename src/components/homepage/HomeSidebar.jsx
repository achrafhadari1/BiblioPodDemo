import React from "react";
import { SidebarCollectionShelf } from "../SidebarCollectionShelf";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
export const HomeSidebar = ({ user, sortedFilteredBooks }) => {
  const navigate = useNavigate();

  return (
    <div className="w-[320px] border-l border-gray-100 flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src="/profile.jpg"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium">
            {user?.name || "Alexander Mark"}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Collections Shelf */}
        <SidebarCollectionShelf />

        {/* Reading Challenge */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-playfair font-bold text-lg">
              Reading Challenge
            </h3>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-500 mr-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-sm">2025 Challenge</h4>
                <p className="text-xs text-gray-500">Coming Soon</p>
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-2">
                Reading challenges feature
              </p>
              <p className="text-xs text-gray-500">Will be available soon!</p>
            </div>
          </div>
        </div>

        {/* Favorite Genres */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-playfair font-bold text-lg">Favorite Genres</h3>
            <div className="flex gap-1">
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-600">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              // Get genres from actual books
              const genreMap = {};
              const genreIcons = {
                Fantasy: "🧙‍♂️",
                "Science Fiction": "🚀",
                Mystery: "🔍",
                "Historical Fiction": "📜",
                Romance: "💕",
                Thriller: "⚡",
                Biography: "👤",
                "Non-Fiction": "📚",
                Fiction: "📖",
                Adventure: "🗺️",
                Horror: "👻",
                Comedy: "😄",
              };

              // Count books by genre
              sortedFilteredBooks.forEach((book) => {
                const genre = book.genre || book.category || "Fiction";
                genreMap[genre] = (genreMap[genre] || 0) + 1;
              });

              // Convert to array and sort by count
              const genreArray = Object.entries(genreMap)
                .map(([name, count]) => ({
                  name,
                  books: count,
                  icon: genreIcons[name] || "📚",
                }))
                .sort((a, b) => b.books - a.books)
                .slice(0, 4);

              if (genreArray.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      No genres available yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Add books to see your favorite genres
                    </p>
                  </div>
                );
              }

              return genreArray.map((genre, index) => (
                <div
                  key={index}
                  className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-xl">
                        {genre.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{genre.name}</h4>
                        <p className="text-xs text-gray-500">
                          {genre.books} book{genre.books !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-amber-500">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9,18 15,12 9,6"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
