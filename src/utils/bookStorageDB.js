/**
 * IndexedDB Storage for BiblioPod
 * Complete storage solution replacing localStorage
 */

const DB_NAME = "BiblioPodDB";
const DB_VERSION = 2;
const BOOKS_STORE = "books";
const FILES_STORE = "bookFiles";
const COLLECTIONS_STORE = "collections";
const HIGHLIGHTS_STORE = "highlights";
const BOOKMARKS_STORE = "bookmarks";
const PROGRESS_STORE = "readingProgress";
const CHALLENGES_STORE = "challenges";
const SETTINGS_STORE = "settings";
const USER_STORE = "user";

class BiblioPodDB {
  constructor() {
    this.db = null;
  }

  async init() {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      console.warn("IndexedDB not available in this environment");
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create books store for metadata
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          const booksStore = db.createObjectStore(BOOKS_STORE, {
            keyPath: "isbn",
          });
          booksStore.createIndex("title", "title", { unique: false });
          booksStore.createIndex("author", "author", { unique: false });
          booksStore.createIndex("created_at", "created_at", { unique: false });
        }

        // Create files store for binary data
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, {
            keyPath: "isbn",
          });
        }

        // Create collections store
        if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
          const collectionsStore = db.createObjectStore(COLLECTIONS_STORE, {
            keyPath: "id",
          });
          collectionsStore.createIndex("name", "name", { unique: false });
          collectionsStore.createIndex("created_at", "created_at", {
            unique: false,
          });
        }

        // Create highlights store
        if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
          const highlightsStore = db.createObjectStore(HIGHLIGHTS_STORE, {
            keyPath: "id",
          });
          highlightsStore.createIndex("book_isbn", "book_isbn", {
            unique: false,
          });
          highlightsStore.createIndex("created_at", "created_at", {
            unique: false,
          });
        }

        // Create bookmarks store
        if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
          const bookmarksStore = db.createObjectStore(BOOKMARKS_STORE, {
            keyPath: "id",
          });
          bookmarksStore.createIndex("book_isbn", "book_isbn", {
            unique: false,
          });
          bookmarksStore.createIndex("created_at", "created_at", {
            unique: false,
          });
        }

        // Create reading progress store
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          const progressStore = db.createObjectStore(PROGRESS_STORE, {
            keyPath: "isbn",
          });
          progressStore.createIndex("updated_at", "updated_at", {
            unique: false,
          });
        }

        // Create challenges store
        if (!db.objectStoreNames.contains(CHALLENGES_STORE)) {
          const challengesStore = db.createObjectStore(CHALLENGES_STORE, {
            keyPath: "id",
          });
          challengesStore.createIndex("created_at", "created_at", {
            unique: false,
          });
          challengesStore.createIndex("status", "status", { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          const settingsStore = db.createObjectStore(SETTINGS_STORE, {
            keyPath: "key",
          });
        }

        // Create user store
        if (!db.objectStoreNames.contains(USER_STORE)) {
          const userStore = db.createObjectStore(USER_STORE, { keyPath: "id" });
        }
      };
    });
  }

  async addBook(bookData, file) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(
      [BOOKS_STORE, FILES_STORE],
      "readwrite"
    );
    const booksStore = transaction.objectStore(BOOKS_STORE);
    const filesStore = transaction.objectStore(FILES_STORE);

    try {
      // Store book metadata (without file data)
      const bookMetadata = {
        ...bookData,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      delete bookMetadata.file_data; // Remove file_data if it exists

      await this.promisifyRequest(booksStore.put(bookMetadata));

      // Store file as Blob (much more efficient than base64)
      const fileData = {
        isbn: bookData.isbn,
        file: file, // Store the actual File object
        stored_at: new Date().toISOString(),
      };

      await this.promisifyRequest(filesStore.put(fileData));

      return { success: true, data: bookMetadata };
    } catch (error) {
      console.error("Error storing book in IndexedDB:", error);

      if (error.name === "QuotaExceededError") {
        throw new Error(
          "Storage quota exceeded. Please free up space by deleting some books."
        );
      }

      throw error;
    }
  }

  async getBook(isbn) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([BOOKS_STORE], "readonly");
    const store = transaction.objectStore(BOOKS_STORE);

    return this.promisifyRequest(store.get(isbn));
  }

  async getBookFile(isbn) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([FILES_STORE], "readonly");
    const store = transaction.objectStore(FILES_STORE);

    const result = await this.promisifyRequest(store.get(isbn));
    return result ? result.file : null;
  }

  async getAllBooks() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([BOOKS_STORE], "readonly");
    const store = transaction.objectStore(BOOKS_STORE);

    return this.promisifyRequest(store.getAll());
  }

  async updateBook(isbn, updates) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([BOOKS_STORE], "readwrite");
    const store = transaction.objectStore(BOOKS_STORE);

    const book = await this.promisifyRequest(store.get(isbn));
    if (book) {
      const updatedBook = {
        ...book,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await this.promisifyRequest(store.put(updatedBook));
      return updatedBook;
    }
    return null;
  }

  async deleteBook(isbn) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(
      [BOOKS_STORE, FILES_STORE],
      "readwrite"
    );
    const booksStore = transaction.objectStore(BOOKS_STORE);
    const filesStore = transaction.objectStore(FILES_STORE);

    try {
      await this.promisifyRequest(booksStore.delete(isbn));
      await this.promisifyRequest(filesStore.delete(isbn));
      return true;
    } catch (error) {
      console.error("Error deleting book:", error);
      return false;
    }
  }

  async getStorageUsage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;

      return {
        used: this.formatBytes(used),
        available: this.formatBytes(available),
        percentage: Math.round(percentage),
        usedBytes: used,
        availableBytes: available,
      };
    } catch (error) {
      console.error("Error getting storage estimate:", error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // User operations
  async initializeDemoData() {
    if (!this.db) await this.init();

    try {
      // Initialize demo books and other data if needed
      // User creation is now handled separately in the auth flow
      console.log("Demo data initialization completed");
    } catch (error) {
      console.error("Error initializing demo data:", error);
    }
  }

  async getUser() {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([USER_STORE], "readonly");
    const store = transaction.objectStore(USER_STORE);
    const users = await this.promisifyRequest(store.getAll());
    return users.length > 0 ? users[0] : null;
  }

  async setUser(userData) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([USER_STORE], "readwrite");
    const store = transaction.objectStore(USER_STORE);
    return this.promisifyRequest(store.put(userData));
  }

  // Collections operations
  async getCollections() {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readonly");
    const store = transaction.objectStore(COLLECTIONS_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async addCollection(collectionData) {
    if (!this.db) await this.init();
    const newCollection = {
      ...collectionData,
      id: `collection-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readwrite");
    const store = transaction.objectStore(COLLECTIONS_STORE);
    await this.promisifyRequest(store.put(newCollection));
    return newCollection;
  }

  async updateCollection(id, updates) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readwrite");
    const store = transaction.objectStore(COLLECTIONS_STORE);
    const collection = await this.promisifyRequest(store.get(id));
    if (collection) {
      const updatedCollection = {
        ...collection,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await this.promisifyRequest(store.put(updatedCollection));
      return updatedCollection;
    }
    return null;
  }

  async deleteCollection(id) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readwrite");
    const store = transaction.objectStore(COLLECTIONS_STORE);
    try {
      await this.promisifyRequest(store.delete(id));
      return true;
    } catch (error) {
      console.error("Error deleting collection:", error);
      return false;
    }
  }

  async addBookToCollection(collectionId, bookIsbn) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readwrite");
    const store = transaction.objectStore(COLLECTIONS_STORE);

    try {
      const collection = await this.promisifyRequest(store.get(collectionId));
      if (collection) {
        if (!collection.books) {
          collection.books = [];
        }
        if (!collection.books.includes(bookIsbn)) {
          collection.books.push(bookIsbn);
          collection.updated_at = new Date().toISOString();
          await this.promisifyRequest(store.put(collection));
          return collection;
        }
      }
      return collection;
    } catch (error) {
      console.error("Error adding book to collection:", error);
      return null;
    }
  }

  async removeBookFromCollection(collectionId, bookIsbn) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([COLLECTIONS_STORE], "readwrite");
    const store = transaction.objectStore(COLLECTIONS_STORE);

    try {
      const collection = await this.promisifyRequest(store.get(collectionId));
      if (collection && collection.books) {
        collection.books = collection.books.filter((isbn) => isbn !== bookIsbn);
        collection.updated_at = new Date().toISOString();
        await this.promisifyRequest(store.put(collection));
        return collection;
      }
      return collection;
    } catch (error) {
      console.error("Error removing book from collection:", error);
      return null;
    }
  }

  async removeBooksFromCollection(collectionId, bookIsbns) {
    const collection = await this.updateCollection(collectionId, {});
    if (collection && collection.books) {
      const updatedBooks = collection.books.filter(
        (isbn) => !bookIsbns.includes(isbn)
      );
      return this.updateCollection(collectionId, { books: updatedBooks });
    }
    return collection;
  }

  // Highlights operations
  async getHighlights() {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([HIGHLIGHTS_STORE], "readonly");
    const store = transaction.objectStore(HIGHLIGHTS_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async addHighlight(highlightData) {
    if (!this.db) await this.init();
    const newHighlight = {
      ...highlightData,
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    const transaction = this.db.transaction([HIGHLIGHTS_STORE], "readwrite");
    const store = transaction.objectStore(HIGHLIGHTS_STORE);
    await this.promisifyRequest(store.put(newHighlight));
    return newHighlight;
  }

  async deleteHighlight(id) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([HIGHLIGHTS_STORE], "readwrite");
    const store = transaction.objectStore(HIGHLIGHTS_STORE);
    try {
      await this.promisifyRequest(store.delete(id));
      return true;
    } catch (error) {
      console.error("Error deleting highlight:", error);
      return false;
    }
  }

  async getAnnotations(bookIsbn) {
    const highlights = await this.getHighlights();
    return highlights.filter((h) => h.book_isbn === bookIsbn);
  }

  async addAnnotation(bookIsbn, annotationData) {
    return this.addHighlight({
      ...annotationData,
      book_isbn: bookIsbn,
    });
  }

  async deleteAnnotation(bookIsbn, id) {
    // Delete by ID - this is the main method used by the UI
    return this.deleteHighlight(id);
  }

  // Bookmark operations
  async getBookmarks(bookIsbn) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([BOOKMARKS_STORE], "readonly");
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const index = store.index("book_isbn");
    return this.promisifyRequest(index.getAll(bookIsbn));
  }

  async addBookmark(bookIsbn, bookmarkData) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([BOOKMARKS_STORE], "readwrite");
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const bookmark = {
      ...bookmarkData,
      book_isbn: bookIsbn,
      created_at: new Date().toISOString(),
    };
    return this.promisifyRequest(store.add(bookmark));
  }

  async deleteBookmark(bookIsbn, bookmarkId) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([BOOKMARKS_STORE], "readwrite");
    const store = transaction.objectStore(BOOKMARKS_STORE);
    return this.promisifyRequest(store.delete(bookmarkId));
  }

  async updateBookmark(bookIsbn, bookmarkId, updates) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([BOOKMARKS_STORE], "readwrite");
    const store = transaction.objectStore(BOOKMARKS_STORE);
    const bookmark = await this.promisifyRequest(store.get(bookmarkId));
    if (bookmark) {
      const updatedBookmark = { ...bookmark, ...updates };
      return this.promisifyRequest(store.put(updatedBookmark));
    }
    return false;
  }

  // Reading progress operations
  async getReadingProgress(isbn) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([PROGRESS_STORE], "readonly");
    const store = transaction.objectStore(PROGRESS_STORE);
    const progress = await this.promisifyRequest(store.get(isbn));
    return progress || { current_percentage: 0, current_cfi: null };
  }

  async updateReadingProgress(
    isbn,
    current_percentage,
    current_cfi,
    lastRead = null
  ) {
    if (!this.db) await this.init();
    const progressData = {
      isbn,
      current_percentage,
      current_cfi,
      updated_at: new Date().toISOString(),
      lastRead: lastRead || new Date().toISOString(),
    };
    const transaction = this.db.transaction([PROGRESS_STORE], "readwrite");
    const store = transaction.objectStore(PROGRESS_STORE);
    await this.promisifyRequest(store.put(progressData));

    // Also update the book's progress
    await this.updateBook(isbn, {
      progress: current_percentage,
      lastRead: progressData.lastRead,
    });

    return progressData;
  }

  // Challenges operations
  async getChallenges() {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([CHALLENGES_STORE], "readonly");
    const store = transaction.objectStore(CHALLENGES_STORE);
    return this.promisifyRequest(store.getAll());
  }

  async getChallenge(id) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([CHALLENGES_STORE], "readonly");
    const store = transaction.objectStore(CHALLENGES_STORE);
    return this.promisifyRequest(store.get(id));
  }

  async addChallenge(challengeData) {
    if (!this.db) await this.init();
    const books = challengeData.books || [];
    const progress = books.length;
    const newChallenge = {
      ...challengeData,
      id: `challenge-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: progress >= challengeData.goal_count ? "completed" : "active",
      books: books,
      progress: progress,
    };
    const transaction = this.db.transaction([CHALLENGES_STORE], "readwrite");
    const store = transaction.objectStore(CHALLENGES_STORE);
    await this.promisifyRequest(store.put(newChallenge));
    return newChallenge;
  }

  async updateChallenge(id, updates) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([CHALLENGES_STORE], "readwrite");
    const store = transaction.objectStore(CHALLENGES_STORE);
    const challenge = await this.promisifyRequest(store.get(id));
    if (challenge) {
      const updatedChallenge = {
        ...challenge,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await this.promisifyRequest(store.put(updatedChallenge));
      return updatedChallenge;
    }
    return null;
  }

  async deleteChallenge(id) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([CHALLENGES_STORE], "readwrite");
    const store = transaction.objectStore(CHALLENGES_STORE);
    try {
      await this.promisifyRequest(store.delete(id));
      return true;
    } catch (error) {
      console.error("Error deleting challenge:", error);
      return false;
    }
  }

  async addBookToChallenge(challengeId, bookIsbn) {
    const challenge = await this.getChallenge(challengeId);
    if (challenge) {
      const books = challenge.books || [];
      if (!books.includes(bookIsbn)) {
        books.push(bookIsbn);
        const progress = books.length;
        const status =
          progress >= challenge.goal_count ? "completed" : "active";
        return this.updateChallenge(challengeId, { books, progress, status });
      }
    }
    return challenge;
  }

  async removeBookFromChallenge(challengeId, bookIsbn) {
    const challenge = await this.getChallenge(challengeId);
    if (challenge && challenge.books) {
      const books = challenge.books.filter((isbn) => isbn !== bookIsbn);
      const progress = books.length;
      const status = progress >= challenge.goal_count ? "completed" : "active";
      return this.updateChallenge(challengeId, { books, progress, status });
    }
    return challenge;
  }

  // Settings operations
  async getSettings() {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([SETTINGS_STORE], "readonly");
    const store = transaction.objectStore(SETTINGS_STORE);
    const settings = await this.promisifyRequest(store.getAll());
    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });
    return settingsObj;
  }

  async updateSettings(settingsData) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction([SETTINGS_STORE], "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE);

    for (const [key, value] of Object.entries(settingsData)) {
      await this.promisifyRequest(store.put({ key, value }));
    }

    return settingsData;
  }

  async isShowcaseSeen() {
    const settings = await this.getSettings();
    return settings.showcase_seen === true;
  }

  // Alias for compatibility with localStorageDB
  async hasSeenShowcase() {
    return this.isShowcaseSeen();
  }

  async markShowcaseSeen() {
    return this.updateSettings({ showcase_seen: true });
  }

  async clearAllData() {
    if (!this.db) await this.init();

    const stores = [
      BOOKS_STORE,
      FILES_STORE,
      COLLECTIONS_STORE,
      HIGHLIGHTS_STORE,
      PROGRESS_STORE,
      CHALLENGES_STORE,
      SETTINGS_STORE,
      USER_STORE,
    ];

    const transaction = this.db.transaction(stores, "readwrite");

    try {
      for (const storeName of stores) {
        const store = transaction.objectStore(storeName);
        await this.promisifyRequest(store.clear());
      }
      return true;
    } catch (error) {
      console.error("Error clearing IndexedDB:", error);
      return false;
    }
  }

  // Selected book methods
  async setSelectedBook(bookData) {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE);
      await this.promisifyRequest(
        store.put({ key: "selectedBook", value: bookData })
      );
      return true;
    } catch (error) {
      console.error("Error setting selected book:", error);
      return false;
    }
  }

  async getSelectedBook() {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);
      const result = await this.promisifyRequest(store.get("selectedBook"));
      return result ? result.value : null;
    } catch (error) {
      console.error("Error getting selected book:", error);
      return null;
    }
  }

  // Reader settings methods
  async setReaderSettings(settings) {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE);
      await this.promisifyRequest(
        store.put({ key: "readerSettings", value: settings })
      );
      return true;
    } catch (error) {
      console.error("Error setting reader settings:", error);
      return false;
    }
  }

  async getReaderSettings() {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);
      const result = await this.promisifyRequest(store.get("readerSettings"));
      return result ? result.value : {};
    } catch (error) {
      console.error("Error getting reader settings:", error);
      return {};
    }
  }

  async updateReaderSetting(key, value) {
    try {
      const settings = await this.getReaderSettings();
      settings[key] = value;
      await this.setReaderSettings(settings);
      return true;
    } catch (error) {
      console.error("Error updating reader setting:", error);
      return false;
    }
  }

  // Book locations caching methods
  async setBookLocations(isbn, locationsData) {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE);
      await this.promisifyRequest(
        store.put({ key: `book_locations_${isbn}`, value: locationsData })
      );
      return true;
    } catch (error) {
      console.error("Error setting book locations:", error);
      return false;
    }
  }

  async getBookLocations(isbn) {
    try {
      if (!this.db) await this.init();
      const transaction = this.db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);
      const result = await this.promisifyRequest(
        store.get(`book_locations_${isbn}`)
      );
      return result ? result.value : null;
    } catch (error) {
      console.error("Error getting book locations:", error);
      return null;
    }
  }
}

// Create singleton instance
export const bookStorageDB = new BiblioPodDB();

// Initialize only in browser environment
if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
  bookStorageDB.init().catch(console.error);
}

export default bookStorageDB;
