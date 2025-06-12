import React from "react";

export const HomePageHeader = ({ user, searchTerm, setSearchTerm }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="!font-playfair ">
          <h1 className="  text-4xl font-bold text-gray-900 mb-2">
            Happy reading,
          </h1>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {user?.name || "Harvey"}
          </h1>
          <p className="text-gray-600 max-w-md">
            Find your perfect book and start your reading journey today. Upload
            your own ePub books or continue with your current reading.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search book name, author, edition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
