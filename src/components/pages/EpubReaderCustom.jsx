"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import "../style/bookdisplay.css";

import ePub from "epubjs";
import axios from "../../api/axios";
import "../../index.css";
import "../../styles/fonts.css";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { AiOutlineFullscreen } from "react-icons/ai";
import { GrNext, GrPrevious } from "react-icons/gr";
import { FiMoon } from "react-icons/fi";
import { BarChart3 } from "lucide-react";
import { CircularProgress, Button } from "@nextui-org/react";

import TextSelectionCoordinates from "../Modals/TextSelectionCoordinates";
import { ReaderMenu } from "../Modals/ReaderMenu";
import { flatten } from "../Modals/getChapters";
import { EpubReaderSettings } from "../EpubReaderComponents/EpubReaderSettings";
import ReadingProgress from "../EpubReaderComponents/ReadingProgress";
import {
  userPreferencesDB,
  saveReadingProgress,
  loadReadingProgress,
} from "../../utils/userPreferences";
import { useCustomScrollManager } from "../EpubReaderComponents/CustomScrollManager";

// Utility function to detect mobile devices
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
};

// Default reader settings
const DEFAULT_SETTINGS = {
  fontSize: 0.7,
  fontFamily: "Lora",
  isDarkTheme: false,
  readingMode: "scrolled", // Always use scrolled mode with custom manager
};

function EpubReaderCustom() {
  // URL parameters
  const searchParams = useSearchParams();
  const bookValue = searchParams.get("book");

  // State variables
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SETTINGS.fontSize);
  const [fontFamily, setFontFamily] = useState(DEFAULT_SETTINGS.fontFamily);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [componentMounted, setComponentMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showTitleBar, setShowTitleBar] = useState(true);
  const [currentChapter, setCurrentChapter] = useState("");
  const [progressFetched, setProgressFetched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);
  const [mobileHoverMode, setMobileHoverMode] = useState(false);

  // Touch/swipe state - using refs to avoid race conditions
  const touchStartRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchEndRef = useRef(null);
  const isSwipingRef = useRef(false);
  const lastSwipeTimeRef = useRef(0);

  // Double-tap hover state
  const lastTapTimeRef = useRef(0);
  const tapCountRef = useRef(0);
  const hoverTimeoutRef = useRef(null);

  // Minimum swipe distance (in px) and debounce time
  const minSwipeDistance = 50;
  const swipeDebounceTime = 150;

  // Refs
  const titleBarTimerRef = useRef(null);
  const viewerRef = useRef(null);

  // Custom scroll manager - only initialize when component is mounted
  const {
    manager: scrollManager,
    currentLocation,
    readingProgress,
    isInitialized: scrollManagerInitialized,
    navigateToSection,
    navigateToHref,
    next: scrollNext,
    prev: scrollPrev,
    applyTheme,
    applyFontSettings,
    setSavedProgress,
    restoreProgress,
    initializeWithPreferences,
  } = useCustomScrollManager(componentMounted ? book : null, rendition, {
    preloadCount: 1, // Load one section ahead/behind like epubjs
    sectionGap: 0, // No gaps between sections
    smoothScrolling: true,
    viewerRef: viewerRef, // Pass the ref to the hook
  });

  // Component mounted effect
  useEffect(() => {
    console.log("[EpubReaderCustom] Component mounting...");
    setComponentMounted(true);

    // Debug: Check if viewer element exists
    setTimeout(() => {
      const viewer = document.getElementById("viewer");
      const viewerRefElement = viewerRef.current;
      console.log(
        "[EpubReaderCustom] Viewer element check - ID:",
        !!viewer,
        "Ref:",
        !!viewerRefElement
      );
    }, 100);

    return () => setComponentMounted(false);
  }, []);

  // Detect mobile device on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Update reading progress when custom scroll manager reports changes
  useEffect(() => {
    if (readingProgress !== undefined) {
      setCurrentPercentage(Math.round(readingProgress * 100));

      // Save progress to database
      if (book && currentLocation) {
        const progressData = {
          percentage: readingProgress,
          location: currentLocation,
          chapter: currentChapter,
          scrollPosition:
            window.pageYOffset || document.documentElement.scrollTop,
        };

        // Save progress using the helper function
        saveReadingProgress(bookValue, progressData).catch((error) => {
          console.error("[PROGRESS] Error saving progress:", error);
        });
      }
    }
  }, [readingProgress, book, currentLocation, currentChapter, bookValue]);

  // Update current chapter when location changes
  useEffect(() => {
    if (currentLocation && book) {
      updateCurrentChapter(currentLocation, book);
    }
  }, [currentLocation, book]);

  // Apply font settings when they change
  useEffect(() => {
    if (applyFontSettings && (fontSize || fontFamily)) {
      console.log("[EpubReaderCustom] Applying font settings:", {
        fontSize,
        fontFamily,
      });
      applyFontSettings(fontSize, fontFamily);
    }
  }, [fontSize, fontFamily, applyFontSettings]);

  // Apply theme when it changes
  useEffect(() => {
    if (applyTheme) {
      console.log("[EpubReaderCustom] Applying theme:", { isDarkTheme });
      applyTheme(isDarkTheme);
    }
  }, [isDarkTheme, applyTheme]);

  // Initialize scroll manager with preferences when both are ready
  useEffect(() => {
    if (
      scrollManagerInitialized &&
      preferencesLoaded &&
      initializeWithPreferences
    ) {
      console.log(
        "[EpubReaderCustom] Initializing scroll manager with preferences..."
      );
      initializeWithPreferences({
        fontSize,
        fontFamily,
        isDarkTheme,
      });
    }
  }, [
    scrollManagerInitialized,
    preferencesLoaded,
    initializeWithPreferences,
    fontSize,
    fontFamily,
    isDarkTheme,
  ]);

  // Restore progress when scroll manager is initialized
  useEffect(() => {
    if (scrollManagerInitialized && restoreProgress) {
      console.log(
        "[EpubReaderCustom] Scroll manager initialized, restoring progress..."
      );
      restoreProgress();
    }
  }, [scrollManagerInitialized, restoreProgress]);

  // Helper function to reset swipe state
  const resetSwipeState = useCallback(() => {
    isSwipingRef.current = false;
    touchStartRef.current = null;
    touchStartYRef.current = null;
    touchEndRef.current = null;
  }, []);

  // Navigation functions using custom scroll manager
  const nextBtn = useCallback(() => {
    if (scrollManager) {
      scrollNext();
    }
  }, [scrollManager, scrollNext]);

  const backBtn = useCallback(() => {
    if (scrollManager) {
      scrollPrev();
    }
  }, [scrollManager, scrollPrev]);

  // Double-tap detection for mobile hover
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap < 300) {
      tapCountRef.current += 1;
      if (tapCountRef.current === 2) {
        console.log("[MOBILE_HOVER] Double-tap detected, enabling hover mode");
        setMobileHoverMode(true);

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
          console.log("[MOBILE_HOVER] Auto-disabling hover mode");
          setMobileHoverMode(false);
        }, 3000);

        tapCountRef.current = 0;
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    } else {
      tapCountRef.current = 1;
    }

    lastTapTimeRef.current = now;
    return false;
  }, []);

  // Touch/swipe handlers
  const onTouchStart = useCallback(
    (e) => {
      if (handleDoubleTap(e)) {
        return;
      }

      if (isSwipingRef.current) {
        e.preventDefault();
        return;
      }

      const startX = e.targetTouches[0].clientX;
      const startY = e.targetTouches[0].clientY;
      touchStartRef.current = startX;
      touchStartYRef.current = startY;
      touchEndRef.current = null;
      isSwipingRef.current = true;
    },
    [handleDoubleTap]
  );

  const onTouchMove = useCallback((e) => {
    if (!touchStartRef.current || !isSwipingRef.current) return;

    const currentX = e.targetTouches[0].clientX;
    touchEndRef.current = currentX;

    // Allow vertical scrolling but prevent horizontal swipes
    const distance = Math.abs(currentX - touchStartRef.current);
    if (distance > 10) {
      const currentY = e.targetTouches[0].clientY;
      const startY = touchStartYRef.current;
      const verticalDistance = startY ? Math.abs(currentY - startY) : 0;

      // Only prevent if it's clearly a horizontal swipe
      if (distance > verticalDistance) {
        e.preventDefault();
      }
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      const cleanup = () => {
        isSwipingRef.current = false;
        touchStartRef.current = null;
        touchStartYRef.current = null;
        touchEndRef.current = null;
      };

      const now = Date.now();
      if (now - lastSwipeTimeRef.current < swipeDebounceTime) {
        cleanup();
        return;
      }

      if (!touchStartRef.current || !isSwipingRef.current) {
        cleanup();
        return;
      }

      let endX = touchEndRef.current;
      if (!endX && e.changedTouches && e.changedTouches[0]) {
        endX = e.changedTouches[0].clientX;
      }

      if (mobileHoverMode && endX) {
        const distance = Math.abs(touchStartRef.current - endX);
        if (distance < minSwipeDistance) {
          setMobileHoverMode(false);
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          cleanup();
          return;
        }
      }

      if (!endX) {
        cleanup();
        return;
      }

      const distance = touchStartRef.current - endX;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if ((isLeftSwipe || isRightSwipe) && scrollManager) {
        lastSwipeTimeRef.current = now;

        if (isLeftSwipe) {
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          nextBtn();
        } else if (isRightSwipe) {
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          backBtn();
        }
      }

      cleanup();
    },
    [
      minSwipeDistance,
      scrollManager,
      nextBtn,
      backBtn,
      swipeDebounceTime,
      mobileHoverMode,
    ]
  );

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Initialize user preferences database
        await userPreferencesDB.init();

        // Load individual preferences
        const theme = await userPreferencesDB.getTheme();
        const savedFontSize = await userPreferencesDB.getFontSize();
        const savedFontFamily = await userPreferencesDB.getFontFamily();

        console.log("[PREFERENCES] Loaded preferences:", {
          theme,
          savedFontSize,
          savedFontFamily,
        });

        setIsDarkTheme(theme === "dark");
        setFontSize(savedFontSize || DEFAULT_SETTINGS.fontSize);
        setFontFamily(savedFontFamily || DEFAULT_SETTINGS.fontFamily);
      } catch (error) {
        console.error("[PREFERENCES] Error loading preferences:", error);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Apply theme changes to custom scroll manager
  useEffect(() => {
    if (scrollManager) {
      applyTheme(isDarkTheme);
    }
  }, [isDarkTheme, scrollManager, applyTheme]);

  // Apply font changes to custom scroll manager
  useEffect(() => {
    if (scrollManager) {
      applyFontSettings(fontSize, fontFamily);
    }
  }, [fontSize, fontFamily, scrollManager, applyFontSettings]);

  // Load book
  useEffect(() => {
    if (!bookValue || !preferencesLoaded) return;

    const loadBook = async () => {
      try {
        setLoading(true);
        setLoadingMessage("Loading book...");

        console.log("[BOOK_LOAD] Starting to load book:", bookValue);

        // Get book metadata from storage
        const bookInfo = await bookStorageDB.getBook(bookValue);
        if (!bookInfo) {
          throw new Error("Book not found in storage");
        }

        console.log("[BOOK_LOAD] Book metadata found:", bookInfo);
        setBookData(bookInfo);

        // Get the actual file data
        setLoadingMessage("Fetching book file...");
        const fileData = await bookStorageDB.getBookFile(bookInfo.isbn);
        if (!fileData) {
          throw new Error("Book file not found in storage");
        }

        console.log("[BOOK_LOAD] File data found:", !!fileData);
        console.log("[BOOK_LOAD] File data type:", typeof fileData);
        console.log("[BOOK_LOAD] File data size:", fileData?.size);

        setLoadingMessage("Parsing book content...");

        // Create book instance and load from file data
        const loadedBook = ePub();

        // Convert File object to ArrayBuffer if needed
        let bookContent;
        if (fileData instanceof File || fileData instanceof Blob) {
          bookContent = await fileData.arrayBuffer();
        } else {
          bookContent = fileData;
        }

        await loadedBook.open(bookContent);

        console.log("[BOOK_LOAD] Book loaded successfully");
        setBook(loadedBook);

        // Load saved reading progress
        try {
          const savedProgress = await loadReadingProgress(bookValue);
          if (savedProgress && savedProgress.location) {
            console.log("[PROGRESS] Restoring saved progress:", savedProgress);
            // Set the saved progress in the scroll manager
            if (setSavedProgress) {
              setSavedProgress(savedProgress);
            }
          }
        } catch (error) {
          console.error("[PROGRESS] Error loading saved progress:", error);
        }

        // Don't check for viewer element here - let the custom scroll manager handle it

        // Create a temporary container for the dummy rendition
        const tempContainer = document.createElement("div");
        tempContainer.style.display = "none";
        document.body.appendChild(tempContainer);

        // Create a dummy rendition for compatibility (render to hidden container)
        const dummyRendition = loadedBook.renderTo(tempContainer, {
          width: "100%",
          height: "100%",
          flow: "scrolled",
          manager: "continuous",
        });

        setRendition(dummyRendition);
        setLoadingMessage("Setting up custom scroll manager...");

        // The custom scroll manager will take over from here
        console.log("[BOOK_LOAD] Setup complete");
      } catch (error) {
        console.error("[BOOK_LOAD] Error loading book:", error);
        setLoadingMessage("Error loading book: " + error.message);
      }
    };

    loadBook();
  }, [bookValue, preferencesLoaded]);

  // Wait for scroll manager to be initialized before hiding loading
  useEffect(() => {
    if (book && scrollManagerInitialized) {
      console.log("[BOOK_LOAD] Scroll manager initialized, hiding loading");
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [book, scrollManagerInitialized]);

  // Update current chapter helper
  const updateCurrentChapter = useCallback((location, book) => {
    if (!location || !book) return;

    try {
      console.log("[CHAPTER] Updating chapter for location:", location);

      const spine = book.spine;

      // Try multiple ways to get the current spine item
      let currentItem = null;

      // Method 1: Try by href
      if (location.href) {
        currentItem = spine.get(location.href);
      }

      // Method 2: Try by index
      if (!currentItem && typeof location.index === "number") {
        currentItem = spine.get(location.index);
      }

      // Method 3: Try by id
      if (!currentItem && location.id) {
        currentItem = spine.get(location.id);
      }

      console.log("[CHAPTER] Found spine item:", currentItem);

      if (currentItem) {
        // Try to get chapter title from navigation
        book.loaded.navigation
          .then((nav) => {
            const toc = flatten(nav);
            console.log(
              "[CHAPTER] TOC items:",
              toc.map((item) => ({ label: item.label, href: item.href }))
            );

            // Try to match by various href formats
            const currentChapterItem = toc.find((item) => {
              const itemHref = item.href.split("#")[0]; // Remove fragment
              const locationHref = (location.href || "").split("#")[0]; // Remove fragment
              const currentItemHref = (currentItem.href || "").split("#")[0]; // Remove fragment

              return (
                itemHref === locationHref ||
                itemHref === currentItemHref ||
                item.href === location.href ||
                item.href === currentItem.href
              );
            });

            console.log("[CHAPTER] Found chapter item:", currentChapterItem);

            if (currentChapterItem) {
              setCurrentChapter(currentChapterItem.label);
            } else {
              // Fallback to spine item title (without adding "Chapter X" prefix if title exists)
              const chapterTitle =
                currentItem.title || `Chapter ${(location.index || 0) + 1}`;
              console.log("[CHAPTER] Using fallback title:", chapterTitle);
              setCurrentChapter(chapterTitle);
            }
          })
          .catch((error) => {
            console.error("[CHAPTER] Error loading navigation:", error);
            // Use spine item title directly without prefix
            const chapterTitle =
              currentItem.title || `Chapter ${(location.index || 0) + 1}`;
            setCurrentChapter(chapterTitle);
          });
      } else {
        console.warn("[CHAPTER] No spine item found for location:", location);
        // Last resort fallback - only use generic name if no title available
        setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
      }
    } catch (error) {
      console.error("[CHAPTER] Error updating current chapter:", error);
      setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
    }
  }, []);

  // Handle chapter navigation from menu
  const handleChapterNavigation = useCallback(
    (href) => {
      if (scrollManager) {
        navigateToHref(href);
      }
    },
    [scrollManager, navigateToHref]
  );

  // Title bar auto-hide
  useEffect(() => {
    const resetTitleBarTimer = () => {
      if (titleBarTimerRef.current) {
        clearTimeout(titleBarTimerRef.current);
      }

      setShowTitleBar(true);

      titleBarTimerRef.current = setTimeout(() => {
        if (!mobileHoverMode) {
          setShowTitleBar(false);
        }
      }, 3000);
    };

    resetTitleBarTimer();

    const handleUserActivity = () => {
      resetTitleBarTimer();
    };

    document.addEventListener("mousemove", handleUserActivity);
    document.addEventListener("touchstart", handleUserActivity);
    document.addEventListener("scroll", handleUserActivity);

    return () => {
      document.removeEventListener("mousemove", handleUserActivity);
      document.removeEventListener("touchstart", handleUserActivity);
      document.removeEventListener("scroll", handleUserActivity);
      if (titleBarTimerRef.current) {
        clearTimeout(titleBarTimerRef.current);
      }
    };
  }, [mobileHoverMode]);

  // Touch event listeners for mobile
  useEffect(() => {
    if (!book || !isMobile) return;

    const targetElement = document.getElementById("viewer") || document;

    targetElement.addEventListener("touchstart", onTouchStart, {
      passive: false,
      capture: true,
    });
    targetElement.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    targetElement.addEventListener("touchend", onTouchEnd, {
      passive: false,
      capture: true,
    });

    return () => {
      targetElement.removeEventListener("touchstart", onTouchStart);
      targetElement.removeEventListener("touchmove", onTouchMove);
      targetElement.removeEventListener("touchend", onTouchEnd);
    };
  }, [book, isMobile, onTouchStart, onTouchMove, onTouchEnd]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Loading screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <CircularProgress size="lg" />
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          {loadingMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={isDarkTheme ? "dark" : "default"}>
      {/* Title Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showTitleBar || mobileHoverMode
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 shadow-md px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">
              {bookData?.title || "Reading"}
            </h1>
            {currentChapter && (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {currentChapter}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPercentage}%
            </span>

            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkTheme(!isDarkTheme)}
            >
              <FiMoon className="w-4 h-4" />
            </Button>

            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
            >
              <AiOutlineFullscreen className="w-4 h-4" />
            </Button>

            <ReaderMenu
              book={book}
              rendition={rendition}
              onChapterSelect={handleChapterNavigation}
              currentChapter={currentChapter}
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {!isMobile && (
        <>
          <button
            onClick={backBtn}
            className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <GrPrevious className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={nextBtn}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <GrNext className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </>
      )}

      {/* Settings Panel */}
      <EpubReaderSettings
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        isDarkTheme={isDarkTheme}
        setIsDarkTheme={setIsDarkTheme}
        readingMode="scrolled" // Always scrolled mode
        setReadingMode={() => {}} // No-op since we only support scrolled mode
      />

      {/* Reading Progress */}
      {showReadingProgress && (
        <ReadingProgress
          currentPage={currentPage}
          totalPages={totalPages}
          currentPercentage={currentPercentage}
          onClose={() => setShowReadingProgress(false)}
        />
      )}

      {/* Main Viewer */}
      <div
        id="viewer"
        ref={viewerRef}
        className={`epub-viewer ${isFullscreen ? "h-lvh" : ""}`}
        style={{
          paddingTop: showTitleBar || mobileHoverMode ? "60px" : "0px",
          transition: "padding-top 0.3s ease",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {/* Placeholder content while loading */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CircularProgress size="lg" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {loadingMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Text Selection Coordinates */}
      <TextSelectionCoordinates />
    </div>
  );
}

export default EpubReaderCustom;
