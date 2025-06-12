// BookContext.js
import { createContext, useContext, useState, useEffect } from "react";

const BookContext = createContext();

export const BookProvider = ({ children }) => {
  const [selectedBook, setSelectedBook] = useState(() => {
    try {
      // Try to retrieve the selected book from localStorage
      const storedBook = localStorage.getItem("selectedBook");
      return storedBook ? JSON.parse(storedBook) : null;
    } catch (error) {
      console.error("Error parsing selectedBook from localStorage:", error);
      return null;
    }
  });

  const setBookCurr = (book) => {
    console.log("Setting selected book:", book);
    setSelectedBook(book);
  };

  useEffect(() => {
    // Store the selected book in localStorage whenever it changes
    localStorage.setItem("selectedBook", JSON.stringify(selectedBook));
  }, [selectedBook]);

  return (
    <BookContext.Provider
      value={{ selectedBook: selectedBook || {}, setBookCurr }}
    >
      {children}
    </BookContext.Provider>
  );
};

export const useBookCurr = () => {
  return useContext(BookContext);
};
