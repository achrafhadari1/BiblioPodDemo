import React, { useState } from "react";
import api from "../../api/axios";
import { BiAddToQueue } from "react-icons/bi";
import { toast } from "sonner";
import { invalidateCollectionCache } from "../../utils/bookCache";

export const AddToCollection = ({ onCollectionAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [collectionData, setCollectionData] = useState({
    collection_name: "",
    collection_description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCollectionData({
      ...collectionData,
      [name]: value,
    });
  };

  const handleCreateCollection = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required", {
        description: "Please log in to create collections.",
      });
      return;
    }

    if (!collectionData.collection_name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      await api.post("/collections", collectionData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCollectionData({ collection_name: "", collection_description: "" });

      // Invalidate collections cache and notify other components
      invalidateCollectionCache();
      window.dispatchEvent(new CustomEvent("collectionCacheRefreshed"));

      toast.success("Collection created successfully");

      // Call the callback to refresh collections if provided
      if (onCollectionAdded) {
        onCollectionAdded();
      }

      closeModal();
    } catch (error) {
      toast.error("Error creating collection", {
        description:
          "There was an issue creating the collection. Please try again.",
      });
    }
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <div className="w-full cursor-pointer">
      {/* Modal toggle */}
      <button
        onClick={openModal}
        className="bg-amber-500 text-white font-normal px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition-colors"
      >
        Create Collection
      </button>
      {isOpen && (
        <div className="font-normal text-sm fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                className="font-normal w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                onClick={closeModal}
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
    </div>
  );
};
