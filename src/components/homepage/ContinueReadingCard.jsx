import React from "react";
import { useNavigate } from "react-router-dom";

export const ContinueReadingCard = ({ sortedFilteredBooks }) => {
  const navigate = useNavigate();

  const currentBook = sortedFilteredBooks.find(
    (book) => book.progress > 0 && book.progress < 100
  );

  if (!currentBook) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={currentBook.thumbnail}
            alt={currentBook.title}
            className="w-16 h-20 object-cover rounded"
          />
          <div>
            <h3 className="font-semibold text-lg">{currentBook.title}</h3>
            <p className="text-gray-600 text-sm">
              Currently at {currentBook.progress}%
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/read?book=${currentBook.isbn}`)}
          className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
