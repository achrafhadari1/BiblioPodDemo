import React from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "@nextui-org/react";
import { Input } from "../ui/input";

export const ActionButtons = ({
  sortedFilteredBooks,
  uploadLoading,
  handleFileChange,
}) => {
  const navigate = useNavigate();

  const currentBook = sortedFilteredBooks.find(
    (book) => book.progress > 0 && book.progress < 100
  );

  return (
    <div className="flex gap-4 mb-8">
      {currentBook && (
        <button
          onClick={() => navigate(`/read?book=${currentBook.isbn}`)}
          className="bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800"
        >
          Continue reading
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
      )}
      <label
        className={`px-6 py-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
          uploadLoading
            ? "bg-gray-400 text-gray-600 cursor-not-allowed"
            : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        {uploadLoading ? "Uploading..." : "Upload ePub"}
        {uploadLoading ? (
          <CircularProgress size="sm" color="default" />
        ) : (
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        )}
        <Input
          id="picture"
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept=".epub"
          type="file"
          disabled={uploadLoading}
        />
      </label>
    </div>
  );
};
