"use client";

import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { Button } from "@nextui-org/react";

const BookmarkManager = ({
  bookValue,
  rendition,
  currentCFI,
  currentChapter,
  onNavigateToBookmark,
  showBookmarksList = false,
}) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [isCurrentPageBookmarked, setIsCurrentPageBookmarked] = useState(false);

  // Load bookmarks
  const loadBookmarks = async () => {
    try {
      const savedBookmarks = await bookStorageDB.getBookmarks(bookValue);
      setBookmarks(savedBookmarks || []);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
  };

  // Check if current page is bookmarked
  const checkCurrentPageBookmark = () => {
    if (!currentCFI || !bookmarks.length) {
      setIsCurrentPageBookmarked(false);
      return;
    }

    const isBookmarked = bookmarks.some(
      (bookmark) => bookmark.cfi === currentCFI
    );
    setIsCurrentPageBookmarked(isBookmarked);
  };

  useEffect(() => {
    loadBookmarks();
  }, [bookValue]);

  useEffect(() => {
    checkCurrentPageBookmark();
  }, [currentCFI, bookmarks]);

  // Add bookmark
  const addBookmark = async () => {
    if (!currentCFI || !rendition) return;

    try {
      const bookmark = {
        id: `bookmark-${Date.now()}`,
        bookIsbn: bookValue,
        cfi: currentCFI,
        chapter: currentChapter || "Unknown Chapter",
        pageNumber: rendition.book.locations
          ? rendition.book.locations.locationFromCfi(currentCFI)
          : null,
        percentage: rendition.book.locations
          ? Math.round(
              rendition.book.locations.percentageFromCfi(currentCFI) * 100
            )
          : null,
        createdAt: new Date().toISOString(),
        note: "",
      };

      await bookStorageDB.addBookmark(bookValue, bookmark);
      await loadBookmarks();
      toast.success("Bookmark added");
    } catch (error) {
      console.error("Error adding bookmark:", error);
      toast.error("Failed to add bookmark");
    }
  };

  // Remove bookmark
  const removeBookmark = async (bookmarkId) => {
    try {
      await bookStorageDB.deleteBookmark(bookValue, bookmarkId);
      await loadBookmarks();
      toast.success("Bookmark removed");
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast.error("Failed to remove bookmark");
    }
  };

  // Toggle current page bookmark
  const toggleCurrentPageBookmark = async () => {
    if (isCurrentPageBookmarked) {
      const currentBookmark = bookmarks.find((b) => b.cfi === currentCFI);
      if (currentBookmark) {
        await removeBookmark(currentBookmark.id);
      }
    } else {
      await addBookmark();
    }
  };

  // Navigate to bookmark
  const navigateToBookmark = async (bookmark) => {
    if (rendition && bookmark.cfi) {
      try {
        await rendition.display(bookmark.cfi);
        if (onNavigateToBookmark) {
          onNavigateToBookmark(bookmark);
        }
        toast.success(`Navigated to bookmark: ${bookmark.chapter}`);
      } catch (error) {
        console.error("Error navigating to bookmark:", error);
        toast.error("Failed to navigate to bookmark");
      }
    }
  };

  if (showBookmarksList) {
    return (
      <div className="space-y-3">
        {bookmarks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bookmark className="w-4 h-5 mx-auto mb-2 opacity-50 " />
            <p className="text-sm">No bookmarks yet</p>
            <p className="text-xs mt-1">
              Tap the bookmark icon to save your current page
            </p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-blue-600 flex-shrink-0" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {bookmark.chapter}
                    </h4>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {bookmark.percentage !== null && (
                      <div>Progress: {bookmark.percentage}%</div>
                    )}
                    <div>
                      Added: {new Date(bookmark.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="light"
                    className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => navigateToBookmark(bookmark)}
                  >
                    Go
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => removeBookmark(bookmark.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <Button
      isIconOnly
      variant="light"
      onClick={(e) => {
        console.log("[BOOKMARK] Button clicked!", {
          currentCFI,
          isCurrentPageBookmarked,
        });
        toggleCurrentPageBookmark(e);
      }}
      className={`transition-colors ${
        isCurrentPageBookmarked
          ? "text-yellow-600 hover:text-yellow-700"
          : "text-gray-400 hover:text-gray-600"
      }`}
      title={isCurrentPageBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {isCurrentPageBookmarked ? (
        <BookmarkCheck size={15} />
      ) : (
        <Bookmark size={15} className="text-black" />
      )}
    </Button>
  );
};

export default BookmarkManager;
