import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "../../components/ui/drawer";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const EditCollection = ({
  BooksByCollection,
  collection,
  textColor,
  refreshCollectionDetails,
  refreshCollection,
}) => {
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [books, setBooks] = useState([]);
  const [deletedBookIds, setDeletedBookIds] = useState([]);
  const [originalBooks, setOriginalBooks] = useState([]);
  const [editedCollectionName, setEditedCollectionName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (collection) {
      setCollectionName(collection.collection_name);
      setEditedCollectionName(collection.collection_name);
      setCollectionDescription(collection.collection_description);
    }

    if (Array.isArray(BooksByCollection)) {
      setBooks(BooksByCollection);
      setOriginalBooks(BooksByCollection);
    }
  }, [collection, BooksByCollection]);

  const removeBook = (bookId) => {
    setBooks(books.filter((book) => book.isbn !== bookId));
    setDeletedBookIds((prevDeletedBookIds) => [...prevDeletedBookIds, bookId]);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");

    try {
      // Show loading toast
      toast.loading("Updating collection...");

      // 1. Update Collection Name & Description
      await axios.put(
        `/collections/${collection.id}`,
        {
          collection_name: editedCollectionName,
          collection_description: collectionDescription,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Delete Books if any were removed
      for (const bookId of deletedBookIds) {
        await axios.delete(`/collected-books/${collection.id}/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Reset deletedBookIds & refresh collection
      setDeletedBookIds([]);
      setCollectionName(editedCollectionName);
      setIsOpen(false);

      // Invalidate collection cache
      const { invalidateCollectionCache } = await import(
        "../../../utils/bookCache"
      );
      invalidateCollectionCache(); // Collection modified, invalidate cache

      // Notify other components about collection changes
      window.dispatchEvent(new CustomEvent("collectionCacheRefreshed"));

      // Dismiss loading toast and show success
      toast.dismiss();
      toast.success("Collection updated successfully", {
        description: `${deletedBookIds.length} books removed, collection details updated.`,
      });

      refreshCollection?.();
      refreshCollectionDetails?.();
    } catch (error) {
      toast.dismiss();
      toast.error("Error updating collection", {
        description:
          "There was an issue updating the collection. Please try again.",
      });
      console.error("Error updating collection:", error);
    }
  };

  const handleCancel = () => {
    // Reset books to original list when cancel is clicked
    setBooks(originalBooks);
    setDeletedBookIds([]);
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center p-3 rounded-full bg-[var(--card-bg)] text-[var(--text)] shadow-md hover:shadow-lg transition-all duration-300"
          onClick={() => setIsOpen(true)}
        >
          <FiEdit2 className={`${textColor} text-xl`} />
        </motion.button>
      </DrawerTrigger>

      <DrawerContent className="bg-white border-t border-[var(--border)]">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold text-[var(--text)]">
              Edit "{collectionName}" Collection
            </DrawerTitle>
            <p className="text-sm text-[var(--text)] opacity-70">
              Update collection details or remove books
            </p>
          </DrawerHeader>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--text)]">
                  Collection Name
                </Label>
                <Input
                  id="name"
                  name="collection_name"
                  value={editedCollectionName}
                  onChange={(e) => setEditedCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                  className="bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[var(--text)]">
                  Description
                </Label>
                <textarea
                  id="description"
                  name="collection_description"
                  value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                  rows="4"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 text-[var(--text)]"
                  placeholder="Write a description for your collection..."
                ></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-lg text-[var(--text)]">
                Books in Collection ({books.length})
              </h3>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                {books.length === 0 ? (
                  <p className="text-[var(--text)] opacity-70 italic">
                    No books in this collection
                  </p>
                ) : (
                  books.map((book, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-14 overflow-hidden rounded">
                          {book.thumbnail && (
                            <img
                              src={
                                book.thumbnail.startsWith("public")
                                  ? `https://bibliopodv2-production.up.railway.app/${book.thumbnail.replace(
                                      "public",
                                      "storage"
                                    )}`
                                  : book.thumbnail
                              }
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text)] truncate">
                            {book.title}
                          </p>
                          <p className="text-xs text-[var(--text)] opacity-70 truncate">
                            {book.author}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => removeBook(book.isbn)}
                        className="p-1.5 rounded-full text-[var(--text)] hover:bg-red-100 hover:text-red-600 transition-colors"
                        aria-label="Remove book"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-[var(--border)] pt-4">
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-[var(--border)] text-[var(--text)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[var(--primary-color)] text-white hover:bg-[var(--secondary-color)]"
              >
                Save Changes
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
