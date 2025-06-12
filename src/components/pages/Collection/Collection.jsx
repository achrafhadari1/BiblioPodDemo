"use client";
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Grid2x2,
  ListFilter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { IoEyeOutline } from "react-icons/io5";
import { toast } from "sonner";
import { bookStorageDB } from "../../../utils/bookStorageDB";
import { CollectionBookDisplay } from "../../CollectionBookDisplay";

const CollectionDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [collectionData, setCollectionData] = useState({
    collection_name: "",
    collection_description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  // Fetch collection data from IndexedDB
  const fetchCollectionData = useCallback(async () => {
    try {
      console.log("Loading collection data from IndexedDB for ID:", id);

      // Get all collections from IndexedDB
      const collections = await bookStorageDB.getCollections();
      const currentCollection = collections.find((c) => c.id === id);

      if (!currentCollection) {
        toast.error("Collection not found", {
          description: "The requested collection could not be found.",
        });
        router.push("/collections");
        return;
      }

      setCollection(currentCollection);
      setCollectionData({
        collection_name: currentCollection.collection_name,
        collection_description: currentCollection.collection_description || "",
      });

      // Get all books from IndexedDB
      const allBooks = await bookStorageDB.getAllBooks();

      // Filter books that belong to this collection
      const collectionBooks = allBooks.filter(
        (book) =>
          currentCollection.books && currentCollection.books.includes(book.isbn)
      );

      console.log("Collection books:", collectionBooks);
      setBooks(collectionBooks);
    } catch (error) {
      console.error("Error loading collection:", error);
      toast.error("Error loading collection", {
        description:
          "There was an issue loading the collection. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchCollectionData();
  }, [fetchCollectionData]);

  const handleEditCollection = async () => {
    try {
      // Update collection using IndexedDB
      const updatedCollection = await bookStorageDB.updateCollection(id, {
        collection_name: collectionData.collection_name,
        collection_description: collectionData.collection_description,
      });

      if (updatedCollection) {
        setCollection(updatedCollection);
        setIsEditModalOpen(false);
        toast.success("Collection updated successfully");
      } else {
        throw new Error("Failed to update collection");
      }
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error("Error updating collection", {
        description:
          "There was an issue updating the collection. Please try again.",
      });
    }
  };

  const handleRemoveBooks = async () => {
    try {
      // Remove books from collection using IndexedDB
      const updatedCollection = await bookStorageDB.removeBooksFromCollection(
        id,
        selectedBooks
      );

      if (updatedCollection) {
        // Refresh the collection data
        fetchCollectionData();
        setSelectedBooks([]);
        setIsSelectMode(false);
        setIsRemoveConfirmOpen(false);
        toast.success(
          `${selectedBooks.length} book(s) removed from collection`
        );
      } else {
        throw new Error("Failed to remove books from collection");
      }
    } catch (error) {
      console.error("Error removing books:", error);
      toast.error("Error removing books", {
        description:
          "There was an issue removing books from the collection. Please try again.",
      });
    }
  };

  const handleBookSelection = (bookId) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter((id) => id !== bookId));
    } else {
      setSelectedBooks([...selectedBooks, bookId]);
    }
  };

  const handleCancelSelect = () => {
    setSelectedBooks([]);
    setIsSelectMode(false);
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="flex items-center mb-8">
          <button className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-48"></div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-64"></div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64 mb-2"></div>
              <div className="bg-gray-200 h-4 rounded-full w-3/4 mb-1"></div>
              <div className="bg-gray-200 h-3 rounded-full w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex-1 w-full lg:w-[96%] lg:ml-auto p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push("/collections")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-playfair text-3xl font-bold">
            Collection Not Found
          </h1>
        </div>

        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            The collection you are looking for does not exist or has been
            removed.
          </p>
          <button
            onClick={() => router.push("/collections")}
            className="bg-amber-500 text-white px-4 py-2 rounded-full text-sm hover:bg-amber-600 transition-colors"
          >
            Back to Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/collections")}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-playfair text-3xl font-bold">
          {collection.collection_name}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-gray-600 text-center mb-1">
            {collection.description || collection.collection_description}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{books.length} books</span>
            <span>
              Last updated{" "}
              {new Date(collection.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm flex items-center gap-1 transition-colors"
          >
            <Pencil size={16} /> Edit Collection
          </button>
          {!isSelectMode ? (
            <button
              onClick={() => setIsSelectMode(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm flex items-center gap-1 transition-colors"
            >
              <Trash2 size={16} /> Remove Books
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelSelect}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm flex items-center gap-1 transition-colors"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={() =>
                  selectedBooks.length > 0 && setIsRemoveConfirmOpen(true)
                }
                disabled={selectedBooks.length === 0}
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-1 transition-colors ${
                  selectedBooks.length > 0
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Trash2 size={16} /> Remove ({selectedBooks.length})
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search books by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Search size={16} className="text-gray-400" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            {filteredBooks.length} books found
          </div>
          <div className="flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${
                viewMode === "grid"
                  ? "bg-amber-50 text-amber-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid2x2 size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${
                viewMode === "list"
                  ? "bg-amber-50 text-amber-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <ListFilter size={20} />
            </button>
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus size={24} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No books in this collection
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            This collection doesn't have any books yet. Add books to this
            collection from your library.
          </p>
          {/* <button className="bg-amber-500 text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto hover:bg-amber-600 transition-colors">
            <Plus size={20} />
            Add Books
          </button> */}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {filteredBooks.map((book) => {
            const isSelected = selectedBooks.includes(book.isbn);

            return (
              <CollectionBookDisplay
                key={book.isbn}
                title={book.title}
                author={book.author}
                img={book.thumbnail || book.cover_image_url}
                identifier={book.isbn}
                bookDetails={book}
                rating={book.rating || 0}
                progress={book.progress || 0}
                isSelectMode={isSelectMode}
                isSelected={isSelected}
                onSelect={handleBookSelection}
                onRemoveFromCollection={(bookId) => {
                  setSelectedBooks([bookId]);
                  setIsRemoveConfirmOpen(true);
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBooks.map((book) => (
            <div
              key={book.isbn}
              className={`flex gap-4 p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow ${
                isSelectMode ? "cursor-pointer" : ""
              }`}
              onClick={() => isSelectMode && handleBookSelection(book.isbn)}
            >
              {isSelectMode && (
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedBooks.includes(book.isbn)
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 border border-gray-300"
                  }`}
                >
                  {selectedBooks.includes(book.isbn) && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              )}

              <div
                className={`w-16 h-24 rounded-md overflow-hidden ${
                  isSelectMode && selectedBooks.includes(book.id)
                    ? "ring-2 ring-amber-500"
                    : ""
                }`}
              >
                <img
                  src={book.thumbnail || book.cover_image_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <h3 className="font-medium text-base">{book.title}</h3>
                <p className="text-sm text-gray-500">{book.author}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-400">
                    {book.published_year}
                  </span>
                  <span className="text-xs text-gray-400">
                    {book.pages} pages
                  </span>
                </div>
              </div>

              {!isSelectMode && (
                <button
                  onClick={() => router.push(`/read?book=${book.id}`)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 self-start"
                >
                  <IoEyeOutline size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Collection Modal */}
      {isEditModalOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4">
              Edit Collection
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                value={collectionData.collection_name}
                onChange={(e) =>
                  setCollectionData({
                    ...collectionData,
                    collection_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter collection name..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={collectionData.collection_description}
                onChange={(e) =>
                  setCollectionData({
                    ...collectionData,
                    collection_description: e.target.value,
                  })
                }
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Describe your collection..."
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCollection}
                disabled={!collectionData.collection_name.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Books Confirmation Modal */}
      {isRemoveConfirmOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4">
              Remove Books
            </h2>

            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {selectedBooks.length} book
              {selectedBooks.length !== 1 ? "s" : ""} from this collection? This
              action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRemoveConfirmOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveBooks}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { CollectionDetailPage as Collection };
export default CollectionDetailPage;
