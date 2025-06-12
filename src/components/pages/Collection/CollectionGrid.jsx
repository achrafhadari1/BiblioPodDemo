import React from "react";
import { BookDisplay } from "../../components/BookDisplay";
import { motion } from "framer-motion";

export const CollectionGrid = ({ books }) => {
  // Animation variants for the container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // Animation variants for each item
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {books.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-[var(--text)] opacity-70"
        >
          <p className="text-xl">No books in this collection yet.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-4/5 m-auto lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {books.map((book, index) => (
            <motion.div
              key={book.isbn || index}
              variants={itemVariants}
              whileHover={{
                y: -10,
                transition: { duration: 0.3 },
              }}
              className="flex justify-center"
            >
              <BookDisplay
                title={book.title}
                author={book.author}
                img={book.thumbnail}
                description={book.description}
                identifier={book.isbn}
                rating={book.rating}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
