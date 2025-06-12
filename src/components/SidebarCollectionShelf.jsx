import React, { useState, useEffect, useCallback } from "react";
import { FiPlus, FiBook } from "react-icons/fi";
import { Library } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { bookStorageDB } from "../utils/bookStorageDB";

export const SidebarCollectionShelf = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionData, setCollectionData] = useState({
    collection_name: "",
    collection_description: "",
  });
  const router = useRouter();

  // Fetch collections data from IndexedDB
  const fetchCollections = useCallback(async (forceRefresh = false) => {
    try {
      console.log(
        "SidebarCollectionShelf: Fetching collections from IndexedDB"
      );

      // Get collections from IndexedDB
      const collectionsData = await bookStorageDB.getCollections();
      setCollections(collectionsData);

      console.log(
        "SidebarCollectionShelf: Loaded collections:",
        collectionsData
      );
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // No longer need cache event listeners since we're using localStorage directly

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCollectionData({
      ...collectionData,
      [name]: value,
    });
  };

  const handleCreateCollection = async () => {
    try {
      console.log("Creating collection:", collectionData);

      // Create collection using IndexedDB
      const newCollection = await bookStorageDB.addCollection(collectionData);

      if (newCollection) {
        setIsModalOpen(false);
        setCollectionData({ collection_name: "", collection_description: "" });
        toast("Collection created successfully");

        // Refresh collections
        fetchCollections();
      } else {
        throw new Error("Failed to create collection");
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      toast("Error creating collection", {
        description:
          "There was an issue creating the collection. Please try again.",
      });
    }
  };

  const navigateToCollection = (collectionId) => {
    router.push(`/collections/${collectionId}`);
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="font-playfair font-bold text-lg mb-4">Collections</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-playfair font-bold text-lg">Collections</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600"
          >
            <FiPlus size={16} />
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Library size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              No collections yet. Create your first collection to organize your
              books.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              Create Collection
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.slice(0, 3).map((collection) => (
              <div
                key={collection.id}
                onClick={() => navigateToCollection(collection.id)}
                className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-500">
                      <Library size={16} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {collection.collection_name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {collection.description?.substring(0, 30)}
                        {collection.description?.length > 30 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {collections.length > 3 && (
              <button
                onClick={() => router.push("/collections")}
                className="w-full text-center text-sm text-amber-500 hover:text-amber-600 py-2"
              >
                View all collections ({collections.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {isModalOpen && (
        <div
          className="fixed z-50 inset-0 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Create New Collection
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Collection Name</Label>
                      <Input
                        id="name"
                        name="collection_name"
                        value={collectionData.collection_name}
                        onChange={handleChange}
                        placeholder="Enter collection name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        name="collection_description"
                        rows="3"
                        value={collectionData.collection_description}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Describe your collection..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateCollection}
                  disabled={!collectionData.collection_name.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-amber-500 text-base font-medium text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
