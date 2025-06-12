import React, { useState, useEffect } from "react";
import { IoEyeOutline } from "react-icons/io5";
import { HiDotsHorizontal } from "react-icons/hi";
import { MdDeleteOutline } from "react-icons/md";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  Button,
} from "@nextui-org/react";
import { AddNoteIcon } from "./Modals/bookdisplay/AddNoteIcon";
import { CopyDocumentIcon } from "./Modals/bookdisplay/CopyDocumentIcon";
import { EditDocumentIcon } from "./Modals/bookdisplay/EditDocumentIcon";
import { RatingComponent } from "./RatingComponent";
import { AddBookToCollection } from "./Modals/bookdisplay/AddBookToCollection";
import { EditBookModal } from "./Modals/bookdisplay/EditBookModal";
import { useAuthContext } from "../context/AuthContext";
import { bookStorageDB } from "../utils/bookStorageDB";
import "./style/bookdisplay.css";

export const CollectionBookDisplay = ({
  title,
  author,
  img,
  identifier,
  bookDetails,
  rating: initialRating,
  progress,
  isSelectMode = false,
  isSelected = false,
  onSelect,
  onRemoveFromCollection,
}) => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rating, setRating] = useState(initialRating);
  const [currentImg, setCurrentImg] = useState(img);

  const iconClasses =
    "text-xl text-default-500 pointer-events-none flex-shrink-0";

  // Sync local image state with prop changes
  useEffect(() => {
    setCurrentImg(img);
  }, [img]);

  const goToRead = () => {
    if (!isSelectMode) {
      router.push(`/read?book=${identifier.toString()}`);
    }
  };

  const handleClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(identifier);
    }
  };

  const handleRemoveFromCollection = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveFromCollection(identifier);
  };

  // Function to update book data in IndexedDB and local state
  const updateBookData = async (updates) => {
    try {
      const book = await bookStorageDB.getBook(identifier);
      if (book) {
        const updatedBook = { ...book, ...updates };
        await bookStorageDB.updateBook(identifier, updatedBook);

        // Update local state to trigger re-render
        if (updates.thumbnail) {
          setCurrentImg(updates.thumbnail);
        }
      }
    } catch (error) {
      console.error("Error updating book data:", error);
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
        className={`bookContainer ${isSelectMode ? "cursor-pointer" : ""}`}
        onClick={handleClick}
      >
        {/* Selection indicator for select mode */}
        {isSelectMode && (
          <div
            className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center ${
              isSelected
                ? "bg-amber-500 text-white"
                : "bg-white/80 border border-gray-300"
            }`}
          >
            {isSelected && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
        )}

        <img
          className={`BookPoster ${isSelected ? "ring-4 ring-amber-500" : ""}`}
          src={currentImg}
          alt="Book Poster"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=687&auto=format&fit=crop";
          }}
        />

        {progress > 0 && <p className="bookProgress">{progress}%</p>}

        <p className="bookTitle" onClick={goToRead}>
          {title}
        </p>
        <p className="bookAuthor">{author}</p>

        {/* Only show hover controls when not in select mode */}
        {!isSelectMode && (
          <div className="hover-container">
            <div onClick={goToRead} className="hover-background"></div>
            <div className="inside-bookCover">
              <IoEyeOutline onClick={goToRead} className="icons-insideCover" />
              <MdDeleteOutline
                onClick={handleRemoveFromCollection}
                className="icons-insideCover"
              />
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="light"
                    className="icons-insideCover w-[1em] h-[1em] dumbass-button trigger-button capitalize"
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
                      startContent={
                        <CopyDocumentIcon className={iconClasses} />
                      }
                    >
                      <RatingComponent
                        bookId={identifier}
                        currentRating={rating}
                        onRatingChange={setRating}
                        userId={user?.id}
                      />
                    </DropdownItem>
                    <DropdownItem
                      key="edit"
                      description="Edit the metadata"
                      startContent={
                        <EditDocumentIcon className={iconClasses} />
                      }
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      Edit Book
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        )}
      </motion.div>

      {isEditModalOpen && (
        <EditBookModal
          isOpen={isEditModalOpen}
          identifier={identifier.toString()}
          userId={user?.id}
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
