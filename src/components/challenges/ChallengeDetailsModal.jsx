import React from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

const ChallengeDetailsModal = ({
  showModal,
  onClose,
  challenge,
  onDeleteChallenge,
  onAddBookToChallenge,
  onRemoveBookFromChallenge,
  availableBooks = [],
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

  if (!showModal || !challenge) return null;

  // Show loading state if challenge books are not loaded yet
  const isLoading = challenge && !challenge.hasOwnProperty("books");

  return (
    <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full p-4 sm:p-6 overflow-y-auto max-h-[95vh] sm:max-h-[90vh] relative animate-fadeIn">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-gray-600">
              Loading challenge details...
            </span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div className="flex-1 pr-4">
                <h2 className="font-playfair text-xl sm:text-2xl font-bold">
                  {challenge.title}
                </h2>
                {challenge.description && (
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    {challenge.description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft size={20} className="transform rotate-45" />
              </button>
            </div>

            {/* Challenge Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium">Goal</h3>
                </div>
                <p className="text-2xl font-bold">
                  {challenge.goal_count} books
                </p>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium">Progress</h3>
                </div>
                <p className="text-2xl font-bold">
                  {challenge.booksInChallenge || 0}/{challenge.goal_count}
                </p>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      challenge.status === "completed"
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        ((challenge.booksInChallenge || 0) /
                          challenge.goal_count) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium">Deadline</h3>
                </div>
                <p className="text-lg font-medium">
                  {challenge.deadline
                    ? new Date(challenge.deadline).toLocaleDateString()
                    : "No deadline"}
                </p>
                {challenge.deadline && (
                  <p className="text-sm text-gray-600 mt-1">
                    {getTimeRemaining(challenge.deadline)}
                  </p>
                )}
              </div>
            </div>

            {/* Books in Challenge */}
            <div className="mb-6">
              <h3 className="font-playfair text-xl font-bold mb-4">
                Books in this Challenge
              </h3>

              {challenge.books && challenge.books.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {challenge.books.map((book, index) => {
                    // book is already a full book object from the processed challenge data
                    if (!book || !book.isbn || typeof book !== "object") {
                      // If book is invalid, show placeholder
                      return (
                        <div
                          key={book?.isbn || `invalid-${index}`}
                          className="flex items-center bg-gray-50 rounded-lg p-3"
                        >
                          <div className="w-16 h-20 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                            <BookOpen size={20} className="text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-500">
                              Book not found
                            </h4>
                            <p className="text-sm text-gray-400">
                              Invalid book data:{" "}
                              {typeof book === "string" ? book : "Unknown"}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveBookFromChallenge(
                                typeof book === "string" ? book : book?.isbn
                              );
                            }}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={book.isbn}
                        className="flex items-center bg-gray-50 rounded-lg p-3"
                      >
                        <img
                          src={
                            book.thumbnail ||
                            book.cover ||
                            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=687&auto=format&fit=crop"
                          }
                          alt={book.title}
                          className="w-16 h-20 object-cover rounded-md mr-3 shadow-sm"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {String(book.title || "Unknown Title")}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {String(book.author || "Unknown Author")}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBookFromChallenge(book.isbn);
                          }}
                          className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-2">
                    No books added to this challenge yet
                  </p>
                  <p className="text-sm text-gray-400">
                    Add books to track your progress
                  </p>
                </div>
              )}
            </div>

            {/* Add Books Section */}
            <div className="mb-8">
              <h3 className="font-playfair text-xl font-bold mb-4">
                Add Books to Challenge
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableBooks
                  .filter(
                    (book) =>
                      !challenge.books?.some(
                        (challengeBook) => challengeBook.isbn === book.isbn
                      )
                  )
                  .slice(0, 6)
                  .map((book) => (
                    <div
                      key={book.isbn}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md cursor-pointer transition-shadow"
                      onClick={() => onAddBookToChallenge(book)}
                    >
                      <div className="relative h-40">
                        <img
                          src={
                            book.thumbnail ||
                            book.cover ||
                            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=687&auto=format&fit=crop"
                          }
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                          <div className="p-3 text-white">
                            <h4 className="font-medium">
                              {String(book.title || "Unknown Title")}
                            </h4>
                            <p className="text-sm opacity-90">
                              {String(book.author || "Unknown Author")}
                            </p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-sm">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {availableBooks.filter(
                (book) =>
                  !challenge.books?.some(
                    (challengeBook) => challengeBook.isbn === book.isbn
                  )
              ).length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-2">
                    No more books available to add
                  </p>
                  <p className="text-sm text-gray-400">
                    All your books are already in this challenge
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 border-t pt-4">
              <button
                onClick={() => onDeleteChallenge(challenge.id)}
                className="w-full sm:w-auto px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 order-2 sm:order-1"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete Challenge</span>
                <span className="sm:hidden">Delete</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors order-1 sm:order-2"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailsModal;
