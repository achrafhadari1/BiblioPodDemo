// localStorage-based database for BiblioPod showcase
// This replaces the backend API calls for demo purposes

const STORAGE_KEYS = {
  USER: "bibliopod_user",
  BOOKS: "bibliopod_books",
  COLLECTIONS: "bibliopod_collections",
  HIGHLIGHTS: "bibliopod_highlights",
  READING_PROGRESS: "bibliopod_reading_progress",
  CHALLENGES: "bibliopod_challenges",
  SETTINGS: "bibliopod_settings",
  SHOWCASE_SEEN: "bibliopod_showcase_seen",
};

// Demo user data
const DEMO_USER = {
  id: "demo-user-1",
  name: "Demo User",
  email: "demo@bibliopod.com",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Sample books for demo - empty by default, users can upload their own books
const SAMPLE_BOOKS = [];

// Utility functions
export const localStorageDB = {
  // Initialize demo data if not exists
  initializeDemoData() {
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEMO_USER));
    }

    // Only initialize books if they don't exist, preserve uploaded books
    if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(SAMPLE_BOOKS));
    } else {
      // Clear only old sample books, keep uploaded books
      this.clearOldSampleBooks();
    }

    // Complete the rest of initialization
    this.completeInitialization();
  },

  // Continue initialization
  completeInitialization() {
    if (!localStorage.getItem(STORAGE_KEYS.COLLECTIONS)) {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS)) {
      localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.READING_PROGRESS)) {
      localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify({}));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHALLENGES)) {
      localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({}));
    }
  },

  // User operations
  getUser() {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  setUser(userData) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  },

  // Book operations
  getBooks() {
    const books = localStorage.getItem(STORAGE_KEYS.BOOKS);
    return books ? JSON.parse(books) : [];
  },

  addBook(bookData) {
    const books = this.getBooks();
    const newBook = {
      ...bookData,
      id: `book-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress: 0,
    };
    books.push(newBook);
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    return newBook;
  },

  updateBook(bookId, updates) {
    const books = this.getBooks();
    const bookIndex = books.findIndex(
      (book) => book.id === bookId || book.isbn === bookId
    );
    if (bookIndex !== -1) {
      books[bookIndex] = {
        ...books[bookIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      return books[bookIndex];
    }
    return null;
  },

  getBook(bookId) {
    const books = this.getBooks();
    const book = books.find(
      (book) => book.id === bookId || book.isbn === bookId
    );

    if (book) {
      // Check if there's file data stored for this book
      const fileData = localStorage.getItem(`book_file_${book.isbn}`);
      if (fileData) {
        return { ...book, file_data: fileData };
      }
    }

    return book || null;
  },

  deleteBook(bookId) {
    const books = this.getBooks();
    const filteredBooks = books.filter(
      (book) => book.id !== bookId && book.isbn !== bookId
    );
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(filteredBooks));
    return true;
  },

  // Reading progress operations
  getReadingProgress(isbn) {
    const progress = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
    const progressData = progress ? JSON.parse(progress) : {};
    return (
      progressData[isbn] || {
        current_percentage: 0,
        current_cfi: null,
        updated_at: new Date().toISOString(),
      }
    );
  },

  updateReadingProgress(isbn, percentage, cfi = null) {
    const progress = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
    const progressData = progress ? JSON.parse(progress) : {};
    progressData[isbn] = {
      current_percentage: percentage,
      current_cfi: cfi,
      updated_at: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
    };
    localStorage.setItem(
      STORAGE_KEYS.READING_PROGRESS,
      JSON.stringify(progressData)
    );

    // Also update the book's progress
    this.updateBook(isbn, { progress: percentage });
    return progressData[isbn];
  },

  // Collections operations
  getCollections() {
    const collections = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    return collections ? JSON.parse(collections) : [];
  },

  addCollection(collectionData) {
    const collections = this.getCollections();
    const newCollection = {
      ...collectionData,
      id: `collection-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      books: [],
    };
    collections.push(newCollection);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    return newCollection;
  },

  updateCollection(collectionId, updates) {
    const collections = this.getCollections();
    const collectionIndex = collections.findIndex(
      (collection) => collection.id === collectionId
    );
    if (collectionIndex !== -1) {
      collections[collectionIndex] = {
        ...collections[collectionIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(
        STORAGE_KEYS.COLLECTIONS,
        JSON.stringify(collections)
      );
      return collections[collectionIndex];
    }
    return null;
  },

  deleteCollection(collectionId) {
    const collections = this.getCollections();
    const filteredCollections = collections.filter(
      (collection) => collection.id !== collectionId
    );
    localStorage.setItem(
      STORAGE_KEYS.COLLECTIONS,
      JSON.stringify(filteredCollections)
    );
    return true;
  },

  // Add book to collection
  addBookToCollection(collectionId, bookIsbn) {
    const collections = this.getCollections();
    const collectionIndex = collections.findIndex(
      (collection) => collection.id === collectionId
    );
    if (collectionIndex !== -1) {
      if (!collections[collectionIndex].books) {
        collections[collectionIndex].books = [];
      }
      if (!collections[collectionIndex].books.includes(bookIsbn)) {
        collections[collectionIndex].books.push(bookIsbn);
        collections[collectionIndex].updated_at = new Date().toISOString();
        localStorage.setItem(
          STORAGE_KEYS.COLLECTIONS,
          JSON.stringify(collections)
        );
        return collections[collectionIndex];
      }
    }
    return null;
  },

  // Remove book from collection
  removeBookFromCollection(collectionId, bookIsbn) {
    const collections = this.getCollections();
    const collectionIndex = collections.findIndex(
      (collection) => collection.id === collectionId
    );
    if (collectionIndex !== -1 && collections[collectionIndex].books) {
      collections[collectionIndex].books = collections[
        collectionIndex
      ].books.filter((isbn) => isbn !== bookIsbn);
      collections[collectionIndex].updated_at = new Date().toISOString();
      localStorage.setItem(
        STORAGE_KEYS.COLLECTIONS,
        JSON.stringify(collections)
      );
      return collections[collectionIndex];
    }
    return null;
  },

  // Remove multiple books from collection
  removeBooksFromCollection(collectionId, bookIsbns) {
    const collections = this.getCollections();
    const collectionIndex = collections.findIndex(
      (collection) => collection.id === collectionId
    );
    if (collectionIndex !== -1 && collections[collectionIndex].books) {
      collections[collectionIndex].books = collections[
        collectionIndex
      ].books.filter((isbn) => !bookIsbns.includes(isbn));
      collections[collectionIndex].updated_at = new Date().toISOString();
      localStorage.setItem(
        STORAGE_KEYS.COLLECTIONS,
        JSON.stringify(collections)
      );
      return collections[collectionIndex];
    }
    return null;
  },

  // Highlights operations
  getHighlights() {
    const highlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    return highlights ? JSON.parse(highlights) : [];
  },

  addHighlight(highlightData) {
    const highlights = this.getHighlights();
    const newHighlight = {
      ...highlightData,
      id: `highlight-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    highlights.push(newHighlight);
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
    return newHighlight;
  },

  deleteHighlight(highlightId) {
    const highlights = this.getHighlights();
    const filteredHighlights = highlights.filter(
      (highlight) => highlight.id !== highlightId
    );
    localStorage.setItem(
      STORAGE_KEYS.HIGHLIGHTS,
      JSON.stringify(filteredHighlights)
    );
    return true;
  },

  // Challenges operations
  getChallenges() {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];

    // Add progress calculation to each challenge
    const books = this.getBooks();
    return challengesData.map((challenge) => {
      const challengeBooks = (challenge.book_isbns || [])
        .map((isbn) => books.find((book) => book.isbn === isbn))
        .filter(Boolean);

      return {
        ...challenge,
        books: challengeBooks,
        progress: challengeBooks.length,
      };
    });
  },

  addChallenge(challengeData) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const newChallenge = {
      ...challengeData,
      id: `challenge-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      book_isbns: challengeData.book_isbns || [],
    };
    challengesData.push(newChallenge);
    localStorage.setItem(
      STORAGE_KEYS.CHALLENGES,
      JSON.stringify(challengesData)
    );

    // Return enriched challenge with progress
    return this.getChallenge(newChallenge.id);
  },

  updateChallenge(challengeId, updates) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const challengeIndex = challengesData.findIndex(
      (challenge) => challenge.id === challengeId
    );
    if (challengeIndex !== -1) {
      challengesData[challengeIndex] = {
        ...challengesData[challengeIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(
        STORAGE_KEYS.CHALLENGES,
        JSON.stringify(challengesData)
      );
      return this.getChallenge(challengeId);
    }
    return null;
  },

  getChallenge(challengeId) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const challenge = challengesData.find((c) => c.id === challengeId);
    if (challenge) {
      // Populate books array with full book data
      const books = this.getBooks();
      const challengeBooks = (challenge.book_isbns || [])
        .map((isbn) => books.find((book) => book.isbn === isbn))
        .filter(Boolean);

      return {
        ...challenge,
        books: challengeBooks,
        progress: challengeBooks.length,
      };
    }
    return null;
  },

  deleteChallenge(challengeId) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const filteredChallenges = challengesData.filter(
      (challenge) => challenge.id !== challengeId
    );
    localStorage.setItem(
      STORAGE_KEYS.CHALLENGES,
      JSON.stringify(filteredChallenges)
    );
    return filteredChallenges.length < challengesData.length;
  },

  addBookToChallenge(challengeId, bookIsbn) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const challengeIndex = challengesData.findIndex(
      (challenge) => challenge.id === challengeId
    );
    if (challengeIndex !== -1) {
      const challenge = challengesData[challengeIndex];
      if (!challenge.book_isbns) {
        challenge.book_isbns = [];
      }
      if (!challenge.book_isbns.includes(bookIsbn)) {
        challenge.book_isbns.push(bookIsbn);
        challenge.updated_at = new Date().toISOString();
        localStorage.setItem(
          STORAGE_KEYS.CHALLENGES,
          JSON.stringify(challengesData)
        );
        return this.getChallenge(challengeId);
      }
    }
    return null;
  },

  removeBookFromChallenge(challengeId, bookIsbn) {
    const challenges = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    const challengesData = challenges ? JSON.parse(challenges) : [];
    const challengeIndex = challengesData.findIndex(
      (challenge) => challenge.id === challengeId
    );
    if (challengeIndex !== -1) {
      const challenge = challengesData[challengeIndex];
      if (challenge.book_isbns) {
        challenge.book_isbns = challenge.book_isbns.filter(
          (isbn) => isbn !== bookIsbn
        );
        challenge.updated_at = new Date().toISOString();
        localStorage.setItem(
          STORAGE_KEYS.CHALLENGES,
          JSON.stringify(challengesData)
        );
        return this.getChallenge(challengeId);
      }
    }
    return null;
  },

  // Settings operations
  getSettings() {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : {};
  },

  updateSettings(newSettings) {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(updatedSettings)
    );
    return updatedSettings;
  },

  // Showcase message
  hasSeenShowcase() {
    return localStorage.getItem(STORAGE_KEYS.SHOWCASE_SEEN) === "true";
  },

  markShowcaseSeen() {
    localStorage.setItem(STORAGE_KEYS.SHOWCASE_SEEN, "true");
  },

  // Annotation operations
  getAnnotations(bookIsbn) {
    const highlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    const annotations = highlights ? JSON.parse(highlights) : [];
    return annotations.filter(
      (annotation) => annotation.book_isbn === bookIsbn
    );
  },

  addAnnotation(annotation) {
    const highlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    const annotations = highlights ? JSON.parse(highlights) : [];
    annotations.push(annotation);
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(annotations));
    return annotation;
  },

  deleteAnnotation(bookIsbn, cfiRange) {
    const highlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    const annotations = highlights ? JSON.parse(highlights) : [];
    const filteredAnnotations = annotations.filter(
      (annotation) =>
        !(
          annotation.book_isbn === bookIsbn && annotation.cfi_range === cfiRange
        )
    );
    localStorage.setItem(
      STORAGE_KEYS.HIGHLIGHTS,
      JSON.stringify(filteredAnnotations)
    );
    return true;
  },

  // Clear all data (for logout)
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  // Reset to fresh state with empty library
  resetToFreshState() {
    this.clearAllData();
    this.initializeDemoData();
  },

  // Clear only old sample books, preserve uploaded books
  clearOldSampleBooks() {
    const books = this.getBooks();
    const uploadedBooks = books.filter((book) => {
      // Keep books that have associated file data (uploaded books)
      const fileData = localStorage.getItem(`book_file_${book.isbn}`);
      return fileData !== null;
    });

    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(uploadedBooks));
    console.log(
      `Cleared sample books, preserved ${uploadedBooks.length} uploaded books`
    );
  },
};

export default localStorageDB;
