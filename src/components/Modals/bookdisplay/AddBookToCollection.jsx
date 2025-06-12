import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { bookStorageDB } from "../../../utils/bookStorageDB";

export const AddBookToCollection = ({ closeModal, bookName, identifier }) => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [bookCollections, setBookCollections] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionData, setNewCollectionData] = useState({
    collection_name: "",
    collection_description: "",
  });

  useEffect(() => {
    console.log(identifier);

    fetchCollections();
    fetchBookCollections();
  }, [identifier]);

  const fetchCollections = async () => {
    try {
      console.log("Fetching collections from IndexedDB");

      // Get collections from IndexedDB
      const collectionsData = await bookStorageDB.getCollections();
      setCollections(collectionsData);

      console.log("Collections loaded:", collectionsData);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookCollections = async () => {
    try {
      if (!identifier) {
        console.error("Identifier is not defined");
        return;
      }

      console.log("Checking which collections contain book:", identifier);

      // Get all collections and check which ones contain this book
      const allCollections = await bookStorageDB.getCollections();
      const bookCollectionsData = allCollections.filter(
        (collection) =>
          collection.books && collection.books.includes(identifier.toString())
      );

      setBookCollections(bookCollectionsData);
      console.log("Book is in collections:", bookCollectionsData);
    } catch (error) {
      console.error("Error fetching book collections:", error);
      // Don't show error toast for this as it's not critical
      // The user can still add to collections, just won't see which ones they're already in
    }
  };

  const isBookInCollection = (collectionId) => {
    return bookCollections.some(
      (collectedBook) => collectedBook.id === collectionId
    );
  };

  const handleCollectionToggle = (collectionId) => {
    // Don't allow toggling if book is already in this collection
    if (isBookInCollection(collectionId)) {
      return;
    }

    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleAddToCollections = async () => {
    // Filter out collections the book is already in
    const newCollections = selectedCollections.filter(
      (collectionId) => !isBookInCollection(collectionId)
    );

    if (newCollections.length === 0) {
      if (selectedCollections.length > 0) {
        toast.error("Book is already in all selected collections");
      } else {
        toast.error("Please select at least one new collection");
      }
      return;
    }

    try {
      console.log("Adding book to collections:", newCollections);

      // Add book to each selected collection using IndexedDB
      let successCount = 0;
      for (const collectionId of newCollections) {
        const result = await bookStorageDB.addBookToCollection(
          collectionId,
          identifier.toString()
        );
        if (result) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Book added to ${successCount} collection(s)`, {
          description: `"${bookName}" has been successfully added to your selected collections.`,
        });
        closeModal();
      } else {
        throw new Error("Failed to add book to any collections");
      }
    } catch (error) {
      console.error("Error adding book to collections:", error);
      toast.error("Failed to add book to collections", {
        description: "There was an issue adding the book. Please try again.",
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionData.collection_name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      console.log("Creating new collection:", newCollectionData);

      // Create collection using IndexedDB
      const newCollection = await bookStorageDB.addCollection({
        collection_name: newCollectionData.collection_name,
        collection_description: newCollectionData.collection_description,
      });

      if (newCollection) {
        // Add the new collection to the list
        setCollections((prev) => [...prev, newCollection]);

        // Reset form and hide it
        setNewCollectionData({
          collection_name: "",
          collection_description: "",
        });
        setShowCreateForm(false);

        toast.success("Collection created successfully");
      } else {
        throw new Error("Failed to create collection");
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection");
    }
  };

  return (
    <div className="fixed min-h-screen  inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6 relative animate-fadeIn">
        <h2 className="font-playfair text-2xl font-bold mb-4">
          Add "{bookName}" to Collection
        </h2>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Collections List */}
            <div className="mb-6">
              {collections.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No collections found. Create one below.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-4">
                  {collections.map((collection) => {
                    const isAlreadyInCollection = isBookInCollection(
                      collection.id
                    );
                    const isSelected = selectedCollections.includes(
                      collection.id
                    );

                    return (
                      <div
                        key={collection.id}
                        onClick={() => handleCollectionToggle(collection.id)}
                        className={`p-3 border rounded-lg transition-colors ${
                          isAlreadyInCollection
                            ? "border-green-300 bg-green-50 cursor-not-allowed opacity-75"
                            : isSelected
                            ? "border-amber-500 bg-amber-50 cursor-pointer"
                            : "border-gray-300 hover:border-amber-300 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {collection.collection_name}
                              {isAlreadyInCollection && (
                                <span className="ml-2 text-xs text-green-600 font-normal">
                                  (Already added)
                                </span>
                              )}
                            </h4>
                            {collection.collection_description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {collection.collection_description}
                              </p>
                            )}
                          </div>
                          {isAlreadyInCollection ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            isSelected && (
                              <Check className="w-5 h-5 text-amber-500" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Collection Section */}
            <div className="border-t pt-4">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Collection
                </button>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium">Create New Collection:</h4>
                  <input
                    type="text"
                    placeholder="Collection name..."
                    value={newCollectionData.collection_name}
                    onChange={(e) =>
                      setNewCollectionData((prev) => ({
                        ...prev,
                        collection_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder="Description (optional)..."
                    value={newCollectionData.collection_description}
                    onChange={(e) =>
                      setNewCollectionData((prev) => ({
                        ...prev,
                        collection_description: e.target.value,
                      }))
                    }
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCollection}
                      disabled={!newCollectionData.collection_name.trim()}
                      className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCollections}
                disabled={selectedCollections.length === 0}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add to{" "}
                {selectedCollections.length > 0
                  ? `${selectedCollections.length} `
                  : ""}
                Collection{selectedCollections.length !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
