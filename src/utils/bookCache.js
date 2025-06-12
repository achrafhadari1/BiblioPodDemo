/**
 * Book Caching Utility
 *
 * This utility provides functions to cache book data and content in local storage
 * to improve loading times and reduce API calls.
 */

import axios from "../api/axios";

// Constants
const BOOK_LIST_CACHE_KEY = "bibliopod_book_list";
const BOOK_CONTENT_CACHE_PREFIX = "bibliopod_book_content_";
const BOOK_PROGRESS_CACHE_PREFIX = "bibliopod_book_progress_";
const BOOK_LOCATIONS_CACHE_PREFIX = "bibliopod_book_locations_";
const SEARCH_RESULTS_CACHE_PREFIX = "bibliopod_search_results_";
const READING_STATS_CACHE_KEY = "bibliopod_reading_stats";
const COLLECTIONS_LIST_CACHE_KEY = "bibliopod_collections_list";
const COLLECTION_DETAILS_CACHE_PREFIX = "bibliopod_collection_details_";
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const STATS_CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour for stats (more dynamic data)
const SEARCH_CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes for search results

/**
 * Helper function to get existing cached book list without expiry check
 */
const getExistingCachedBookList = () => {
  try {
    const cachedData = localStorage.getItem(BOOK_LIST_CACHE_KEY);
    if (!cachedData) return null;
    const { books } = JSON.parse(cachedData);
    return books;
  } catch (error) {
    return null;
  }
};

/**
 * Saves the book list to local storage, preserving existing progress data
 * @param {Array} books - Array of book objects
 */
export const cacheBookList = (books) => {
  try {
    // Get existing cached books to preserve progress data
    const existingCache = getExistingCachedBookList();

    let booksToCache = books;

    // If we have existing cached books, merge progress data
    if (existingCache && existingCache.length > 0) {
      booksToCache = books.map((book) => {
        // Find existing book with same ISBN
        const existingBook = existingCache.find(
          (existing) => existing.isbn.toString() === book.isbn.toString()
        );

        // If book exists and has progress data, preserve it
        if (existingBook && existingBook.progress !== undefined) {
          return {
            ...book,
            progress: existingBook.progress,
          };
        }

        // Also check individual progress cache
        const cachedProgress = getCachedBookProgress(book.isbn);
        if (cachedProgress && cachedProgress.current_percentage !== undefined) {
          return {
            ...book,
            progress: cachedProgress.current_percentage,
          };
        }

        return book;
      });
    } else {
      // No existing cache, but still check individual progress caches
      booksToCache = books.map((book) => {
        const cachedProgress = getCachedBookProgress(book.isbn);
        if (cachedProgress && cachedProgress.current_percentage !== undefined) {
          return {
            ...book,
            progress: cachedProgress.current_percentage,
          };
        }
        return book;
      });
    }

    const cacheData = {
      timestamp: Date.now(),
      books: booksToCache,
    };
    localStorage.setItem(BOOK_LIST_CACHE_KEY, JSON.stringify(cacheData));

    console.log(
      `[CACHE] Cached ${booksToCache.length} books with preserved progress data`
    );
  } catch (error) {
    console.error("Error caching book list:", error);
  }
};

/**
 * Retrieves the cached book list if it exists and is not expired
 * @returns {Array|null} - Array of book objects or null if cache is invalid
 */
export const getCachedBookList = () => {
  try {
    const cachedData = localStorage.getItem(BOOK_LIST_CACHE_KEY);
    if (!cachedData) return null;

    const { timestamp, books } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      // Cache expired, remove it
      localStorage.removeItem(BOOK_LIST_CACHE_KEY);
      return null;
    }

    return books;
  } catch (error) {
    console.error("Error retrieving cached book list:", error);
    return null;
  }
};

/**
 * Caches a book's content (epub file) in local storage
 * @param {string} isbn - The book's ISBN
 * @param {ArrayBuffer} content - The book's content as ArrayBuffer
 */
export const cacheBookContent = (isbn, content) => {
  try {
    // Convert ArrayBuffer to Base64 string for storage
    const base64Content = arrayBufferToBase64(content);

    const cacheData = {
      timestamp: Date.now(),
      content: base64Content,
    };

    localStorage.setItem(
      `${BOOK_CONTENT_CACHE_PREFIX}${isbn}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error(`Error caching book content for ISBN ${isbn}:`, error);
  }
};

/**
 * Retrieves cached book content if it exists and is not expired
 * @param {string} isbn - The book's ISBN
 * @returns {ArrayBuffer|null} - The book's content as ArrayBuffer or null if cache is invalid
 */
export const getCachedBookContent = (isbn) => {
  try {
    const cachedData = localStorage.getItem(
      `${BOOK_CONTENT_CACHE_PREFIX}${isbn}`
    );
    if (!cachedData) return null;

    const { timestamp, content } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      // Cache expired, remove it
      localStorage.removeItem(`${BOOK_CONTENT_CACHE_PREFIX}${isbn}`);
      return null;
    }

    // Convert Base64 string back to ArrayBuffer
    return base64ToArrayBuffer(content);
  } catch (error) {
    console.error(
      `Error retrieving cached book content for ISBN ${isbn}:`,
      error
    );
    return null;
  }
};

/**
 * Caches a book's reading progress in local storage
 * @param {string} isbn - The book's ISBN
 * @param {Object} progress - The progress object containing current_cfi and current_percentage
 */
export const cacheBookProgress = (isbn, progress) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      progress,
    };

    const cacheKey = `${BOOK_PROGRESS_CACHE_PREFIX}${isbn}`;
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error caching book progress for ISBN ${isbn}:`, error);
  }
};

/**
 * Retrieves cached book progress if it exists
 * @param {string} isbn - The book's ISBN
 * @returns {Object|null} - The progress object or null if cache is invalid
 */
export const getCachedBookProgress = (isbn) => {
  try {
    const cachedData = localStorage.getItem(
      `${BOOK_PROGRESS_CACHE_PREFIX}${isbn}`
    );
    if (!cachedData) return null;

    const { progress } = JSON.parse(cachedData);
    return progress; // This returns the full progress object including current_cfi
  } catch (error) {
    console.error(
      `Error retrieving cached book progress for ISBN ${isbn}:`,
      error
    );
    return null;
  }
};

/**
 * Caches a book's generated locations in local storage
 * @param {string} isbn - The book's ISBN
 * @param {Array} locations - The book's generated locations
 */
export const cacheBookLocations = (isbn, locations) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      locations: locations,
    };

    localStorage.setItem(
      `${BOOK_LOCATIONS_CACHE_PREFIX}${isbn}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error(`Error caching book locations for ISBN ${isbn}:`, error);
  }
};

/**
 * Retrieves cached book locations if they exist and are not expired
 * @param {string} isbn - The book's ISBN
 * @returns {Array|null} - The book's locations or null if cache is invalid
 */
export const getCachedBookLocations = (isbn) => {
  try {
    const cachedData = localStorage.getItem(
      `${BOOK_LOCATIONS_CACHE_PREFIX}${isbn}`
    );
    if (!cachedData) return null;

    const { timestamp, locations } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      // Cache expired, remove it
      localStorage.removeItem(`${BOOK_LOCATIONS_CACHE_PREFIX}${isbn}`);
      return null;
    }

    return locations;
  } catch (error) {
    console.error(
      `Error retrieving cached book locations for ISBN ${isbn}:`,
      error
    );
    return null;
  }
};

/**
 * Removes a book and its related data from cache
 * @param {string} isbn - The book's ISBN
 */
export const removeBookFromCache = (isbn) => {
  try {
    // Remove book content
    localStorage.removeItem(`${BOOK_CONTENT_CACHE_PREFIX}${isbn}`);

    // Remove book progress
    localStorage.removeItem(`${BOOK_PROGRESS_CACHE_PREFIX}${isbn}`);

    // Remove book locations
    localStorage.removeItem(`${BOOK_LOCATIONS_CACHE_PREFIX}${isbn}`);

    // Update book list cache by removing the book
    const cachedBookList = getCachedBookList();
    if (cachedBookList) {
      const updatedBookList = cachedBookList.filter(
        (book) => book.isbn.toString() !== isbn.toString()
      );
      cacheBookList(updatedBookList);
    }
  } catch (error) {
    console.error(`Error removing book ${isbn} from cache:`, error);
  }
};

/**
 * Clears progress cache for a specific book (useful when progress is updated)
 * @param {string} isbn - The book's ISBN
 */
export const clearBookProgressCache = (isbn) => {
  try {
    localStorage.removeItem(`${BOOK_PROGRESS_CACHE_PREFIX}${isbn}`);

    // Also clear reading stats cache since progress affects stats
    localStorage.removeItem(READING_STATS_CACHE_KEY);

    // Clear all books with progress cache
    localStorage.removeItem("bibliopod_all_books_with_progress");
  } catch (error) {
    console.error(`Error clearing progress cache for book ${isbn}:`, error);
  }
};

/**
 * Updates a book's data in the cached book list
 * @param {string} isbn - The book's ISBN
 * @param {Object} updatedData - The updated book data
 */
export const updateCachedBook = (isbn, updatedData) => {
  try {
    const cachedBookList = getCachedBookList();
    if (cachedBookList) {
      const updatedBookList = cachedBookList.map((book) => {
        if (book.isbn.toString() === isbn.toString()) {
          return { ...book, ...updatedData };
        }
        return book;
      });

      // Use the helper function to avoid circular dependency
      const cacheData = {
        timestamp: Date.now(),
        books: updatedBookList,
      };
      localStorage.setItem(BOOK_LIST_CACHE_KEY, JSON.stringify(cacheData));

      console.log(
        `[CACHE] Updated book ${isbn} in cache with progress: ${updatedData.progress}%`
      );
    }
  } catch (error) {
    console.error(`Error updating cached book ${isbn}:`, error);
  }
};

/**
 * Refreshes the book list cache with current progress data from individual caches
 */
export const refreshBookListWithProgress = () => {
  try {
    const cachedBookList = getCachedBookList();
    if (cachedBookList) {
      const refreshedBooks = cachedBookList.map((book) => {
        const cachedProgress = getCachedBookProgress(book.isbn);
        if (cachedProgress && cachedProgress.current_percentage !== undefined) {
          return {
            ...book,
            progress: cachedProgress.current_percentage,
          };
        }
        return book;
      });

      const cacheData = {
        timestamp: Date.now(),
        books: refreshedBooks,
      };
      localStorage.setItem(BOOK_LIST_CACHE_KEY, JSON.stringify(cacheData));

      console.log(`[CACHE] Refreshed book list with current progress data`);
      return refreshedBooks;
    }
  } catch (error) {
    console.error("Error refreshing book list with progress:", error);
  }
  return null;
};

/**
 * Updates book progress in localStorage and syncs with database
 * @param {string} isbn - The book's ISBN
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} currentCFI - Current CFI position
 * @param {boolean} syncToDatabase - Whether to sync to database immediately
 */
export const updateBookProgress = async (
  isbn,
  progress,
  currentCFI,
  syncToDatabase = false
) => {
  try {
    const progressData = {
      current_percentage: progress,
      current_cfi: currentCFI,
      updated_at: new Date().toISOString(),
      lastSynced: syncToDatabase ? new Date().toISOString() : null,
    };

    // Update local cache
    cacheBookProgress(isbn, progressData);

    // Update book list cache with new progress
    updateCachedBook(isbn, {
      progress: progress,
      lastRead: progressData.updated_at,
    });

    // Update all books with progress cache
    const allBooksWithProgress = getCachedAllBooksWithProgress();
    if (allBooksWithProgress) {
      const updatedBooks = allBooksWithProgress.map((book) => {
        if (book.isbn.toString() === isbn.toString()) {
          return {
            ...book,
            progress: progress,
            lastRead: progressData.updated_at,
          };
        }
        return book;
      });
      cacheAllBooksWithProgress(updatedBooks);
    }

    // Clear reading stats cache since progress affects stats
    localStorage.removeItem(READING_STATS_CACHE_KEY);

    // Sync to database if requested
    if (syncToDatabase) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const fetchResponse = await fetch(
            "https://bibliopodv2-production.up.railway.app/api/user-book-progress",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                isbn: isbn,
                current_percentage: progress,
                current_cfi: currentCFI,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (fetchResponse.ok) {
            const fetchData = await fetchResponse.json();
            // Update the lastSynced timestamp
            progressData.lastSynced = new Date().toISOString();
            cacheBookProgress(isbn, progressData);
          } else {
            const errorText = await fetchResponse.text();
            console.error("Failed to sync progress to database:", errorText);
          }
        } catch (syncError) {
          console.error("Failed to sync progress to database:", syncError);
          // Don't throw the error, just log it so the local cache still works
        }
      }
    }

    return progressData;
  } catch (error) {
    console.error(`Error updating book progress for ${isbn}:`, error);
    throw error;
  }
};

/**
 * Gets all books with their cached progress data
 * @returns {Array} Array of books with progress
 */
export const getAllBooksWithProgress = () => {
  try {
    // First try to get from cache
    let booksWithProgress = getCachedAllBooksWithProgress();

    if (!booksWithProgress) {
      // If not cached, build from individual caches
      const bookList = getCachedBookList();
      if (bookList) {
        booksWithProgress = bookList.map((book) => {
          const progress = getCachedBookProgress(book.isbn);
          return {
            ...book,
            progress: progress ? progress.current_percentage || 0 : 0,
            lastRead: progress
              ? progress.updated_at || book.updated_at
              : book.updated_at,
          };
        });

        // Cache the result
        cacheAllBooksWithProgress(booksWithProgress);
      } else {
        return [];
      }
    }

    return booksWithProgress;
  } catch (error) {
    console.error("Error getting all books with progress:", error);
    return [];
  }
};

/**
 * Adds a new book to the existing cached book list
 * @param {Object} newBook - The new book object to add
 */
export const addBookToCache = (newBook) => {
  try {
    const existingBooks = getExistingCachedBookList();
    if (existingBooks) {
      // Add the new book to the existing list
      const updatedBooks = [...existingBooks, { ...newBook, progress: 0 }];
      cacheBookList(updatedBooks);
      console.log("New book added to cache:", newBook.title);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("bookCacheRefreshed"));

      return updatedBooks;
    } else {
      // If no existing cache, create new cache with just this book
      const newBookList = [{ ...newBook, progress: 0 }];
      cacheBookList(newBookList);
      console.log("Created new cache with book:", newBook.title);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("bookCacheRefreshed"));

      return newBookList;
    }
  } catch (error) {
    console.error("Error adding book to cache:", error);
    return null;
  }
};

/**
 * Clears only the book list cache, preserving progress data
 */
export const clearBookListCache = () => {
  try {
    // Only clear book list cache, preserve progress data
    localStorage.removeItem(BOOK_LIST_CACHE_KEY);
    localStorage.removeItem("bibliopod_all_books_with_progress");
    console.log("Book list cache cleared, progress data preserved");
  } catch (error) {
    console.error("Error clearing book list cache:", error);
  }
};

/**
 * Clears all book-related cache (use sparingly)
 */
export const clearBookCache = () => {
  try {
    // Clear book list
    localStorage.removeItem(BOOK_LIST_CACHE_KEY);

    // Find and clear all cached items
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(BOOK_CONTENT_CACHE_PREFIX) ||
          key.startsWith(BOOK_PROGRESS_CACHE_PREFIX) ||
          key.startsWith(BOOK_LOCATIONS_CACHE_PREFIX) ||
          key.startsWith(SEARCH_RESULTS_CACHE_PREFIX) ||
          key === READING_STATS_CACHE_KEY ||
          key === COLLECTIONS_LIST_CACHE_KEY ||
          key.startsWith(COLLECTION_DETAILS_CACHE_PREFIX) ||
          key === "bibliopod_all_books_with_progress")
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error("Error clearing book cache:", error);
  }
};

/**
 * Converts an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} - Base64 string representation
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 * @param {string} base64 - The Base64 string to convert
 * @returns {ArrayBuffer} - ArrayBuffer representation
 */
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Calculates the size of cached data in MB
 * @returns {number} - Size in MB
 */
export const getCacheSize = () => {
  try {
    let totalSize = 0;

    // Check book list cache
    const bookListCache = localStorage.getItem(BOOK_LIST_CACHE_KEY);
    if (bookListCache) {
      totalSize += bookListCache.length;
    }

    // Check all cached items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key.startsWith(BOOK_CONTENT_CACHE_PREFIX) ||
        key.startsWith(BOOK_PROGRESS_CACHE_PREFIX) ||
        key.startsWith(BOOK_LOCATIONS_CACHE_PREFIX) ||
        key.startsWith(SEARCH_RESULTS_CACHE_PREFIX) ||
        key === READING_STATS_CACHE_KEY ||
        key === COLLECTIONS_LIST_CACHE_KEY ||
        key.startsWith(COLLECTION_DETAILS_CACHE_PREFIX)
      ) {
        const value = localStorage.getItem(key);
        totalSize += value.length;
      }
    }

    // Convert from bytes to MB
    return totalSize / (1024 * 1024);
  } catch (error) {
    console.error("Error calculating cache size:", error);
    return 0;
  }
};

// ==================== SEARCH CACHING ====================

/**
 * Caches search results for a specific search term
 * @param {string} searchTerm - The search term used
 * @param {Array} results - Array of search result objects
 * @param {Array} allBooks - Array of all books (for future searches)
 */
export const cacheSearchResults = (searchTerm, results, allBooks) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      searchTerm: searchTerm.toLowerCase(),
      results,
      allBooks,
    };

    const cacheKey = `${SEARCH_RESULTS_CACHE_PREFIX}${searchTerm
      .toLowerCase()
      .replace(/\s+/g, "_")}`;
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error caching search results:", error);
  }
};

/**
 * Retrieves cached search results for a specific search term
 * @param {string} searchTerm - The search term to look for
 * @returns {Object|null} - Object with results and allBooks or null if cache is invalid
 */
export const getCachedSearchResults = (searchTerm) => {
  try {
    const cacheKey = `${SEARCH_RESULTS_CACHE_PREFIX}${searchTerm
      .toLowerCase()
      .replace(/\s+/g, "_")}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) return null;

    const { timestamp, results, allBooks } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > SEARCH_CACHE_EXPIRY_TIME) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return { results, allBooks };
  } catch (error) {
    console.error("Error retrieving cached search results:", error);
    return null;
  }
};

/**
 * Caches all books with progress for search functionality
 * @param {Array} booksWithProgress - Array of books with progress data
 */
export const cacheAllBooksWithProgress = (booksWithProgress) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      books: booksWithProgress,
    };
    localStorage.setItem(
      "bibliopod_all_books_with_progress",
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error("Error caching all books with progress:", error);
  }
};

/**
 * Retrieves cached books with progress
 * @returns {Array|null} - Array of books with progress or null if cache is invalid
 */
export const getCachedAllBooksWithProgress = () => {
  try {
    const cachedData = localStorage.getItem(
      "bibliopod_all_books_with_progress"
    );
    if (!cachedData) return null;

    const { timestamp, books } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > SEARCH_CACHE_EXPIRY_TIME) {
      localStorage.removeItem("bibliopod_all_books_with_progress");
      return null;
    }

    return books;
  } catch (error) {
    console.error("Error retrieving cached books with progress:", error);
    return null;
  }
};

// ==================== READING STATS CACHING ====================

/**
 * Caches calculated reading statistics
 * @param {Object} stats - Calculated reading statistics object
 */
export const cacheReadingStats = (stats) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      stats,
    };
    localStorage.setItem(READING_STATS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error caching reading stats:", error);
  }
};

/**
 * Retrieves cached reading statistics
 * @returns {Object|null} - Reading statistics object or null if cache is invalid
 */
export const getCachedReadingStats = () => {
  try {
    const cachedData = localStorage.getItem(READING_STATS_CACHE_KEY);
    if (!cachedData) return null;

    const { timestamp, stats } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > STATS_CACHE_EXPIRY_TIME) {
      localStorage.removeItem(READING_STATS_CACHE_KEY);
      return null;
    }

    return stats;
  } catch (error) {
    console.error("Error retrieving cached reading stats:", error);
    return null;
  }
};

// ==================== COLLECTIONS CACHING ====================

/**
 * Caches the list of collections
 * @param {Array} collections - Array of collection objects
 */
export const cacheCollectionsList = (collections) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      collections,
    };
    localStorage.setItem(COLLECTIONS_LIST_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error caching collections list:", error);
  }
};

/**
 * Retrieves cached collections list
 * @returns {Array|null} - Array of collections or null if cache is invalid
 */
export const getCachedCollectionsList = () => {
  try {
    const cachedData = localStorage.getItem(COLLECTIONS_LIST_CACHE_KEY);
    if (!cachedData) return null;

    const { timestamp, collections } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(COLLECTIONS_LIST_CACHE_KEY);
      return null;
    }

    return collections;
  } catch (error) {
    console.error("Error retrieving cached collections list:", error);
    return null;
  }
};

/**
 * Caches collection details including books
 * @param {string} collectionId - The collection ID
 * @param {Object} collectionData - Object containing collection details and books
 */
export const cacheCollectionDetails = (collectionId, collectionData) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      ...collectionData,
    };
    localStorage.setItem(
      `${COLLECTION_DETAILS_CACHE_PREFIX}${collectionId}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error(
      `Error caching collection details for ID ${collectionId}:`,
      error
    );
  }
};

/**
 * Retrieves cached collection details
 * @param {string} collectionId - The collection ID
 * @returns {Object|null} - Collection details object or null if cache is invalid
 */
export const getCachedCollectionDetails = (collectionId) => {
  try {
    const cachedData = localStorage.getItem(
      `${COLLECTION_DETAILS_CACHE_PREFIX}${collectionId}`
    );
    if (!cachedData) return null;

    const { timestamp, ...collectionData } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(
        `${COLLECTION_DETAILS_CACHE_PREFIX}${collectionId}`
      );
      return null;
    }

    return collectionData;
  } catch (error) {
    console.error(
      `Error retrieving cached collection details for ID ${collectionId}:`,
      error
    );
    return null;
  }
};

// ==================== CACHE INVALIDATION ====================

/**
 * Invalidates all search result caches
 */
export const invalidateSearchCache = () => {
  try {
    // Remove all search result caches
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SEARCH_RESULTS_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    // Remove all books with progress cache
    localStorage.removeItem("bibliopod_all_books_with_progress");
  } catch (error) {
    console.error("Error invalidating search cache:", error);
  }
};

/**
 * Invalidates reading stats cache
 */
export const invalidateStatsCache = () => {
  try {
    localStorage.removeItem(READING_STATS_CACHE_KEY);
  } catch (error) {
    console.error("Error invalidating stats cache:", error);
  }
};

/**
 * Updates collection cache by removing specific books
 * @param {string} collectionId - The collection ID
 * @param {Array} bookIdsToRemove - Array of book IDs to remove from the collection
 */
export const updateCollectionCacheRemoveBooks = (
  collectionId,
  bookIdsToRemove
) => {
  try {
    const cachedDetails = getCachedCollectionDetails(collectionId);
    if (!cachedDetails) {
      console.log("No cached collection details found, skipping cache update");
      return;
    }

    // Filter out the removed books
    const updatedBooks = cachedDetails.books.filter(
      (book) => !bookIdsToRemove.includes(book.id)
    );

    // Update the cached collection details
    const updatedCollectionData = {
      ...cachedDetails,
      books: updatedBooks,
      bookCount: updatedBooks.length,
      timestamp: Date.now(), // Update timestamp
    };

    // Save updated collection details
    localStorage.setItem(
      `${COLLECTION_DETAILS_CACHE_PREFIX}${collectionId}`,
      JSON.stringify(updatedCollectionData)
    );

    console.log(
      `Updated collection cache for ${collectionId}, removed ${bookIdsToRemove.length} books`
    );

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent("collectionCacheRefreshed"));
  } catch (error) {
    console.error("Error updating collection cache:", error);
    // Fallback to invalidating the specific collection cache
    invalidateCollectionCache(collectionId);
  }
};

/**
 * Invalidates collection caches
 * @param {string} collectionId - Optional specific collection ID to invalidate
 */
export const invalidateCollectionCache = (collectionId = null) => {
  try {
    // Always invalidate collections list
    localStorage.removeItem(COLLECTIONS_LIST_CACHE_KEY);

    if (collectionId) {
      // Invalidate specific collection details
      localStorage.removeItem(
        `${COLLECTION_DETAILS_CACHE_PREFIX}${collectionId}`
      );
    } else {
      // Invalidate all collection details
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(COLLECTION_DETAILS_CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent("collectionCache:invalidated"));
  } catch (error) {
    console.error("Error invalidating collection cache:", error);
  }
};

/**
 * Invalidates all caches (search, stats, collections, highlights)
 */
export const invalidateAllCache = () => {
  try {
    invalidateSearchCache();
    invalidateStatsCache();
    invalidateCollectionCache();
    invalidateHighlightsCache();
  } catch (error) {
    console.error("Error invalidating all cache:", error);
  }
};

/**
 * Enhanced book removal that also invalidates related caches
 * @param {string} isbn - The book's ISBN
 */
export const removeBookFromCacheEnhanced = (isbn) => {
  try {
    // Call original removeBookFromCache
    removeBookFromCache(isbn);

    // Invalidate related caches since book data changed
    invalidateSearchCache();
    invalidateStatsCache();
    invalidateHighlightsCache(); // Book removal affects highlights
    // Note: Collections cache is not invalidated here as book removal
    // doesn't necessarily affect collection membership
  } catch (error) {
    console.error(`Error removing book ${isbn} from enhanced cache:`, error);
  }
};

/**
 * Enhanced book update that also invalidates related caches
 * @param {string} isbn - The book's ISBN
 * @param {Object} updatedData - The updated book data
 */
export const updateCachedBookEnhanced = (isbn, updatedData) => {
  try {
    // Call original updateCachedBook
    updateCachedBook(isbn, updatedData);

    // Invalidate related caches since book data changed
    invalidateSearchCache();
    invalidateStatsCache();
    invalidateHighlightsCache(); // Book updates may affect highlights display
  } catch (error) {
    console.error(
      `Error updating cached book ${isbn} in enhanced cache:`,
      error
    );
  }
};

// ==================== HIGHLIGHTS CACHING ====================

const HIGHLIGHTS_CACHE_KEY = "bibliopod_highlights_data";
const HIGHLIGHTS_CACHE_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Caches highlights data (books and flattened highlights)
 * @param {Object} highlightsData - Object containing books and highlights arrays
 */
export const cacheHighlights = (highlightsData) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      ...highlightsData,
    };
    localStorage.setItem(HIGHLIGHTS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error caching highlights:", error);
  }
};

/**
 * Retrieves cached highlights data
 * @returns {Object|null} - Highlights data object or null if cache is invalid
 */
export const getCachedHighlights = () => {
  try {
    const cachedData = localStorage.getItem(HIGHLIGHTS_CACHE_KEY);
    if (!cachedData) return null;

    const { timestamp, ...highlightsData } = JSON.parse(cachedData);

    // Check if cache is expired
    if (Date.now() - timestamp > HIGHLIGHTS_CACHE_EXPIRY_TIME) {
      localStorage.removeItem(HIGHLIGHTS_CACHE_KEY);
      return null;
    }

    return highlightsData;
  } catch (error) {
    console.error("Error retrieving cached highlights:", error);
    return null;
  }
};

/**
 * Invalidates highlights cache
 */
export const invalidateHighlightsCache = () => {
  try {
    localStorage.removeItem(HIGHLIGHTS_CACHE_KEY);
  } catch (error) {
    console.error("Error invalidating highlights cache:", error);
  }
};
