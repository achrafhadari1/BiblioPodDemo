"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import ePub from "epubjs";
import { BookDisplay } from "../BookDisplay";
import { ContinueReading } from "../ContinueReading";
import { Input } from "../ui/input";
import "../../index.css";
import { MdNavigateNext } from "react-icons/md";
import { AuthProvider, useAuthContext } from "../../context/AuthContext";
import { CircularProgress } from "@nextui-org/react";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { useFileUploadImproved } from "../homepage/hooks/useFileUploadImproved";
import "../../utils/migrateToIndexedDB"; // Auto-run migration

import { BsListColumnsReverse } from "react-icons/bs";
import { NewNav } from "../NewNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "../Footer";
import { FilterByCategory } from "../FilterByCategory";
import { SidebarCollectionShelf } from "../SidebarCollectionShelf";
import SidebarChallengeWidget from "../challenges/SidebarChallengeWidget";
import StorageUsageIndicator from "../StorageUsageIndicator";
export const HomePage = () => {
  const [fileDetails, setFileDetails] = useState([]);
  const [genres, setGenres] = useState([]);
  const [sortOption, setSortOption] = useState("updated");
  const [selectedTab, setSelectedTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  const router = useRouter();
  const { user, logout } = useAuthContext();

  // Define fetchBooks function first
  const fetchBooks = async () => {
    try {
      console.log("Fetching books from IndexedDB");

      // Get books from IndexedDB
      const books = await bookStorageDB.getAllBooks();

      // Add progress data to each book
      const booksWithProgress = await Promise.all(
        books.map(async (book) => {
          const progress = await bookStorageDB.getReadingProgress(book.isbn);
          return {
            ...book,
            progress: progress.current_percentage || 0,
          };
        })
      );

      setFileDetails(booksWithProgress);
      setGenres(booksWithProgress.map((book) => book.genre));
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use the improved file upload hook
  const {
    uploadLoading,
    bookGoogle,
    storageUsage,
    handleFileChange,
    updateStorageUsage,
  } = useFileUploadImproved(user, fetchBooks);

  // Function to get selected book from localStorage
  const getSelectedBook = () => {
    const stored = localStorage.getItem("selectedBook");
    return stored ? JSON.parse(stored) : null;
  };

  // Initialize selected book
  useEffect(() => {
    setSelectedBook(getSelectedBook());
  }, []);

  // Listen for selectedBook changes and cache refresh events
  useEffect(() => {
    const handleSelectedBookChange = () => {
      setSelectedBook(getSelectedBook());
    };

    const handleCacheRefresh = async () => {
      console.log("Cache refresh event detected, refreshing book list...");
      const { refreshBookListWithProgress } = await import(
        "../../utils/bookCache"
      );
      const refreshedBooks = refreshBookListWithProgress();
      if (refreshedBooks) {
        setFileDetails(refreshedBooks);
        setGenres(refreshedBooks.map((book) => book.genre));
      }
    };

    window.addEventListener("selectedBookChanged", handleSelectedBookChange);
    window.addEventListener("storage", handleSelectedBookChange);
    window.addEventListener("bookCacheRefreshed", handleCacheRefresh);

    return () => {
      window.removeEventListener(
        "selectedBookChanged",
        handleSelectedBookChange
      );
      window.removeEventListener("storage", handleSelectedBookChange);
      window.removeEventListener("bookCacheRefreshed", handleCacheRefresh);
    };
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch books associated with the logged-in user
      fetchBooks();
    }
  }, [user]);
  const handleTabChange = (key) => {
    setSelectedTab(key);
    console.log("Tab changed to:", key); // Log the new tab value
  };

  const handleDeleteBook = async (deletedIdentifier) => {
    try {
      // Delete from IndexedDB
      await bookStorageDB.deleteBook(deletedIdentifier);

      // Filter out the deleted book from fileDetails
      const updatedFileDetails = fileDetails.filter(
        (book) => book.isbn !== deletedIdentifier
      );
      setFileDetails(updatedFileDetails);
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  console.log(fileDetails);

  const updateBookData = (updatedBook, identifier) => {
    setFileDetails((prevFileDetails) =>
      prevFileDetails.map((book) =>
        book.isbn === identifier ? { ...book, ...updatedBook } : book
      )
    );
  };

  const [selectedGenres, setSelectedGenres] = useState([]);

  const handleCheckboxChange = (event) => {
    const { value } = event.target;
    if (selectedGenres.includes(value)) {
      setSelectedGenres(selectedGenres.filter((genre) => genre !== value));
    } else {
      setSelectedGenres([...selectedGenres, value]);
    }
  };

  const sortedFilteredBooks = fileDetails
    .filter((book) => {
      // Search filtering
      const searchMatch =
        searchTerm === "" ||
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.publisher?.toLowerCase().includes(searchTerm.toLowerCase());

      // Genre filtering
      const genreMatch =
        selectedGenres.length === 0 || selectedGenres.includes(book.genre);

      // Tab-based filtering
      let tabMatch = true;

      if (selectedTab === "Currently Reading") {
        // Check if progress is defined and less than 100
        tabMatch =
          book.progress != null && book.progress > 0 && book.progress < 100;
        console.log(tabMatch);
      } else if (selectedTab === "Completed") {
        // Check if progress is defined and exactly 100
        tabMatch = book.progress != null && book.progress === 100;
      }
      return searchMatch && genreMatch && tabMatch;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "last_uploaded":
          return new Date(b.created_at) - new Date(a.created_at);
        case "alphabetic":
          return a.title.localeCompare(b.title);
        case "older":
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return new Date(b.updated_at) - new Date(a.updated_at);
      }
    });

  const sortOptions = [
    { label: "Updated", value: "updated" },
    { label: "Last Uploaded", value: "last_uploaded" },
    { label: "Alphabetic", value: "alphabetic" },
    { label: "Older", value: "older" },
  ];

  if (loading) {
    // Render a loading indicator while fetching user
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <CircularProgress size="lg" color="default" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:ml-auto lg:w-[96%] w-full pt-16 lg:pt-0 pb-20 lg:pb-0">
      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Happy reading,
              </h1>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {user?.name || "Harvey"}
              </h1>
              <p className="text-gray-600 max-w-md mx-auto lg:mx-0 text-sm sm:text-base">
                Find your perfect book and start your reading journey today.
                Upload your own ePub books or continue with your current
                reading.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm lg:max-w-none lg:w-80">
                <input
                  type="text"
                  placeholder="Search book name, author, edition..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm sm:text-base"
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center lg:justify-start">
            {(() => {
              const currentBook = sortedFilteredBooks.find(
                (book) => book.progress > 0 && book.progress < 100
              );
              return currentBook ? (
                <button
                  onClick={() => router.push(`/read?book=${currentBook.isbn}`)}
                  className="bg-gray-900 text-white px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 text-sm sm:text-base w-full sm:w-auto"
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
              ) : null;
            })()}
            <label className="bg-amber-500 text-white px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-600 cursor-pointer text-sm sm:text-base w-full sm:w-auto">
              Upload ePub
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
              <input
                id="picture"
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept=".epub"
                type="file"
              />
            </label>
          </div>

          {/* Storage Usage Indicator */}
          <div className="mb-6">
            <StorageUsageIndicator />
          </div>

          {/* Continue Reading Section */}
          {sortedFilteredBooks.find(
            (book) => book.progress > 0 && book.progress < 100
          ) && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              {(() => {
                const currentBook = sortedFilteredBooks.find(
                  (book) => book.progress > 0 && book.progress < 100
                );
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={currentBook.thumbnail}
                        alt={currentBook.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                      <div>
                        <h3 className="font-semibold text-lg">
                          {currentBook.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Currently at {currentBook.progress}%
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/read?book=${currentBook.isbn}`)
                      }
                      className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600"
                    >
                      Continue
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : fileDetails.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Your Library is Empty!
              </h3>
              <p className="text-gray-600 mb-6">
                Add as many books as you want by from the button above
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Books Grid using BookDisplay */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {sortedFilteredBooks.map((book) => (
                <BookDisplay
                  key={book.isbn}
                  title={book.title}
                  author={book.author}
                  img={book.thumbnail}
                  identifier={book.isbn}
                  userId={book.userId}
                  bookDetails={book}
                  rating={book.rating}
                  progress={book.progress}
                  onDeleteBook={(deletedId) => {
                    setFileDetails((prev) =>
                      prev.filter((book) => book.isbn !== deletedId)
                    );
                  }}
                  updateBookData={(updatedBook) => {
                    setFileDetails((prev) =>
                      prev.map((book) =>
                        book.isbn === updatedBook.isbn
                          ? { ...book, ...updatedBook }
                          : book
                      )
                    );
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reader Features Sidebar */}
      <div className="hidden lg:flex lg:w-[320px] border-l border-gray-100 flex-col overflow-y-auto">
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
          <SidebarChallengeWidget />

          {/* Favorite Genres */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-playfair font-bold text-lg">
                Favorite Genres
              </h3>
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
    </div>
  );
};
