"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../../context/AuthContext";
import { bookStorageDB } from "../../utils/bookStorageDB";
import ChallengeCard from "../challenges/ChallengeCard";
import CreateChallengeModal from "../challenges/CreateChallengeModal";
import ChallengeDetailsModal from "../challenges/ChallengeDetailsModal";

// Challenge categories
const challengeCategories = [
  { id: "fantasy", name: "Fantasy", color: "bg-purple-100 text-purple-600" },
  { id: "sci-fi", name: "Sci-Fi", color: "bg-blue-100 text-blue-600" },
  { id: "classics", name: "Classics", color: "bg-amber-100 text-amber-600" },
  { id: "mystery", name: "Mystery", color: "bg-red-100 text-red-600" },
  { id: "romance", name: "Romance", color: "bg-pink-100 text-pink-600" },
  {
    id: "female-authors",
    name: "Female Authors",
    color: "bg-green-100 text-green-600",
  },
  {
    id: "non-fiction",
    name: "Non-Fiction",
    color: "bg-gray-100 text-gray-600",
  },
  { id: "series", name: "Series", color: "bg-indigo-100 text-indigo-600" },
];

const ChallengesPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [challenges, setChallenges] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state for new challenge
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    goal_count: 5,
    categories: [],
    deadline: "",
    is_private: false,
  });

  useEffect(() => {
    if (user) {
      fetchChallenges();
      fetchUserBooks();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      console.log("Fetching challenges from IndexedDB");
      const challengesData = await bookStorageDB.getChallenges();

      // Calculate progress for each challenge and fetch full book data
      const challengesWithProgress = await Promise.all(
        challengesData.map(async (challenge) => {
          if (!challenge.books || challenge.books.length === 0) {
            return { ...challenge, progress: 0, books: [] };
          }

          // Fetch full book data and check reading progress for each book in the challenge
          let completedBooks = 0;
          const booksWithData = await Promise.all(
            challenge.books.map(async (bookIsbn) => {
              const book = await bookStorageDB.getBook(bookIsbn);
              const progress = await bookStorageDB.getReadingProgress(bookIsbn);
              if (progress && progress.current_percentage === 100) {
                completedBooks++;
              }
              return book;
            })
          );

          // Filter out any null books (in case some ISBNs don't have corresponding books)
          const validBooks = booksWithData.filter((book) => book !== null);

          return {
            ...challenge,
            books: validBooks,
            progress: completedBooks,
            booksInChallenge: validBooks.length,
            status:
              completedBooks >= challenge.goal_count
                ? "completed"
                : "in_progress",
          };
        })
      );

      setChallenges(challengesWithProgress);
      console.log("Loaded challenges with progress:", challengesWithProgress);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBooks = async () => {
    try {
      console.log("Fetching user books from IndexedDB");
      const booksData = await bookStorageDB.getAllBooks();
      setUserBooks(booksData);
      console.log("Loaded user books:", booksData);
    } catch (error) {
      console.error("Error fetching user books:", error);
    }
  };

  const handleCreateChallenge = async () => {
    if (!newChallenge.title) {
      toast.error("Please add a title for your challenge");
      return;
    }

    if (!newChallenge.goal_count || newChallenge.goal_count < 1) {
      toast.error("Please set a goal of at least 1 book");
      return;
    }

    try {
      console.log("Creating challenge:", newChallenge);

      // Create challenge using IndexedDB
      const createdChallenge = await bookStorageDB.addChallenge(newChallenge);

      if (createdChallenge) {
        setChallenges([...challenges, createdChallenge]);
        setShowCreateModal(false);
        toast.success("Challenge created successfully!");

        // Reset form
        setNewChallenge({
          title: "",
          description: "",
          goal_count: 5,
          categories: [],
          deadline: "",
          is_private: false,
        });
      } else {
        throw new Error("Failed to create challenge");
      }
    } catch (error) {
      console.error("Error creating challenge:", error);
      toast.error("Failed to create challenge");
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    try {
      console.log("Deleting challenge:", challengeId);

      // Delete challenge using IndexedDB
      const success = await bookStorageDB.deleteChallenge(challengeId);

      if (success) {
        setChallenges(
          challenges.filter((challenge) => challenge.id !== challengeId)
        );
        setShowDetailsModal(false);
        toast.success("Challenge deleted");
      } else {
        throw new Error("Failed to delete challenge");
      }
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("Failed to delete challenge");
    }
  };

  const handleAddBookToChallenge = async (book) => {
    if (!currentChallenge) return;

    // Check if book is already in the challenge using ISBN
    if (
      currentChallenge.books?.some(
        (challengeBook) => challengeBook.isbn === book.isbn
      )
    ) {
      toast.error("This book is already part of the challenge");
      return;
    }

    try {
      console.log("Adding book to challenge:", book.isbn, currentChallenge.id);

      // Add book to challenge using IndexedDB
      const updatedChallenge = await bookStorageDB.addBookToChallenge(
        currentChallenge.id,
        book.isbn
      );

      if (updatedChallenge) {
        // Calculate progress for the updated challenge and fetch full book data
        let completedBooks = 0;
        let booksWithData = [];

        if (updatedChallenge.books && updatedChallenge.books.length > 0) {
          booksWithData = await Promise.all(
            updatedChallenge.books.map(async (bookIsbn) => {
              const book = await bookStorageDB.getBook(bookIsbn);
              const progress = await bookStorageDB.getReadingProgress(bookIsbn);
              if (progress && progress.current_percentage === 100) {
                completedBooks++;
              }
              return book;
            })
          );
          // Filter out any null books
          booksWithData = booksWithData.filter((book) => book !== null);
        }

        const challengeWithProgress = {
          ...updatedChallenge,
          books: booksWithData,
          progress: completedBooks,
          booksInChallenge: booksWithData.length,
          status:
            completedBooks >= updatedChallenge.goal_count
              ? "completed"
              : "in_progress",
        };

        // Update challenges list with processed data
        const updatedChallenges = challenges.map((challenge) =>
          challenge.id === currentChallenge.id
            ? challengeWithProgress
            : challenge
        );
        setChallenges(updatedChallenges);

        // Update current challenge with processed data
        setCurrentChallenge(challengeWithProgress);

        toast.success("Book added to challenge");
      } else {
        throw new Error("Failed to add book to challenge");
      }
    } catch (error) {
      console.error("Error adding book to challenge:", error);
      toast.error("Failed to add book to challenge");
    }
  };

  const handleRemoveBookFromChallenge = async (bookIsbn) => {
    if (!currentChallenge) return;

    try {
      console.log(
        "Removing book from challenge:",
        bookIsbn,
        currentChallenge.id
      );

      // Remove book from challenge using IndexedDB
      const updatedChallenge = await bookStorageDB.removeBookFromChallenge(
        currentChallenge.id,
        bookIsbn
      );

      if (updatedChallenge) {
        // Calculate progress for the updated challenge and fetch full book data
        let completedBooks = 0;
        let booksWithData = [];

        if (updatedChallenge.books && updatedChallenge.books.length > 0) {
          booksWithData = await Promise.all(
            updatedChallenge.books.map(async (bookIsbn) => {
              const book = await bookStorageDB.getBook(bookIsbn);
              const progress = await bookStorageDB.getReadingProgress(bookIsbn);
              if (progress && progress.current_percentage === 100) {
                completedBooks++;
              }
              return book;
            })
          );
          // Filter out any null books
          booksWithData = booksWithData.filter((book) => book !== null);
        }

        const challengeWithProgress = {
          ...updatedChallenge,
          books: booksWithData,
          progress: completedBooks,
          booksInChallenge: booksWithData.length,
          status:
            completedBooks >= updatedChallenge.goal_count
              ? "completed"
              : "in_progress",
        };

        // Update challenges list with processed data
        const updatedChallenges = challenges.map((challenge) =>
          challenge.id === currentChallenge.id
            ? challengeWithProgress
            : challenge
        );
        setChallenges(updatedChallenges);

        // Update current challenge with processed data
        setCurrentChallenge(challengeWithProgress);

        toast.success("Book removed from challenge");
      } else {
        throw new Error("Failed to remove book from challenge");
      }
    } catch (error) {
      console.error("Error removing book from challenge:", error);
      toast.error("Failed to remove book from challenge");
    }
  };

  const openChallengeDetails = async (challenge) => {
    try {
      console.log("Opening challenge details:", challenge.id);

      // Use the processed challenge data from the challenges list instead of fetching raw data
      const processedChallenge = challenges.find((c) => c.id === challenge.id);

      if (processedChallenge) {
        setCurrentChallenge(processedChallenge);
        setShowDetailsModal(true);
      } else {
        toast.error("Failed to load challenge details");
      }
    } catch (error) {
      console.error("Error fetching challenge details:", error);
      toast.error("Failed to load challenge details");
    }
  };

  const filteredChallenges = challenges
    .filter(
      (challenge) =>
        challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (challenge.description &&
          challenge.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()))
    )
    .filter((challenge) => {
      if (filterStatus === "all") return true;
      return challenge.status === filterStatus;
    });

  if (loading) {
    return (
      <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading challenges...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-left w-full">
          <button
            onClick={() => router.push("/library")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">
            Reading Challenges
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-60 py-2 pl-10 pr-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search size={16} className="text-gray-400" />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
            >
              <option value="all">All Challenges</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* New Challenge Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-amber-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Challenge
          </button>
        </div>
      </div>

      {/* Main Content */}
      {/* Challenge Cards */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onChallengeClick={openChallengeDetails}
              challengeCategories={challengeCategories}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={24} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No challenges found
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filters to find your challenges."
              : "Create your first reading challenge to track your goals and celebrate your literary achievements!"}
          </p>
          {searchTerm || filterStatus !== "all" ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
              }}
              className="bg-amber-500 text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto hover:bg-amber-600 transition-colors"
            >
              <X size={20} />
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-500 text-white px-6 py-3 rounded-full font-medium hover:bg-amber-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create First Challenge
            </button>
          )}
        </div>
      )}

      {/* Create Challenge Modal */}
      <CreateChallengeModal
        showModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newChallenge={newChallenge}
        setNewChallenge={setNewChallenge}
        onCreateChallenge={handleCreateChallenge}
        challengeCategories={challengeCategories}
      />

      {/* Challenge Details Modal */}
      <ChallengeDetailsModal
        showModal={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        challenge={currentChallenge}
        onDeleteChallenge={handleDeleteChallenge}
        onAddBookToChallenge={handleAddBookToChallenge}
        onRemoveBookFromChallenge={handleRemoveBookFromChallenge}
        availableBooks={userBooks}
      />
    </div>
  );
};

export default ChallengesPage;
