import { useState, useEffect } from "react";
import axios from "axios";

export const useBookManagement = (user) => {
  const [fileDetails, setFileDetails] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  // Function to get selected book from localStorage
  const getSelectedBook = () => {
    const stored = localStorage.getItem("selectedBook");
    return stored ? JSON.parse(stored) : null;
  };

  // Initialize selected book
  useEffect(() => {
    setSelectedBook(getSelectedBook());
  }, []);

  // Listen for selectedBook changes
  useEffect(() => {
    const handleSelectedBookChange = () => {
      setSelectedBook(getSelectedBook());
    };

    window.addEventListener("selectedBookChanged", handleSelectedBookChange);
    window.addEventListener("storage", handleSelectedBookChange);

    return () => {
      window.removeEventListener(
        "selectedBookChanged",
        handleSelectedBookChange
      );
      window.removeEventListener("storage", handleSelectedBookChange);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const fetchBooks = async () => {
    try {
      // Import caching functions
      const { getCachedBookList, cacheBookList } = await import(
        "../../../utils/bookCache"
      );

      // Try to get books from cache first
      const cachedBooks = getCachedBookList();
      if (cachedBooks) {
        setFileDetails(cachedBooks);
        setGenres(cachedBooks.map((book) => book.genre));
        setLoading(false);
        return;
      }

      // If no cache or expired, fetch from API
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://bibliopodv2-production.up.railway.app/api/books",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const booksWithProgress = await Promise.all(
        response.data.books.map(async (book) => {
          try {
            const progressResponse = await axios.get(
              `https://bibliopodv2-production.up.railway.app/api/user-book-progress/${book.isbn}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            return {
              ...book,
              progress: progressResponse.data.progress.current_percentage || 0,
            };
          } catch (error) {
            if (error.response && error.response.status === 404) {
              return {
                ...book,
                progress: 0,
              };
            } else {
              return {
                ...book,
                progress: 0,
              };
            }
          }
        })
      );

      // Cache the books for future use
      cacheBookList(booksWithProgress);

      setFileDetails(booksWithProgress);
      setGenres(booksWithProgress.map((book) => book.genre));
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = (deletedIdentifier) => {
    const updatedFileDetails = fileDetails.filter(
      (book) => book.isbn !== deletedIdentifier
    );
    setFileDetails(updatedFileDetails);
  };

  const updateBookData = (updatedBook, identifier) => {
    setFileDetails((prevFileDetails) =>
      prevFileDetails.map((book) =>
        book.isbn === identifier ? { ...book, ...updatedBook } : book
      )
    );
  };

  return {
    fileDetails,
    setFileDetails,
    genres,
    loading,
    selectedBook,
    fetchBooks,
    handleDeleteBook,
    updateBookData,
  };
};
