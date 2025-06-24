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

  console.log("[EpubReaderCustom] bookValue from URL:", bookValue);

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
  const [savedProgressData, setSavedProgressData] = useState(null);
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
  } = useCustomScrollManager(
    componentMounted && progressFetched ? book : null,
    rendition,
    {
      preloadCount: 1, // Load one section ahead/behind like epubjs
      sectionGap: 0, // No gaps between sections
      smoothScrolling: true,
      viewerRef: viewerRef, // Pass the ref to the hook
      savedProgress: savedProgressData, // Pass saved progress to the hook
    }
  );

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

  // Fetch reading progress first, before loading the book
  useEffect(() => {
    const fetchReadingProgress = async () => {
      if (!bookValue) {
        console.log("[PROGRESS] No bookValue, skipping progress fetch");
        setProgressFetched(true);
        return;
      }

      try {
        setLoadingMessage("Loading reading progress...");
        console.log("[PROGRESS] Fetching progress for bookValue:", bookValue);

        const savedProgress = await loadReadingProgress(bookValue);
        console.log("[PROGRESS] Loaded progress from storage:", savedProgress);

        if (savedProgress && savedProgress.location) {
          console.log("[PROGRESS] Valid progress found, storing for later use");
          setSavedProgressData(savedProgress);
          setLoadingMessage("Reading progress loaded");
        } else {
          console.log(
            "[PROGRESS] No valid progress found, starting from beginning"
          );
          setSavedProgressData(null);
          setLoadingMessage("Starting from beginning");
        }
      } catch (error) {
        console.error("[PROGRESS] Error loading saved progress:", error);
        setSavedProgressData(null);
        setLoadingMessage("Starting from beginning");
      } finally {
        setProgressFetched(true);
      }
    };

    if (bookValue) {
      fetchReadingProgress();
    } else {
      setProgressFetched(true);
    }
  }, [bookValue]);

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
    console.log(
      "[PROGRESS] Effect triggered - readingProgress:",
      readingProgress
    );
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

        console.log("[PROGRESS] Saving progress:", progressData);
        // Save progress using the helper function
        saveReadingProgress(bookValue, progressData).catch((error) => {
          console.error("[PROGRESS] Error saving progress:", error);
        });
      } else {
        console.log("[PROGRESS] Not saving - missing data:", {
          book: !!book,
          currentLocation: !!currentLocation,
          readingProgress,
          bookValue,
          currentChapter,
        });
      }
    } else {
      console.log("[PROGRESS] readingProgress is undefined, not saving");
    }
  }, [readingProgress, book, currentLocation, currentChapter, bookValue]);

  // Update current chapter helper - improved for custom scroll manager
  const updateCurrentChapter = useCallback((location, book) => {
    if (!location || !book) return;

    try {
      console.log("[CHAPTER] Updating chapter for location:", location);

      // Get the navigation/TOC
      console.log("[CHAPTER] Starting navigation load...");
      book.loaded.navigation
        .then((nav) => {
          console.log("[CHAPTER] Navigation loaded successfully");
          console.log("[CHAPTER] Raw navigation:", nav);

          let toc = [];
          try {
            // Handle different navigation formats
            if (Array.isArray(nav)) {
              toc = flatten(nav);
            } else if (nav && nav.toc && Array.isArray(nav.toc)) {
              toc = flatten(nav.toc);
            } else if (nav && Array.isArray(nav.chapters)) {
              toc = flatten(nav.chapters);
            } else if (nav && nav.navigation && Array.isArray(nav.navigation)) {
              toc = flatten(nav.navigation);
            } else {
              console.warn("[CHAPTER] Unexpected navigation format:", nav);
              toc = [];
            }
          } catch (flattenError) {
            console.error(
              "[CHAPTER] Error flattening navigation:",
              flattenError
            );
            toc = [];
          }

          console.log(
            "[CHAPTER] TOC items:",
            toc.map((item) => ({ label: item.label, href: item.href }))
          );

          if (!toc.length) {
            console.log("[CHAPTER] No TOC available");
            setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
            return;
          }

          // Get the current href from location
          const currentHref = location.href || location.start?.href;
          console.log("[CHAPTER] Current href:", currentHref);

          if (!currentHref) {
            // If no href, try to find chapter by index
            const chapterIndex = Math.min(location.index || 0, toc.length - 1);
            const chapter = toc[chapterIndex];
            if (chapter) {
              console.log("[CHAPTER] Found chapter by index:", chapter);
              setCurrentChapter(
                chapter.label?.trim() || `Chapter ${chapterIndex + 1}`
              );
            } else {
              setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
            }
            return;
          }

          // Method 1: Try exact href match
          let currentChapterItem = toc.find(
            (item) => item.href === currentHref
          );
          console.log(
            "[CHAPTER] Method 1 - Exact match result:",
            currentChapterItem
          );

          if (!currentChapterItem) {
            // Method 2: Try base href match (without fragment)
            const baseHref = currentHref.split("#")[0];
            currentChapterItem = toc.find((item) => {
              const itemBaseHref = item.href?.split("#")[0];
              return itemBaseHref === baseHref;
            });
            console.log(
              "[CHAPTER] Method 2 - Base href match result:",
              currentChapterItem
            );
          }

          if (!currentChapterItem) {
            // Method 3: Try partial href matching
            currentChapterItem = toc.find((item) => {
              if (!item.href) return false;
              return (
                currentHref.includes(item.href) ||
                item.href.includes(currentHref)
              );
            });
            console.log(
              "[CHAPTER] Method 3 - Partial match result:",
              currentChapterItem
            );
          }

          if (!currentChapterItem) {
            // Method 4: Find the best match by section index
            // Find the TOC item that corresponds to the current section
            const spine = book.spine;
            const currentSpineItem = spine.get(location.index);
            console.log(
              "[CHAPTER] Method 4 - Current spine item:",
              currentSpineItem
            );

            if (currentSpineItem) {
              // Look for TOC items that match this spine item
              currentChapterItem = toc.find((item) => {
                const itemBaseHref = item.href?.split("#")[0];
                const spineBaseHref = currentSpineItem.href?.split("#")[0];
                return itemBaseHref === spineBaseHref;
              });
              console.log(
                "[CHAPTER] Method 4 - Spine match result:",
                currentChapterItem
              );
            }
          }

          if (!currentChapterItem) {
            // Method 5: Use the closest chapter by index
            // Find the chapter that comes before or at the current section
            let bestMatch = null;
            let bestIndex = -1;

            for (let i = 0; i < toc.length; i++) {
              const tocItem = toc[i];
              if (tocItem.href) {
                // Try to find the spine index for this TOC item
                const spine = book.spine;
                const spineItem = spine.get(tocItem.href);
                if (spineItem && spineItem.index <= location.index) {
                  if (spineItem.index > bestIndex) {
                    bestMatch = tocItem;
                    bestIndex = spineItem.index;
                  }
                }
              }
            }

            if (bestMatch) {
              currentChapterItem = bestMatch;
              console.log(
                "[CHAPTER] Found best match by spine index:",
                currentChapterItem
              );
            }
          }

          if (currentChapterItem) {
            console.log("[CHAPTER] Found chapter item:", currentChapterItem);
            const chapterLabel =
              currentChapterItem.label?.trim() || "Untitled Chapter";
            console.log("[CHAPTER] Setting chapter to:", chapterLabel);
            setCurrentChapter(chapterLabel);
          } else {
            console.log("[CHAPTER] No matching chapter found, using fallback");
            // Fallback to a reasonable chapter name
            const chapterIndex = Math.min(location.index || 0, toc.length - 1);
            const fallbackChapter = toc[chapterIndex];
            if (fallbackChapter) {
              const fallbackLabel =
                fallbackChapter.label?.trim() || `Chapter ${chapterIndex + 1}`;
              console.log(
                "[CHAPTER] Setting fallback chapter to:",
                fallbackLabel
              );
              setCurrentChapter(fallbackLabel);
            } else {
              const defaultLabel = `Chapter ${(location.index || 0) + 1}`;
              console.log(
                "[CHAPTER] Setting default chapter to:",
                defaultLabel
              );
              setCurrentChapter(defaultLabel);
            }
          }
        })
        .catch((error) => {
          console.error("[CHAPTER] Error loading navigation:", error);
          console.log(
            "[CHAPTER] Setting fallback chapter due to navigation error"
          );
          setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
        });
    } catch (error) {
      console.error("[CHAPTER] Error updating current chapter:", error);
      setCurrentChapter(`Chapter ${(location.index || 0) + 1}`);
    }
  }, []);

  // Update current chapter when location changes
  useEffect(() => {
    if (currentLocation && book) {
      console.log("[CHAPTER_UPDATE] Location changed, updating chapter:", {
        index: currentLocation.index,
        href: currentLocation.href,
        percentage: currentLocation.percentage,
        currentChapter: currentChapter,
      });
      updateCurrentChapter(currentLocation, book);
    }
  }, [currentLocation, book, updateCurrentChapter]);

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

  // Progress restoration is now handled automatically in the scroll manager initialization

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

  // Load book - wait for progress to be fetched first
  useEffect(() => {
    console.log("[BOOK_LOAD] Load book effect triggered", {
      bookValue: !!bookValue,
      preferencesLoaded,
      progressFetched,
    });

    if (!bookValue || !preferencesLoaded || !progressFetched) {
      console.log("[BOOK_LOAD] Skipping book load - missing requirements");
      return;
    }

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

        // Progress loading is now handled separately before book loading

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
  }, [bookValue, preferencesLoaded, progressFetched]);

  // Wait for scroll manager to be initialized before hiding loading
  useEffect(() => {
    if (book && scrollManagerInitialized) {
      console.log("[BOOK_LOAD] Scroll manager initialized, hiding loading");
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [book, scrollManagerInitialized]);

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
