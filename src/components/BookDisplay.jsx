import React, { useState, useEffect, useReducer } from "react";
import { IoEyeOutline } from "react-icons/io5";
import { HiDotsHorizontal } from "react-icons/hi";
import { MdDeleteOutline } from "react-icons/md";
import axios from "../api/axios";
import { toast } from "sonner";
import { bookStorageDB } from "../utils/bookStorageDB";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  Button,
  cn,
} from "@nextui-org/react";
import { AddNoteIcon } from "./Modals/bookdisplay/AddNoteIcon";
import { CopyDocumentIcon } from "./Modals/bookdisplay/CopyDocumentIcon";
import { EditDocumentIcon } from "./Modals/bookdisplay/EditDocumentIcon";
import { DeleteDocumentIcon } from "./Modals/bookdisplay/DeleteDocumentIcon";
import { motion } from "framer-motion";
import "./style/bookdisplay.css";
import "../index.css";
import { EditBookModal } from "./Modals/bookdisplay/EditBookModal";
import { useRouter } from "next/navigation";
import { RatingComponent } from "./RatingComponent";
import { AddBookToCollection } from "./Modals/bookdisplay/AddBookToCollection";
import { useAuthContext } from "../context/AuthContext";

export const BookDisplay = ({
  title,
  userId,
  author,
  img,
  identifier,
  onDeleteBook,
  bookDetails,
  rating: initialRating,
  updateBookData,
  progress,
}) => {
  const router = useRouter();
  const goToRead = () => {
    router.push(`/read?book=${identifier.toString()}`);
  };
  // State to manage EditBookModal visibility

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // State to manage AddBookToCollection visibility

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [rating, setRating] = useState(initialRating); // Local state for rating
  const [currentProgress, setCurrentProgress] = useState(progress); // Local state for progress
  const iconClasses =
    "text-xl text-default-500 pointer-events-none flex-shrink-0";

  const { user } = useAuthContext();

  // Sync local progress state with prop changes
  useEffect(() => {
    setCurrentProgress(progress);
  }, [progress]);

  const deleteBook = async (identifier) => {
    try {
      // Delete from IndexedDB
      await bookStorageDB.deleteBook(identifier);

      // Emit event to inform parent component about book deletion
      onDeleteBook(identifier);

      toast("This book has been deleted", {
        description:
          "The selected book has been successfully removed from your library.",
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      toast("Error deleting book", {
        description: "There was an issue deleting the book. Please try again.",
      });
    }
  };
  const deleteProgress = async (isbn) => {
    try {
      // Update progress in IndexedDB
      await bookStorageDB.updateReadingProgress(isbn, 0);

      // Update local progress state immediately
      setCurrentProgress(0);

      // Update the book data in the parent component
      if (updateBookData) {
        updateBookData({ progress: 0 }, isbn);
      }

      // Clear book cache to ensure fresh data on next fetch
      const { clearBookCache } = await import("../utils/bookCache");
      clearBookCache();

      toast("Progress cleared successfully", {
        description: "Your reading progress has been reset for this book.",
      });

      console.log("Progress Deleted", response.data);
    } catch (error) {
      console.error(error);
      toast("Error clearing progress", {
        description:
          "There was an issue clearing your progress. Please try again.",
      });
    }
  };
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
        }}
        className="bookContainer"
      >
        <img className="BookPoster" src={img} alt="Book Poster" />

        {currentProgress > 0 && (
          <p className="bookProgress">{currentProgress}%</p>
        )}

        <p className="bookTitle" onClick={() => goToRead()}>
          {title}
        </p>
        <p className="bookAuthor">{author}</p>

        <div className="hover-container">
          <div onClick={() => goToRead()} className="hover-background"></div>
          <div className="inside-bookCover">
            <IoEyeOutline
              onClick={() => goToRead()}
              className="icons-insideCover"
            />
            <MdDeleteOutline
              onClick={() => deleteBook(identifier)}
              className="icons-insideCover"
            />
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="light"
                  className=" text-white w-[1em] h-[1em] icons-insideCover dumbass-button trigger-button capitalize"
                >
                  <HiDotsHorizontal />
                </Button>
              </DropdownTrigger>

              <DropdownMenu
                variant="faded"
                aria-label="Dropdown menu with description"
              >
                <DropdownSection title="Actions" showDivider>
                  <DropdownItem
                    key="add"
                    description="Add book to another collection"
                    startContent={<AddNoteIcon className={iconClasses} />}
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Add to Collection
                  </DropdownItem>
                  <DropdownItem
                    key="Rate"
                    description="Rate this Book"
                    startContent={<CopyDocumentIcon className={iconClasses} />}
                  >
                    <RatingComponent
                      bookId={identifier}
                      currentRating={rating}
                      onRatingChange={setRating}
                      userId={user.id} // Pass callback to update rating
                    />
                  </DropdownItem>
                  <DropdownItem
                    key="edit"
                    description="Edit the metadata"
                    startContent={<EditDocumentIcon className={iconClasses} />}
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit Book
                  </DropdownItem>
                </DropdownSection>

                {currentProgress > 0 && (
                  <DropdownSection title="Danger zone">
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      description="Permanently clear your reading progress"
                      onClick={() => {
                        deleteProgress(identifier.toString());
                      }}
                      startContent={
                        <DeleteDocumentIcon
                          className={cn(iconClasses, "text-danger")}
                        />
                      }
                    >
                      Clear Progress
                    </DropdownItem>
                  </DropdownSection>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </motion.div>
      {isEditModalOpen && (
        <EditBookModal
          isOpen={isEditModalOpen}
          identifier={identifier.toString()}
          userId={userId}
          closeModal={() => setIsEditModalOpen(false)}
          updateBookData={updateBookData}
        />
      )}
      {isAddModalOpen && (
        <AddBookToCollection
          bookName={title}
          identifier={identifier.toString()}
          closeModal={() => setIsAddModalOpen(false)}
        />
      )}
    </>
  );
};
