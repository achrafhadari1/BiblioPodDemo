"use client";

import { useEffect, useState, useRef } from "react";
import { ReaderMenu } from "./ReaderMenu";
import { toast } from "sonner";
import { Bookmark, X } from "lucide-react";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { cn } from "../lib/utils";

const HIGHLIGHT_COLORS = [
  {
    name: "Lime",
    value: "#84cc16",
    bg: "bg-lime-500",
    hover: "hover:bg-lime-600",
  },
  {
    name: "Green",
    value: "#15803d",
    bg: "bg-green-700",
    hover: "hover:bg-green-800",
  },
  {
    name: "Sky",
    value: "#0369a1",
    bg: "bg-sky-700",
    hover: "hover:bg-sky-800",
  },
  {
    name: "Purple",
    value: "#7e22ce",
    bg: "bg-purple-700",
    hover: "hover:bg-purple-800",
  },
  {
    name: "Pink",
    value: "#be185d",
    bg: "bg-pink-700",
    hover: "hover:bg-pink-800",
  },
  {
    name: "Yellow",
    value: "#ca8a04",
    bg: "bg-yellow-600",
    hover: "hover:bg-yellow-700",
  },
];

const TextSelectionCoordinates = ({
  rendition,
  annotations,
  updatePageInfo,
  saveReadingProgress,
  book,
  bookValue,
  setForceUpdate,
}) => {
  // Split state into separate concerns
  const [selectedTextCoords, setSelectedTextCoords] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [lastCfiRange, setLastCfiRange] = useState(null);
  const [isColorBoxOpen, setIsColorBoxOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorBoxRef = useRef(null);

  // Handle clicks outside the color picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorBoxRef.current && !colorBoxRef.current.contains(event.target)) {
        setIsColorBoxOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle text selection
  useEffect(() => {
    const handleTextSelection = (cfiRange) => {
      if (!rendition) return;

      const range = rendition.getRange(cfiRange);

      if (range) {
        // Get the iframe element that contains the book content
        const iframe = document.querySelector("#viewer iframe");
        if (!iframe) return;

        // Get the bounding client rect of the selected text within the iframe
        const rect = range.getBoundingClientRect();

        // Get the iframe's position
        const iframeRect = iframe.getBoundingClientRect();

        // Calculate absolute position by adding iframe position to the selection position
        const absoluteX = rect.x + iframeRect.left;
        const absoluteY = rect.y + iframeRect.top;

        // Calculate position for the color picker to appear above the text
        // Adjust the Y position to be above the selection
        const x = absoluteX + 50;
        const y = absoluteY - 120; // Position above the text

        setSelectedTextCoords({ x, y });
        setSelectedText(range.toString());
        setLastCfiRange(cfiRange);
        setIsColorBoxOpen(true);
      } else {
        setLastCfiRange(null);
        setSelectedTextCoords({ x: 0, y: 0 });
        setIsColorBoxOpen(false);
      }
    };

    // Handle clicks inside the iframe content
    const handleIframeClick = () => {
      if (isColorBoxOpen) {
        setLastCfiRange(null);
        setSelectedTextCoords({ x: 0, y: 0 });
        setIsColorBoxOpen(false);
      }
    };

    if (rendition) {
      rendition.on("selected", handleTextSelection);

      // Add click listener to iframe content when it's ready
      rendition.on("rendered", () => {
        try {
          const contents = rendition.getContents();
          if (contents && contents.document) {
            contents.document.addEventListener("click", handleIframeClick);
          }
        } catch (error) {
          // Silently handle iframe access errors
        }
      });
    }

    return () => {
      if (rendition) {
        rendition.off("selected", handleTextSelection);

        // Remove click listener from iframe content
        try {
          const contents = rendition.getContents();
          if (contents && contents.document) {
            contents.document.removeEventListener("click", handleIframeClick);
          }
        } catch (error) {
          // Silently handle iframe access errors
        }
      }
    };
  }, [rendition, isColorBoxOpen]);

  const handleColorSelection = async (color) => {
    if (!lastCfiRange || !rendition) return;

    setIsSubmitting(true);

    try {
      // Apply highlight locally
      rendition.annotations.highlight(
        lastCfiRange,
        {},
        (e) => console.log("Highlight applied:", e),
        undefined,
        {
          fill: color,
        }
      );

      // Update state
      setSelectedColor(color);
      setIsColorBoxOpen(false);

      // Save to IndexedDB
      const annotation = {
        book_isbn: bookValue,
        text: selectedText,
        color: color,
        cfi_range: lastCfiRange,
        created_at: new Date().toISOString(),
        id: `annotation-${Date.now()}`,
      };

      await bookStorageDB.addAnnotation(bookValue, annotation);

      toast.success("Highlight saved successfully");
      console.log("Annotation stored:", annotation);
    } catch (error) {
      console.error("Error storing annotation:", error);
      toast.error(error.message || "Failed to save highlight");
    } finally {
      setIsSubmitting(false);
      // Reset selection state
      setSelectedText("");
      setLastCfiRange(null);
    }
  };

  const closeColorPicker = () => {
    setIsColorBoxOpen(false);
  };

  return (
    <>
      <ReaderMenu
        book={book}
        bookValue={bookValue}
        saveReadingProgress={saveReadingProgress}
        rendition={rendition}
        selectedColor={selectedColor}
        className="icon-bookmark-empty"
      />

      {isColorBoxOpen && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          <div
            ref={colorBoxRef}
            className="absolute z-30 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto"
            style={{
              left: `${selectedTextCoords.x}px`,
              top: `${selectedTextCoords.y}px`,
              transform: "translateX(-50%)", // Center horizontally
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-3 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={closeColorPicker}
                className="absolute -top-2 -right-2 rounded-full bg-gray-100 dark:bg-gray-700 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Close color picker"
              >
                <X size={14} />
              </button>

              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                {selectedText}
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform duration-200",
                      color.bg,
                      color.hover,
                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    )}
                    onClick={() => handleColorSelection(color.value)}
                    disabled={isSubmitting}
                    aria-label={`Highlight with ${color.name}`}
                    title={color.name}
                  />
                ))}
              </div>

              <div className="mt-2 flex justify-center">
                <button
                  className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => {
                    // Add bookmark functionality here
                    toast.info("Bookmark feature coming soon");
                  }}
                >
                  <Bookmark size={14} />
                  <span>Bookmark</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TextSelectionCoordinates;
