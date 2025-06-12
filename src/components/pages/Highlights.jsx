"use client";
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  MessageSquarePlus,
  Pencil,
  Search,
  Share2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AuthProvider, useAuthContext } from "../../context/AuthContext";

import { bookStorageDB } from "../../utils/bookStorageDB";

export const Highlights = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // const [activeNoteId, setActiveNoteId] = useState(null);
  // const [noteInput, setNoteInput] = useState("");
  const [highlights, setHighlights] = useState([]);
  const [filteredHighlights, setFilteredHighlights] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();
  // Fetch highlights from IndexedDB
  const fetchHighlights = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Loading highlights from IndexedDB");

      // Get all highlights from IndexedDB
      const allHighlights = await bookStorageDB.getHighlights();
      console.log("Raw highlights from IndexedDB:", allHighlights);

      // Get all books from IndexedDB
      const allBooks = await bookStorageDB.getAllBooks();
      console.log("All books from IndexedDB:", allBooks);

      // Create a map to track books with highlights
      const bookMap = new Map();
      const processedHighlights = [];

      // Process highlights and associate them with books
      allHighlights.forEach((highlight) => {
        // Find the book for this highlight
        const book = allBooks.find(
          (b) => b.isbn === highlight.book_isbn || b.id === highlight.book_isbn
        );

        if (book) {
          // Add book to map if not already there
          if (!bookMap.has(book.isbn)) {
            bookMap.set(book.isbn, {
              id: book.isbn,
              title: book.title || "Unknown Title",
              author: book.author || "Unknown Author",
              cover_image: book.thumbnail || book.cover_image_url || null,
              isbn: book.isbn,
              count: 0,
            });
          }

          // Process the highlight
          processedHighlights.push({
            id: highlight.id,
            text: highlight.text || highlight.content || "",
            book_id: book.isbn,
            book_isbn: book.isbn,
            bookTitle: book.title || "Unknown Title",
            bookAuthor: book.author || "Unknown Author",
            bookCover: book.thumbnail || book.cover_image_url || null,
            created_at: highlight.created_at || new Date().toISOString(),
            page: highlight.page || highlight.location || "unknown",
            color: highlight.color || "#fbbf24",
            note: highlight.note || null,
            cfi_range: highlight.cfi_range,
          });

          // Increment count for this book
          const bookData = bookMap.get(book.isbn);
          if (bookData) {
            bookData.count += 1;
          }
        }
      });

      // Convert book map to array and filter books with highlights
      const booksArray = Array.from(bookMap.values()).filter(
        (book) => book.count > 0
      );

      console.log("Processed highlights:", processedHighlights);
      console.log("Books with highlights:", booksArray);

      setHighlights(processedHighlights);
      setBooks(booksArray);
      setFilteredHighlights(processedHighlights);
    } catch (error) {
      console.error("Error fetching highlights:", error);
      toast.error("Failed to load highlights", {
        description:
          "There was an issue loading your highlights. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Fetch highlights from localStorage
    fetchHighlights();
  }, [fetchHighlights]);

  // Filter and sort highlights
  useEffect(() => {
    let result = [...highlights];

    // Apply book filter
    if (selectedBook) {
      result = result.filter((h) => h.book_isbn === selectedBook);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.text.toLowerCase().includes(query) ||
          (h.bookTitle && h.bookTitle.toLowerCase().includes(query)) ||
          (h.bookAuthor && h.bookAuthor.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "alphabetical":
        result.sort((a, b) => {
          const titleA = a.bookTitle || "";
          const titleB = b.bookTitle || "";
          return titleA.localeCompare(titleB);
        });
        break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    setFilteredHighlights(result);
  }, [highlights, searchQuery, selectedBook, sortBy]);

  // Handle adding/updating note
  // const handleSaveNote = async (id) => {
  //   if (!noteInput.trim()) return;

  //   try {
  //     const token = localStorage.getItem("token");

  //     await api.put(
  //       `/annotations/${id}`,
  //       { note: noteInput },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     const updatedHighlights = highlights.map((h) =>
  //       h.id === id ? { ...h, note: noteInput } : h
  //     );

  //     setHighlights(updatedHighlights);
  //     setActiveNoteId(null);
  //     setNoteInput("");
  //     toast.success("Note saved successfully");
  //   } catch (error) {
  //     console.error("Error saving note:", error);
  //     toast.error("Failed to save note", {
  //       description: "There was an issue saving your note. Please try again.",
  //     });
  //   }
  // };

  // Handle copy to clipboard
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Handle delete highlight
  const handleDeleteHighlight = async (id) => {
    try {
      // Delete from IndexedDB
      const success = await bookStorageDB.deleteHighlight(id);

      if (success) {
        // Update local state
        const updatedHighlights = highlights.filter((h) => h.id !== id);
        setHighlights(updatedHighlights);
        setFilteredHighlights(
          updatedHighlights.filter((h) => {
            // Apply current filters
            let include = true;
            if (selectedBook) {
              include = include && h.book_isbn === selectedBook;
            }
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              include =
                include &&
                (h.text.toLowerCase().includes(query) ||
                  (h.bookTitle && h.bookTitle.toLowerCase().includes(query)) ||
                  (h.bookAuthor && h.bookAuthor.toLowerCase().includes(query)));
            }
            return include;
          })
        );

        toast.success("Highlight deleted successfully");
      } else {
        throw new Error("Failed to delete highlight");
      }
    } catch (error) {
      console.error("Error deleting highlight:", error);
      toast.error("Failed to delete highlight", {
        description:
          "There was an issue deleting this highlight. Please try again.",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get color class based on highlight color
  const getColorClass = (color) => {
    const colorMap = {
      "#fbbf24": "bg-amber-100 text-amber-800 border-amber-200",
      "#3b82f6": "bg-blue-100 text-blue-800 border-blue-200",
      "#ef4444": "bg-red-100 text-red-800 border-red-200",
      "#10b981": "bg-green-100 text-green-800 border-green-200",
      "#6366f1": "bg-indigo-100 text-indigo-800 border-indigo-200",
      "#8b5cf6": "bg-purple-100 text-purple-800 border-purple-200",
      "#eab308": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "#14b8a6": "bg-teal-100 text-teal-800 border-teal-200",
    };

    return colorMap[color] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Get color name
  const getColorName = (color) => {
    const colorMap = {
      "#fbbf24": "Amber",
      "#3b82f6": "Blue",
      "#ef4444": "Red",
      "#10b981": "Green",
      "#6366f1": "Indigo",
      "#8b5cf6": "Purple",
      "#eab308": "Yellow",
      "#14b8a6": "Teal",
    };

    return colorMap[color] || "Highlight";
  };

  return (
    <div className="w-[96%] ml-auto flex-1 p-8 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-left w-full">
          <button
            onClick={() => router.push("/library")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">
            Highlights
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search highlights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-60 py-2 pl-10 pr-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search size={16} className="text-gray-400" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-4 py-2 border rounded-full text-sm flex items-center gap-2 ${
                selectedBook
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={16} />
              {selectedBook
                ? `${books.find((b) => b.isbn === selectedBook)?.title}`
                : "Filter by Book"}
              <ChevronDown size={14} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-full mt-2 right-0 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 animate-fadeIn">
                <div className="px-3 py-2 border-b border-gray-100">
                  <h4 className="font-medium text-sm">Filter by Book</h4>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setIsFilterOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>All Books</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {highlights.length}
                    </span>
                  </button>

                  {books.map((book) => (
                    <button
                      key={book.isbn}
                      onClick={() => {
                        setSelectedBook(book.isbn);
                        setIsFilterOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span>{book.title}</span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                        {book.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
            >
              <option value="recent">Recent First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">By Book Title</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading highlights...</span>
        </div>
      ) : filteredHighlights.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No highlights found
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery || selectedBook
              ? "Try adjusting your search or filters to find your highlights."
              : "You haven't highlighted any words yet. Start reading and highlight important words."}
          </p>
          {(searchQuery || selectedBook) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBook(null);
              }}
              className="bg-amber-500 text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto hover:bg-amber-600 transition-colors"
            >
              <X size={20} />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHighlights.map((highlight) => {
            const book = books.find((b) => b.isbn === highlight.book_isbn);

            return (
              <div
                key={highlight.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex items-center p-3 border-b border-gray-100">
                  {book?.cover_image && (
                    <div className="w-10 h-14 rounded-md overflow-hidden mr-3">
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {highlight.bookTitle || "Unknown Book"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Page {highlight.page || "unknown"}</span>
                      <span>•</span>
                      <span>{formatDate(highlight.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-center gap-2"></div>
                  <p className="text-sm text-gray-700 mb-4">
                    "{highlight.text}"
                  </p>

                  {/* {highlight.note && activeNoteId !== highlight.id && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-xs font-medium text-gray-700">
                          Note:
                        </h4>
                        <button
                          onClick={() => {
                            setActiveNoteId(highlight.id);
                            setNoteInput(highlight.note || "");
                          }}
                          className="text-amber-500 hover:text-amber-600"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">{highlight.note}</p>
                    </div>
                  )}

                  {activeNoteId === highlight.id && (
                    <div className="mb-4">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add your notes here..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        rows={3}
                      ></textarea>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => {
                            setActiveNoteId(null);
                            setNoteInput("");
                          }}
                          className="px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNote(highlight.id)}
                          className="px-3 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  )} */}

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <button
                      onClick={() => handleCopyText(highlight.text)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full"
                      title="Copy text"
                    >
                      <Copy size={16} />
                    </button>

                    <button
                      onClick={() => {
                        handleCopyText(
                          `"${highlight.text}" - ${highlight.bookTitle}, p.${highlight.page}`
                        );
                        toast.success("Quote copied for sharing");
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full"
                      title="Share"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* {!highlight.note && activeNoteId !== highlight.id && (
                      <button
                        onClick={() => {
                          setActiveNoteId(highlight.id);
                          setNoteInput("");
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full"
                        title="Add note"
                      >
                        <MessageSquarePlus size={16} />
                      </button>
                    )} */}

                    <button
                      onClick={() => handleDeleteHighlight(highlight.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete highlight"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredHighlights.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredHighlights.length} of {highlights.length} highlights
        </div>
      )}
    </div>
  );
};

export default Highlights;
