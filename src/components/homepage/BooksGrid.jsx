import React from "react";
import { BookDisplay } from "../BookDisplay";

export const BooksGrid = ({ sortedFilteredBooks, setFileDetails }) => {
  return (
    <div className="grid grid-cols-4 gap-6">
      {sortedFilteredBooks.map((book) => (
        <BookDisplay
          key={book.isbn}
          title={book.title}
          author={book.author}
          img={book.thumbnail}
          identifier={book.isbn}
          userId={book.userId}
          bookDetails={book}
          rating={book.rating}
          progress={book.progress}
          onDeleteBook={(deletedId) => {
            setFileDetails((prev) =>
              prev.filter((book) => book.isbn !== deletedId)
            );
          }}
          updateBookData={(updatedBook) => {
            setFileDetails((prev) =>
              prev.map((book) =>
                book.isbn === updatedBook.isbn
                  ? { ...book, ...updatedBook }
                  : book
              )
            );
          }}
        />
      ))}
    </div>
  );
};
