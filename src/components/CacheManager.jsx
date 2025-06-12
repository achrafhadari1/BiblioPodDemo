import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/react";
import { toast } from "sonner";
import {
  getCacheSize,
  clearBookCache,
  invalidateSearchCache,
  invalidateStatsCache,
  invalidateCollectionCache,
  invalidateHighlightsCache,
} from "../../utils/bookCache";

const CacheManager = () => {
  const [cacheSize, setCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Update cache size on component mount
    updateCacheSize();
  }, []);

  const updateCacheSize = () => {
    const size = getCacheSize();
    setCacheSize(size);
  };

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      clearBookCache();
      updateCacheSize();
      toast.success("Cache cleared successfully", {
        description:
          "All cached data including books, search results, stats, and collections have been removed.",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Failed to clear cache", {
        description: "There was an error clearing the cache. Please try again.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearSpecificCache = async (cacheType) => {
    try {
      switch (cacheType) {
        case "search":
          invalidateSearchCache();
          toast.success("Search cache cleared");
          break;
        case "stats":
          invalidateStatsCache();
          toast.success("Stats cache cleared");
          break;
        case "collections":
          invalidateCollectionCache();
          toast.success("Collections cache cleared");
          break;
        case "highlights":
          invalidateHighlightsCache();
          toast.success("Highlights cache cleared");
          break;
        default:
          break;
      }
      updateCacheSize();
    } catch (error) {
      console.error("Error clearing specific cache:", error);
      toast.error("Failed to clear cache");
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Cache Management</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        BiblioPod stores book data, search results, stats, collections, and
        highlights locally to improve loading times.
      </p>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium">Current cache size:</p>
          <p className="text-xl font-bold">{cacheSize.toFixed(2)} MB</p>
        </div>
        <Button
          color="danger"
          variant="flat"
          onClick={handleClearCache}
          isLoading={isClearing}
        >
          Clear All Cache
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Button
          size="sm"
          variant="flat"
          onClick={() => handleClearSpecificCache("search")}
        >
          Clear Search Cache
        </Button>
        <Button
          size="sm"
          variant="flat"
          onClick={() => handleClearSpecificCache("stats")}
        >
          Clear Stats Cache
        </Button>
        <Button
          size="sm"
          variant="flat"
          onClick={() => handleClearSpecificCache("collections")}
        >
          Clear Collections Cache
        </Button>
        <Button
          size="sm"
          variant="flat"
          onClick={() => handleClearSpecificCache("highlights")}
        >
          Clear Highlights Cache
        </Button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p>Clearing the cache will remove stored data for faster loading.</p>
        <p>Data will be fetched fresh from the server when next accessed.</p>
      </div>
    </div>
  );
};

export default CacheManager;
