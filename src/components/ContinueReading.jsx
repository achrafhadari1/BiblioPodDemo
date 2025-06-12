import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MdArrowOutward } from "react-icons/md";

import "./style/mainpage.css";
import "../index.css";
import { Progress } from "semantic-ui-react";
export const ContinueReading = () => {
  const [colors, setColors] = useState(null);
  const [storedBook, setStoredBook] = useState(null);
  const [value, setValue] = useState(0);

  // Function to get the most recently accessed book from localStorage
  const getStoredBook = () => {
    // First check if there's a selectedBook
    const selectedBook = localStorage.getItem("selectedBook");
    if (selectedBook) {
      const book = JSON.parse(selectedBook);
      if (book.last_accessed) {
        return book;
      }
    }

    // If no selectedBook with timestamp, check cached books for most recent
    try {
      const cachedBooksData = localStorage.getItem("bibliopod_book_list");
      if (cachedBooksData) {
        const { books } = JSON.parse(cachedBooksData);
        let mostRecentBook = null;
        let mostRecentTime = null;

        books.forEach((book) => {
          if (book.last_accessed) {
            const accessTime = new Date(book.last_accessed);
            if (!mostRecentTime || accessTime > mostRecentTime) {
              mostRecentTime = accessTime;
              mostRecentBook = book;
            }
          }
        });

        if (mostRecentBook) {
          return mostRecentBook;
        }
      }
    } catch (error) {
      console.error("Error checking cached books:", error);
    }

    // Fallback to selectedBook without timestamp
    return selectedBook ? JSON.parse(selectedBook) : null;
  };

  // Initialize stored book
  useEffect(() => {
    setStoredBook(getStoredBook());
  }, []);

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredBook(getStoredBook());
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events (from same tab)
    window.addEventListener("selectedBookChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("selectedBookChanged", handleStorageChange);
    };
  }, []);

  // Use localStorage to get the stored CFI and percentage
  useEffect(() => {
    const storedPercentage = localStorage.getItem("currentPercentageFromCFI");
    if (storedPercentage !== null) {
      setValue(parseFloat(storedPercentage));
    }
  }, [storedBook]); // Re-run when storedBook changes

  if (storedBook == null) {
    return <div></div>;
  }

  return (
    <>
      <div
        style={{
          background:
            colors && colors.length > 0
              ? `linear-gradient(143deg, ${colors[0]} 0%, ${colors[2]} 50%, ${colors[4]} 100%)`
              : "#000",
        }}
        className="reading-container"
      >
        <div className="book-info">
          <div className="curr-pt-1">
            <img
              className="now-reading"
              src={storedBook.imageLinks?.thumbnail}
              alt={storedBook.title}
            />
          </div>
          <div className="curr-pt-2">
            <div className="curr-title">{storedBook.title}</div>
            <div className="curr-desc">
              {storedBook.description
                ? storedBook.description.slice(0, 150) + "..."
                : ""}
            </div>
            <div className="curr-author">- {storedBook.authors}</div>
            <div className="curr-button cursor">
              <Link
                to={
                  "/read?book=isbn:" +
                  storedBook.industryIdentifiers[1].identifier
                }
              >
                Continue Reading
              </Link>
              <div className="goIcon">
                <MdArrowOutward />
              </div>
            </div>
            <div className="curr-pt-3">
              <Progress
                value={Math.round(value)}
                total="100"
                progress="percent"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
