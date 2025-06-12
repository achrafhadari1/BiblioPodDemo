"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  BookMarked,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bookStorageDB } from "../../../utils/bookStorageDB";

export const CollectionLists = () => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [bookCounts, setBookCounts] = useState({});
  const [booksByCollection, setBooksByCollection] = useState({});
  const [loading, setLoading] = useState(true);
  const [collectionData, setCollectionData] = useState({
    collection_name: "",
    collection_description: "",
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const fetchingRef = useRef(false);

  // Fetch collections data from localStorage
  const fetchCollections = useCallback(
    async (forceRefresh = false, skipCacheInvalidation = false) => {
      // Prevent multiple simultaneous fetches
      if (fetchingRef.current && !forceRefresh) {
        return;
      }

      fetchingRef.current = true;
      setLoading(true);

      try {
        console.log("Loading collections from IndexedDB");

        // Get collections from IndexedDB
        const collectionsData = await bookStorageDB.getCollections();
        console.log("Collections from IndexedDB:", collectionsData);

        setCollections(collectionsData);

        // If no collections, set empty states
        if (collectionsData.length === 0) {
          setBookCounts({});
          setBooksByCollection({});
          setLoading(false);
          return;
        }

        // Get all books from IndexedDB
        const allBooks = await bookStorageDB.getAllBooks();
        console.log("All books from localStorage:", allBooks);

        // Calculate book counts and books for each collection
        const counts = {};
        const booksByCollectionData = {};

        for (const collection of collectionsData) {
          // Filter books that belong to this collection
          const collectionBooks = allBooks.filter(
            (book) => collection.books && collection.books.includes(book.isbn)
          );

          counts[collection.id] = collectionBooks.length;
          booksByCollectionData[collection.id] = collectionBooks;
        }

        console.log("Book counts:", counts);
        console.log("Books by collection:", booksByCollectionData);

        setBookCounts(counts);
        setBooksByCollection(booksByCollectionData);
      } catch (error) {
        console.error("Error fetching collections:", error);

        // Set empty state when there's an error
        setCollections([]);
        setBookCounts({});
        setBooksByCollection({});

        toast.error("Error loading collections", {
          description:
            "There was an issue loading your collections. Please try again.",
        });
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCollectionData({
      ...collectionData,
      [name]: value,
    });
  };

  const handleCreateCollection = async () => {
    if (!collectionData.collection_name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      // Create collection using IndexedDB
      const newCollection = await bookStorageDB.addCollection({
        collection_name: collectionData.collection_name,
        collection_description: collectionData.collection_description,
      });

      setIsModalOpen(false);
      setCollectionData({ collection_name: "", collection_description: "" });
      toast.success("Collection created successfully");

      // Refresh collections data
      fetchCollections(true);
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Error creating collection", {
        description:
          "There was an issue creating the collection. Please try again.",
      });
    }
  };

  const navigateToCollection = (collectionId) => {
    router.push(`/collections/${collectionId}`);
  };

  const openDeleteConfirm = (collection, event) => {
    event.stopPropagation(); // Prevent navigation when clicking delete
    setCollectionToDelete(collection);
    setIsDeleteConfirmOpen(true);
  };

  const deleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      // Delete collection using IndexedDB
      const success = await bookStorageDB.deleteCollection(
        collectionToDelete.id
      );

      if (success) {
        // Update state to remove the deleted collection
        setCollections((prevCollections) =>
          prevCollections.filter(
            (collection) => collection.id !== collectionToDelete.id
          )
        );

        // Remove from book counts and books data
        setBookCounts((prev) => {
          const updated = { ...prev };
          delete updated[collectionToDelete.id];
          return updated;
        });

        setBooksByCollection((prev) => {
          const updated = { ...prev };
          delete updated[collectionToDelete.id];
          return updated;
        });

        toast.success("Collection deleted successfully");
        setIsDeleteConfirmOpen(false);
        setCollectionToDelete(null);
      } else {
        throw new Error("Failed to delete collection");
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error("Error deleting collection", {
        description:
          "There was an issue deleting the collection. Please try again.",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";

    try {
      const date = new Date(dateString);
      const now = new Date();

      // Check if date is valid
      if (isNaN(date.getTime())) return "Recently";

      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
      return `${Math.ceil(diffDays / 365)} years ago`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Recently";
    }
  };

  // Filter collections based on search term
  const filteredCollections = collections.filter(
    (collection) =>
      collection.collection_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (collection.description &&
        collection.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCollectionGradient = (index) => {
    const gradients = [
      "bg-gradient-to-br from-amber-500/90 to-amber-800/90",
      "bg-gradient-to-br from-blue-500/90 to-purple-600/90",
      "bg-gradient-to-br from-teal-500/90 to-emerald-700/90",
      "bg-gradient-to-br from-gray-700/90 to-gray-900/90",
      "bg-gradient-to-br from-rose-500/90 to-pink-600/90",
      "bg-gradient-to-br from-indigo-500/90 to-blue-700/90",
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/library")}
              className="mr-3 sm:mr-4 p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold">
              Your Collections{" "}
            </h1>

            <div className="ml-4 sm:ml-6 flex gap-2">
              <div className="p-2 rounded-lg bg-gray-100 animate-pulse w-8 h-8"></div>
              <div className="p-2 rounded-lg bg-gray-100 animate-pulse w-8 h-8"></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 animate-pulse w-8 h-8"></div>
            <div className="bg-gray-100 animate-pulse rounded-full h-10 w-36"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((_, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl shadow-md h-[280px] bg-gray-100 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/library")}
                className="mr-3 sm:mr-4 p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Your Collections
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base ml-12 sm:ml-16">
              Organize and manage your book collections
            </p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Collection</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:max-w-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-amber-50 text-amber-500"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Grid3X3 size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-amber-50 text-amber-500"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {filteredCollections.length === 0 ? (
        searchTerm ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No collections found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search terms or create a new collection
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="text-amber-500 hover:text-amber-600 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No collections yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first collection to organize your books
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto hover:bg-amber-600 transition-colors"
            >
              <Plus size={20} />
              Create Collection
            </button>
          </div>
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection, index) => {
            const books = booksByCollection[collection.id] || [];

            return (
              <div
                key={collection.id}
                className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-[280px] cursor-pointer"
                onClick={() => navigateToCollection(collection.id)}
              >
                <div
                  className={`absolute inset-0 ${getCollectionGradient(index)}`}
                ></div>
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-white font-bold text-xl mb-1">
                        {collection.collection_name}
                      </h2>
                      <p className="text-white/80 text-sm line-clamp-2">
                        {collection.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className="text-white text-xs font-medium flex items-center gap-1">
                          <BookMarked size={12} />
                          {bookCounts[collection.id] || 0}
                        </span>
                      </div>
                      <button
                        onClick={(e) => openDeleteConfirm(collection, e)}
                        className="bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete collection"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex gap-2 mb-4">
                      <div className="flex -space-x-6">
                        {(books.slice(0, 2) || []).map((book, idx) => (
                          <div
                            key={book.id || idx}
                            className="w-20 h-28 rounded-lg shadow-lg overflow-hidden border-2 border-white/30 group-hover:translate-y-[-4px] transition-transform duration-300"
                            style={{
                              transitionDelay: `${idx * 50}ms`,
                              zIndex: books.length - idx,
                            }}
                          >
                            <img
                              src={
                                book.thumbnail ||
                                book.cover_image_url ||
                                "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1887&auto=format&fit=crop"
                              }
                              alt={`Book cover ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                        {(bookCounts[collection.id] || 0) > 2 && (
                          <div className="w-20 h-28 flex items-center justify-center rounded-lg bg-black/40 border-2 border-white/30 shadow-lg backdrop-blur-sm">
                            <span className="text-white text-sm font-medium">
                              +{(bookCounts[collection.id] || 0) - 2}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-xs">
                        Updated{" "}
                        {formatDate(
                          collection.updated_at || collection.created_at
                        )}
                      </span>
                      <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-full transition-colors">
                        <ChevronRight size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl h-[280px] flex flex-col items-center justify-center p-6 hover:border-amber-300 transition-colors cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
              <Plus size={24} />
            </div>
            <h3 className="font-medium text-gray-700 text-lg mb-1">
              Create New Collection
            </h3>
            <p className="text-gray-500 text-sm text-center">
              Organize your books into a new collection
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCollections.map((collection, index) => {
            const books = booksByCollection[collection.id] || [];

            return (
              <div
                key={collection.id}
                className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow flex gap-4 items-center cursor-pointer"
                onClick={() => navigateToCollection(collection.id)}
              >
                <div
                  className={`w-16 h-16 rounded-lg ${getCollectionGradient(
                    index
                  )} flex items-center justify-center`}
                >
                  <BookMarked size={24} className="text-white" />
                </div>

                <div className="flex-1">
                  <h2 className="font-bold text-lg">
                    {collection.collection_name}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {collection.description}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400">
                      {bookCounts[collection.id] || 0} books
                    </span>
                    <span className="text-xs text-gray-400">
                      Updated{" "}
                      {formatDate(
                        collection.updated_at || collection.created_at
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:flex -space-x-3">
                    {(books.slice(0, 3) || []).map((book, idx) => (
                      <div
                        key={book.id || idx}
                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-white"
                      >
                        <img
                          src={
                            book.thumbnail ||
                            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1887&auto=format&fit=crop"
                          }
                          alt={`Book cover ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {(bookCounts[collection.id] || 0) > 3 && (
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border-2 border-white">
                        <span className="text-gray-500 text-xs font-medium">
                          +{(bookCounts[collection.id] || 0) - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openDeleteConfirm(collection, e)}
                      className="p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete collection"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="border border-dashed border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-colors flex items-center gap-4 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="w-16 h-16 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="font-medium text-gray-700 text-lg">
                Create New Collection
              </h3>
              <p className="text-gray-500 text-sm">
                Organize your books into a new collection
              </p>
            </div>
          </div>
        </div>
      )}

      {collections.length > 0 && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-gray-500">Page 1 of 1</span>
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {isModalOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4">
              Create New Collection
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                name="collection_name"
                value={collectionData.collection_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter collection name..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="collection_description"
                value={collectionData.collection_description}
                onChange={handleChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Describe your collection..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!collectionData.collection_name.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      {isDeleteConfirmOpen && collectionToDelete && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4">
              Delete Collection
            </h2>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the collection "
              {collectionToDelete.collection_name}"? This action cannot be
              undone and will remove all books from this collection.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setCollectionToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteCollection}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionLists;
