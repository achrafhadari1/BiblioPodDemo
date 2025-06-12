"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "../../api/axios";
import { MdDeleteOutline, MdGridView, MdViewList, MdAdd } from "react-icons/md";
import { VscListUnordered } from "react-icons/vsc";
import { CircularProgress, Button, Tooltip } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { FiBook, FiPlus, FiRefreshCw } from "react-icons/fi";
import {
  getCachedCollectionsList,
  cacheCollectionsList,
  invalidateCollectionCache,
} from "../../../utils/bookCache";

export const CollectionShelf = () => {
  // Update the collections state to include descriptions
  const [collections, setCollections] = useState([]);
  const [collectionNames, setCollectionNames] = useState({});
  const [booksByCollection, setBooksByCollection] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "shelf", "grid", or "list"
  const router = useRouter();
  const { isDarkMode } = useTheme();

  // Predefined color palette for collections - updated with modern gradients
  const colorPalette = useMemo(
    () => [
      "linear-gradient(135deg, #1a1a1a 0%, #333333 100%)", // Dark Gray
      "linear-gradient(135deg, #1a1a1a 0%, #4A1D95 100%)", // Purple
      "linear-gradient(135deg, #1a1a1a 0%, #065F46 100%)", // Teal
      "linear-gradient(135deg, #1a1a1a 0%, #991B1B 100%)", // Red
      "linear-gradient(135deg, #1a1a1a 0%, #1E40AF 100%)", // Blue
      "linear-gradient(135deg, #1a1a1a 0%, #B45309 100%)", // Amber
      "linear-gradient(135deg, #1a1a1a 0%, #15803D 100%)", // Green
      "linear-gradient(135deg, #1a1a1a 0%, #6D28D9 100%)", // Indigo
    ],
    []
  );

  // Get collection color based on index
  const getCollectionColor = useCallback(
    (index) => {
      return colorPalette[index % colorPalette.length];
    },
    [colorPalette]
  );

  // Fetch collections data
  const fetchCollections = useCallback(async (forceRefresh = false) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedCollections = getCachedCollectionsList();
      if (cachedCollections) {
        const processedCollections = cachedCollections.map((collection) => ({
          ...collection,
          description:
            collection.description ||
            `A collection of ${collection.collection_name.toLowerCase()} books.`,
        }));

        setCollections(processedCollections);

        // Create a map of collection IDs to names
        const names = cachedCollections.reduce((acc, curr) => {
          acc[curr.id] = curr.collection_name;
          return acc;
        }, {});

        setCollectionNames(names);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await axios.get("/collections", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const collectionsData = response.data.collections;

      // Cache the collections data
      cacheCollectionsList(collectionsData);

      // Update the fetchCollections function to handle descriptions
      setCollections(
        collectionsData.map((collection) => ({
          ...collection,
          // Use existing description or generate a placeholder one
          description:
            collection.description ||
            `A collection of ${collection.collection_name.toLowerCase()} books.`,
        }))
      );

      // Create a map of collection IDs to names
      const names = collectionsData.reduce((acc, curr) => {
        acc[curr.id] = curr.collection_name;
        return acc;
      }, {});

      setCollectionNames(names);
    } catch (error) {
      console.error("Error fetching collections:", error);
      setError("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCollections(true);
    setIsRefreshing(false);
  };

  // Fetch books for a specific collection
  const fetchBooksByCollectionId = useCallback(async (collectionId) => {
    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
      const response = await axios.get(
        `/collected-books/details/${collectionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.books;
    } catch (error) {
      console.error(
        `Error fetching books for collection ID ${collectionId}:`,
        error
      );
      return [];
    }
  }, []);

  // Load collections on component mount and when a new collection is added
  useEffect(() => {
    fetchCollections();

    // Add event listener for collection added event
    const handleCollectionAdded = () => {
      fetchCollections();
    };

    // Add event listener for collection cache refresh event
    const handleCollectionCacheRefreshed = () => {
      fetchCollections();
    };

    window.addEventListener("collectionAdded", handleCollectionAdded);
    window.addEventListener(
      "collectionCacheRefreshed",
      handleCollectionCacheRefreshed
    );

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("collectionAdded", handleCollectionAdded);
      window.removeEventListener(
        "collectionCacheRefreshed",
        handleCollectionCacheRefreshed
      );
    };
  }, [fetchCollections]);

  // Load books for all collections
  useEffect(() => {
    const fetchBooksForAllCollections = async () => {
      if (collections.length === 0) return;

      const booksByCollectionId = {};
      const fetchPromises = collections.map(async (collection) => {
        const books = await fetchBooksByCollectionId(collection.id);
        booksByCollectionId[collection.id] = books;
      });

      // Wait for all fetch operations to complete
      await Promise.all(fetchPromises);
      setBooksByCollection(booksByCollectionId);
    };

    fetchBooksForAllCollections();
  }, [collections, fetchBooksByCollectionId]);

  // Check if a collection has no books
  const hasNoBooks = useCallback(
    (collectionId) => {
      return (
        !booksByCollection[collectionId] ||
        booksByCollection[collectionId].length === 0
      );
    },
    [booksByCollection]
  );

  // Delete a collection
  const deleteCollection = useCallback(async (collectionId, event) => {
    event.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this collection?")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.delete(`/collections/${collectionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update state to remove the deleted collection
      setCollections((prevCollections) =>
        prevCollections.filter((collection) => collection.id !== collectionId)
      );

      // Invalidate collection cache
      invalidateCollectionCache(collectionId);

      // Notify other components about collection changes
      window.dispatchEvent(new CustomEvent("collectionCacheRefreshed"));
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert("Failed to delete collection. Please try again.");
    }
  }, []);

  // Navigate to collection details
  const navigateToCollection = useCallback(
    (collectionId) => {
      router.push(`/collections/${collectionId}`);
    },
    [router]
  );

  // Format image URL
  const formatImageUrl = useCallback((thumbnail) => {
    if (!thumbnail) return null;

    if (thumbnail.startsWith("public")) {
      return `https://bibliopodv2-production.up.railway.app/${thumbnail.replace(
        "public",
        "storage"
      )}`;
    }
    return thumbnail;
  }, []);

  // Collection item variants for animations
  const collectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
    hover: {
      y: -10,
      boxShadow:
        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        duration: 0.3,
      },
    },
  };

  // Book cover variants for animations
  const bookCoverVariants = {
    initial: (i) => ({
      rotate: i % 2 === 0 ? -5 : 5,
      y: 0,
    }),
    hover: (i) => ({
      rotate: 0,
      y: -10,
      transition: {
        duration: 0.3,
      },
    }),
  };

  // Collection skeleton for loading state
  const CollectionSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <div
          key={index}
          className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden animate-pulse h-64"
        >
          <div className="h-full w-full flex">
            <div className="w-2/3 p-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md mb-2 w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md mb-2 w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-2/3"></div>
              <div className="mt-6 h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
            <div className="w-1/3 bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">
            My Collections
          </h1>
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        </div>
        <CollectionSkeleton />
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            {error}
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            Unable to load your collections
          </p>
          <Button
            color="danger"
            variant="flat"
            onClick={() => fetchCollections()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render collections
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex  md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)]">
          My Collections
        </h1>

        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="light"
            className="rounded-full bg-[var(--card-bg)]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <FiRefreshCw
              className={`${isRefreshing ? "animate-spin" : ""}`}
              size={20}
            />
          </Button>

          <div className="flex bg-[var(--card-bg)] rounded-full p-1">
            <Button
              isIconOnly
              variant="light"
              className={`rounded-full ${
                viewMode === "grid"
                  ? "bg-[var(--primary-color)] opacity-0 cursor-default"
                  : ""
              }`}
              onClick={() => setViewMode("grid")}
            >
              <MdGridView size={20} />
            </Button>
            <Button
              isIconOnly
              variant="light"
              className={`rounded-full ${
                viewMode === "list"
                  ? "bg-[var(--primary-color)] opacity-0 cursor-default"
                  : ""
              }`}
              onClick={() => setViewMode("list")}
            >
              <VscListUnordered size={20} />
            </Button>
          </div>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiBook size={32} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-3">
            No Collections Yet
          </h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Create your first collection to organize your books by genre,
            author, or any category you prefer.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
          }
        >
          <AnimatePresence>
            {collections.map((collection, index) => (
              <motion.div
                key={collection.id}
                custom={index}
                variants={collectionVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className={`bg-[var(--card-bg)] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                  viewMode === "list" ? "flex" : ""
                }`}
                onClick={() => navigateToCollection(collection.id)}
              >
                {viewMode === "grid" ? (
                  // Grid view
                  <div className="h-64 relative">
                    <div
                      className="absolute inset-0 z-0"
                      style={{ background: getCollectionColor(index) }}
                    ></div>

                    <div className="relative z-10 h-full p-6 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm flex items-center">
                          <FiBook className="mr-1" size={14} />
                          <span>
                            {booksByCollection[collection.id]?.length || 0}
                          </span>
                        </div>

                        <Tooltip content="Delete collection">
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            className="text-white bg-black/20 backdrop-blur-sm rounded-full"
                            onClick={(e) => deleteCollection(collection.id, e)}
                          >
                            <MdDeleteOutline size={18} />
                          </Button>
                        </Tooltip>
                      </div>

                      <div>
                        <h3 className="text-white text-xl font-bold mb-1">
                          {collectionNames[collection.id]}
                        </h3>
                        <p className="text-white/70 text-sm line-clamp-2 mb-4">
                          {collection.description}
                        </p>

                        <div className="flex -space-x-4 overflow-hidden">
                          {hasNoBooks(collection.id) ? (
                            <div className="flex items-center justify-center w-12 h-16 bg-black/30 backdrop-blur-sm rounded text-white/50 text-xs">
                              Empty
                            </div>
                          ) : (
                            booksByCollection[collection.id]
                              ?.slice(0, 3)
                              .map((book, bookIndex) => (
                                <motion.div
                                  key={book.id || bookIndex}
                                  custom={bookIndex}
                                  variants={bookCoverVariants}
                                  initial="initial"
                                  whileHover="hover"
                                  className="w-12 h-16 relative"
                                >
                                  <img
                                    className="h-full w-full rounded object-cover border border-white/20 shadow-lg"
                                    src={
                                      formatImageUrl(book.thumbnail) ||
                                      "/placeholder-book.png"
                                    }
                                    alt={`${book.title} cover`}
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.src = "/placeholder-book.png";
                                    }}
                                  />
                                </motion.div>
                              ))
                          )}

                          {booksByCollection[collection.id]?.length > 3 && (
                            <div className="flex items-center justify-center w-12 h-16 bg-black/30 backdrop-blur-sm rounded text-white text-xs">
                              +{booksByCollection[collection.id].length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List view
                  <div className="flex w-full">
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-[var(--text)] text-xl font-bold mb-2">
                            {collectionNames[collection.id]}
                          </h3>
                          <p className="text-[var(--text-secondary)] mb-3 line-clamp-2">
                            {collection.description}
                          </p>
                          <div className="flex items-center text-[var(--text-secondary)] text-sm">
                            <FiBook className="mr-1" size={14} />
                            <span>
                              {booksByCollection[collection.id]?.length || 0}{" "}
                              books
                            </span>
                          </div>
                        </div>

                        <Tooltip content="Delete collection">
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            className="text-[var(--text-secondary)] rounded-full"
                            onClick={(e) => deleteCollection(collection.id, e)}
                          >
                            <MdDeleteOutline size={18} />
                          </Button>
                        </Tooltip>
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="flat"
                          color="primary"
                          size="sm"
                          className="bg-[var(--primary-color)] text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToCollection(collection.id);
                          }}
                        >
                          View Collection
                        </Button>
                      </div>
                    </div>

                    <div
                      className="w-48 flex items-center justify-center p-4"
                      style={{ background: getCollectionColor(index) }}
                    >
                      {hasNoBooks(collection.id) ? (
                        <div className="text-center">
                          <div className="text-white/70 text-sm">
                            No books yet
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-24 w-full">
                          {booksByCollection[collection.id]
                            ?.slice(0, 3)
                            .map((book, bookIndex) => (
                              <motion.div
                                key={book.id || bookIndex}
                                custom={bookIndex}
                                variants={bookCoverVariants}
                                initial="initial"
                                whileHover="hover"
                                className="absolute"
                                style={{
                                  left: `${bookIndex * 25}%`,
                                  zIndex: 3 - bookIndex,
                                }}
                              >
                                <img
                                  className="h-24 w-16 rounded object-cover shadow-lg"
                                  src={
                                    formatImageUrl(book.thumbnail) ||
                                    "/placeholder-book.png"
                                  }
                                  alt={`${book.title} cover`}
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.src = "/placeholder-book.png";
                                  }}
                                />
                              </motion.div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
