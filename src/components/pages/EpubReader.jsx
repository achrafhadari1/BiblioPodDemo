"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocation } from "react-router-dom";
import "../style/bookdisplay.css";

import ePub from "epubjs";
import axios from "../../api/axios";
import "../../index.css";
import "../../styles/fonts.css";
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
  loadReadingProgress,
  saveReadingProgress,
} from "../../utils/userPreferences";
import bookStorageDB from "../../utils/bookStorageDB";
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
  fontSize: 0.7, // This matches the default in userPreferencesDB
  fontFamily: "Lora",
  isDarkTheme: false,
  readingMode: "paginated", // "paginated" or "scrolled"
};

function EpubReader() {
  // URL parameters
  const searchParams = useSearchParams();
  const bookValue = searchParams.get("book");

  // State variables
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SETTINGS.fontSize);
  const [fontFamily, setFontFamily] = useState(DEFAULT_SETTINGS.fontFamily);
  const [readingMode, setReadingMode] = useState(DEFAULT_SETTINGS.readingMode);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [currentCFI, setCurrentCFI] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [forceUpdate, setForceUpdate] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showTitleBar, setShowTitleBar] = useState(true);
  const [isDarkClicked, setisDarkClicked] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");
  const [progressFetched, setProgressFetched] = useState(false);
  const [savedProgressData, setSavedProgressData] = useState(null);
  const [componentMounted, setComponentMounted] = useState(false);
  const [locationsGenerated, setLocationsGenerated] = useState(false);
  const [isInitialNavigation, setIsInitialNavigation] = useState(false);
  const [isBookLoading, setIsBookLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const [showReadingProgress, setShowReadingProgress] = useState(false);
  const [mobileHoverMode, setMobileHoverMode] = useState(false);
  const [isUpdatingReadingMode, setIsUpdatingReadingMode] = useState(false);
  const [isNavigatingToChapter, setIsNavigatingToChapter] = useState(false);
  const [initialFontLoadComplete, setInitialFontLoadComplete] = useState(false);

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
  const swipeDebounceTime = 150; // ms - reduced for better responsiveness

  // Refs
  const titleBarTimerRef = useRef(null);
  const viewerRef = useRef(null);
  const pageCalculationTimeoutRef = useRef(null);

  // Font application debouncing
  const fontApplicationTimeoutRef = useRef(null);
  const lastFontApplicationRef = useRef(0);
  const fontApplicationDebounceTime = 300; // ms

  // Custom scroll manager hook - only used when readingMode is "scrolled"
  const {
    manager: scrollManager,
    currentLocation: scrollCurrentLocation,
    readingProgress: scrollReadingProgress,
    isInitialized: scrollManagerInitialized,
    navigateToSection,
    navigateToHref,
    next: scrollNext,
    prev: scrollPrev,
    applyTheme: scrollApplyTheme,
    applyFontSettings: scrollApplyFontSettings,
    setSavedProgress,
    restoreProgress,
    initializeWithPreferences,
  } = useCustomScrollManager(
    componentMounted && progressFetched && readingMode === "scrolled" && book
      ? book
      : null,
    readingMode === "scrolled" ? rendition : null,
    {
      preloadCount: 1,
      sectionGap: 0,
      smoothScrolling: true,
      viewerRef: viewerRef,
      savedProgress: savedProgressData,
    }
  );

  // Component mounted effect
  useEffect(() => {
    console.log("[EpubReader] Component mounting...");
    setComponentMounted(true);
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

        // Use bookStorageDB instead of userPreferencesDB for consistency
        const progress = await bookStorageDB.getReadingProgress(bookValue);
        console.log("[PROGRESS] Loaded progress from bookStorageDB:", progress);

        if (progress && progress.current_cfi) {
          console.log("[PROGRESS] Valid progress found, storing for later use");
          // Convert bookStorageDB format to expected format
          const savedProgress = {
            location: {
              start: { cfi: progress.current_cfi },
              end: { cfi: progress.current_cfi },
            },
            percentage: progress.current_percentage || 0,
            cfi: progress.current_cfi,
          };
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

  // Set currentCFI from savedProgressData when it's available
  useEffect(() => {
    console.log(
      "[PROGRESS] useEffect triggered - savedProgressData:",
      !!savedProgressData,
      "currentCFI:",
      !!currentCFI
    );
    if (savedProgressData && savedProgressData.cfi && !currentCFI) {
      console.log(
        "[PROGRESS] Setting currentCFI from savedProgressData:",
        savedProgressData.cfi
      );
      setCurrentCFI(savedProgressData.cfi);
    } else if (savedProgressData && !savedProgressData.cfi) {
      console.log("[PROGRESS] savedProgressData exists but no CFI found");
    } else if (currentCFI) {
      console.log("[PROGRESS] currentCFI already set, skipping");
    }
  }, [savedProgressData, currentCFI]);

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

  // Force re-render when reading mode changes to update UI elements
  useEffect(() => {
    // Force update to ensure navigation buttons and divider visibility updates
    setForceUpdate({});
  }, [readingMode]);

  // Update current chapter when scroll manager location changes
  useEffect(() => {
    if (readingMode === "scrolled" && scrollCurrentLocation && book) {
      console.log(
        "[CHAPTER] Updating chapter from scroll manager location:",
        scrollCurrentLocation
      );
      updateCurrentChapter(scrollCurrentLocation, book);
    }
  }, [scrollCurrentLocation, book, readingMode]);

  // Update current percentage when scroll manager progress changes
  useEffect(() => {
    if (
      readingMode === "scrolled" &&
      typeof scrollReadingProgress === "number"
    ) {
      console.log(
        "[PROGRESS] Updating percentage from scroll manager:",
        scrollReadingProgress
      );
      setCurrentPercentage(Math.round(scrollReadingProgress));
    }
  }, [scrollReadingProgress, readingMode]);

  // Auto-save progress when scroll location changes (debounced)
  const autoSaveTimeoutRef = useRef(null);
  useEffect(() => {
    if (readingMode === "scrolled" && scrollCurrentLocation && bookData) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Debounce auto-save to avoid too frequent saves
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log("[PROGRESS] Auto-saving progress in scrolled mode");
        saveReadingProgress(true);
      }, 2000); // Save after 2 seconds of no location changes
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [scrollCurrentLocation, readingMode, bookData]);

  // Helper function to reset swipe state
  const resetSwipeState = useCallback(() => {
    isSwipingRef.current = false;
    touchStartRef.current = null;
    touchStartYRef.current = null;
    touchEndRef.current = null;
  }, []);

  // Navigation functions (defined first to avoid dependency issues)
  const nextBtn = useCallback(() => {
    if (readingMode === "scrolled") {
      // Use custom scroll manager for scrolled mode
      if (scrollNext) {
        scrollNext();
      }
    } else {
      // In paginated mode, go to next page
      if (rendition) {
        rendition.next();
        updatePageInfo(rendition, book);
      }
    }
  }, [rendition, book, readingMode, scrollNext]);

  const backBtn = useCallback(() => {
    if (readingMode === "scrolled") {
      // Use custom scroll manager for scrolled mode
      if (scrollPrev) {
        scrollPrev();
      }
    } else {
      // In paginated mode, go to previous page
      if (rendition) {
        rendition.prev();
        updatePageInfo(rendition, book);
      }
    }
  }, [rendition, book, readingMode, scrollPrev]);

  // Double-tap detection for mobile hover
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap < 300) {
      // 300ms window for double-tap
      tapCountRef.current += 1;
      if (tapCountRef.current === 2) {
        console.log("[MOBILE_HOVER] Double-tap detected, enabling hover mode");
        setMobileHoverMode(true);

        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // Auto-disable hover mode after 3 seconds
        hoverTimeoutRef.current = setTimeout(() => {
          console.log("[MOBILE_HOVER] Auto-disabling hover mode");
          setMobileHoverMode(false);
        }, 3000);

        tapCountRef.current = 0;
        e.preventDefault();
        e.stopPropagation();
        return true; // Indicate double-tap was handled
      }
    } else {
      tapCountRef.current = 1;
    }

    lastTapTimeRef.current = now;
    return false; // No double-tap detected
  }, []);

  // Touch/swipe handlers with improved debouncing and state management
  const onTouchStart = useCallback(
    (e) => {
      console.log("[SWIPE] Touch start triggered", {
        isSwipingRef: isSwipingRef.current,
        touchStartRef: touchStartRef.current,
      });

      // Check for double-tap first
      if (handleDoubleTap(e)) {
        return; // Double-tap was handled, don't process as swipe
      }

      // Prevent multiple simultaneous swipes
      if (isSwipingRef.current) {
        console.log("[SWIPE] Preventing touch start - already swiping");
        e.preventDefault();
        return;
      }

      const startX = e.targetTouches[0].clientX;
      const startY = e.targetTouches[0].clientY;
      touchStartRef.current = startX;
      touchStartYRef.current = startY;
      touchEndRef.current = null;
      isSwipingRef.current = true;

      console.log(
        "[SWIPE] Touch start detected at X:",
        startX,
        "State set to swiping"
      );
    },
    [handleDoubleTap]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!touchStartRef.current || !isSwipingRef.current) return;

      const currentX = e.targetTouches[0].clientX;
      touchEndRef.current = currentX;

      // In scrolled mode, allow vertical scrolling but prevent horizontal swipes
      // In paginated mode, prevent all scrolling for horizontal swipes
      const distance = Math.abs(currentX - touchStartRef.current);
      if (distance > 10) {
        if (readingMode === "paginated") {
          // In paginated mode, prevent all scrolling for swipes
          e.preventDefault();
        } else {
          // In scrolled mode, only prevent horizontal movement
          // Allow vertical scrolling to continue naturally
          const currentY = e.targetTouches[0].clientY;
          const startY = touchStartYRef.current;
          const verticalDistance = startY ? Math.abs(currentY - startY) : 0;

          // Only prevent if it's clearly a horizontal swipe (more horizontal than vertical)
          if (distance > verticalDistance) {
            e.preventDefault();
          }
        }
      }

      console.log("[SWIPE] Touch move detected at X:", currentX);
    },
    [readingMode]
  );

  const onTouchEnd = useCallback(
    (e) => {
      console.log("[SWIPE] Touch end triggered", {
        isSwipingRef: isSwipingRef.current,
        touchStartRef: touchStartRef.current,
        touchEndRef: touchEndRef.current,
      });

      // Always reset state at the end, regardless of what happens
      const cleanup = () => {
        isSwipingRef.current = false;
        touchStartRef.current = null;
        touchStartYRef.current = null;
        touchEndRef.current = null;
        console.log("[SWIPE] State cleaned up");
      };

      // Check debounce time to prevent rapid swipes
      const now = Date.now();
      if (now - lastSwipeTimeRef.current < swipeDebounceTime) {
        console.log("[SWIPE] Swipe debounced - too soon after last swipe");
        cleanup();
        return;
      }

      if (!touchStartRef.current || !isSwipingRef.current) {
        console.log("[SWIPE] Touch end without valid start");
        cleanup();
        return;
      }

      // Get end position to check if this is a tap vs swipe
      let endX = touchEndRef.current;
      if (!endX && e.changedTouches && e.changedTouches[0]) {
        endX = e.changedTouches[0].clientX;
      }

      // If mobile hover mode is active and this is a single tap (not a swipe), disable hover mode
      if (mobileHoverMode && endX) {
        const distance = Math.abs(touchStartRef.current - endX);

        if (distance < minSwipeDistance) {
          console.log(
            "[MOBILE_HOVER] Single tap detected, disabling hover mode"
          );
          setMobileHoverMode(false);
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          cleanup();
          return;
        }
      }

      if (!endX) {
        console.log("[SWIPE] Touch end without valid end position");
        cleanup();
        return;
      }

      const distance = touchStartRef.current - endX;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      console.log("[SWIPE] Touch end detected", {
        touchStart: touchStartRef.current,
        touchEnd: endX,
        distance,
        minSwipeDistance,
        isLeftSwipe,
        isRightSwipe,
        hasRendition: !!rendition,
      });

      // Only process swipe if it meets minimum distance and we have rendition
      if ((isLeftSwipe || isRightSwipe) && rendition) {
        lastSwipeTimeRef.current = now;

        if (isLeftSwipe) {
          console.log("[SWIPE] Left swipe detected - going to next page");
          setSwipeDirection("left");
          setTimeout(() => setSwipeDirection(null), 300);

          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          nextBtn();
        } else if (isRightSwipe) {
          console.log("[SWIPE] Right swipe detected - going to previous page");
          setSwipeDirection("right");
          setTimeout(() => setSwipeDirection(null), 300);

          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          backBtn();
        }
      }

      // Always cleanup at the end
      cleanup();
    },
    [
      minSwipeDistance,
      rendition,
      nextBtn,
      backBtn,
      swipeDebounceTime,
      mobileHoverMode,
    ]
  );

  // Attach touch event listeners - simplified to avoid duplicate events
  useEffect(() => {
    if (!book || !isMobile || !rendition) return;

    console.log("[SWIPE] Attaching touch event listeners for mobile", {
      currentChapter,
      hasRendition: !!rendition,
    });

    // Use a single target element to avoid duplicate events
    // Priority: viewer > main container > document
    let targetElement = null;
    const viewer = viewerRef.current || document.getElementById("viewer");
    const mainContainer = document.querySelector(".main-book-reader-container");

    if (viewer) {
      targetElement = viewer;
      console.log("[SWIPE] Using viewer as target element");
    } else if (mainContainer) {
      targetElement = mainContainer;
      console.log("[SWIPE] Using main container as target element");
    } else {
      targetElement = document;
      console.log("[SWIPE] Using document as target element");
    }

    // Add event listeners with capture to ensure we get the events first
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

    // Try to add to iframe content as well (for epub.js)
    const checkForIframe = () => {
      const iframe = document.querySelector("#viewer iframe");
      if (iframe && iframe.contentDocument) {
        try {
          const iframeDoc = iframe.contentDocument;
          iframeDoc.addEventListener("touchstart", onTouchStart, {
            passive: false,
          });
          iframeDoc.addEventListener("touchmove", onTouchMove, {
            passive: false,
          });
          iframeDoc.addEventListener("touchend", onTouchEnd, {
            passive: false,
          });
          console.log("[SWIPE] Added touch listeners to iframe content");
        } catch (e) {
          console.log(
            "[SWIPE] Could not access iframe content (CORS):",
            e.message
          );
        }
      }
    };

    // Check for iframe after a delay to allow epub.js to load
    const iframeTimer = setTimeout(checkForIframe, 1500);

    // Also check again after a longer delay in case of chapter navigation
    const iframeTimer2 = setTimeout(checkForIframe, 3000);

    // Set up a mutation observer to detect when iframe content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          // Check if an iframe was added or modified
          const addedNodes = Array.from(mutation.addedNodes);
          const hasIframe = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node.tagName === "IFRAME" || node.querySelector("iframe"))
          );

          if (hasIframe) {
            console.log("[SWIPE] Iframe detected via mutation observer");
            setTimeout(checkForIframe, 500); // Small delay to ensure iframe is ready
          }
        }
      });
    });

    // Observe the viewer element for changes
    if (viewer) {
      observer.observe(viewer, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      console.log("[SWIPE] Removing touch event listeners");
      clearTimeout(iframeTimer);
      clearTimeout(iframeTimer2);
      observer.disconnect();

      if (targetElement) {
        targetElement.removeEventListener("touchstart", onTouchStart, {
          capture: true,
        });
        targetElement.removeEventListener("touchmove", onTouchMove, {
          capture: true,
        });
        targetElement.removeEventListener("touchend", onTouchEnd, {
          capture: true,
        });
      }

      // Reset swipe state on cleanup
      isSwipingRef.current = false;
      touchStartRef.current = null;
      touchStartYRef.current = null;
      touchEndRef.current = null;
    };
  }, [
    book,
    isMobile,
    rendition,
    currentChapter,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  ]);

  // Cleanup swipe state on unmount
  useEffect(() => {
    return () => {
      resetSwipeState();
      // Clear font application timeout
      if (fontApplicationTimeoutRef.current) {
        clearTimeout(fontApplicationTimeoutRef.current);
      }
    };
  }, [resetSwipeState]);

  // Load user preferences from IndexedDB
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Initialize user preferences database
        await userPreferencesDB.init();

        // Load preferences
        const theme = await userPreferencesDB.getTheme();
        const savedFontSize = await userPreferencesDB.getFontSize();
        const savedFontFamily = await userPreferencesDB.getFontFamily();
        const savedReadingMode = await userPreferencesDB.getReadingMode();

        console.log("Loaded preferences:", {
          theme,
          savedFontSize,
          savedFontFamily,
          savedReadingMode,
        });

        setIsDarkTheme(theme === "dark");
        setFontSize(savedFontSize || DEFAULT_SETTINGS.fontSize);
        setFontFamily(savedFontFamily || DEFAULT_SETTINGS.fontFamily);
        setReadingMode(savedReadingMode || DEFAULT_SETTINGS.readingMode);
      } catch (error) {
        console.error("Error loading saved settings:", error);
        // Use defaults if there's an error
        setIsDarkTheme(DEFAULT_SETTINGS.isDarkTheme);
        setFontSize(DEFAULT_SETTINGS.fontSize);
        setFontFamily(DEFAULT_SETTINGS.fontFamily);
        setReadingMode(DEFAULT_SETTINGS.readingMode);
      } finally {
        setPreferencesLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Save user preferences to IndexedDB when they change (only after initial load)
  useEffect(() => {
    if (!preferencesLoaded) return; // Don't save during initial load

    const saveSettings = async () => {
      try {
        console.log("Saving preferences:", {
          isDarkTheme,
          fontSize,
          fontFamily,
        });
        await userPreferencesDB.setTheme(isDarkTheme ? "dark" : "light");
        await userPreferencesDB.setFontSize(fontSize);
        await userPreferencesDB.setFontFamily(fontFamily);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    };
    saveSettings();
  }, [isDarkTheme, fontSize, fontFamily, preferencesLoaded]);

  // Font loading verification
  useEffect(() => {
    const checkFontLoading = async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          // Check if our fonts are loaded
          const fonts = [
            "Alegreya",
            "Lora",
            "Atkinson",
            "Bookerly",
            "Literata",
          ];
          let allLoaded = true;
          for (const font of fonts) {
            const isLoaded = await document.fonts.check(`16px "${font}"`);
            console.log(`[FONT] ${font} loaded:`, isLoaded);
            if (!isLoaded) allLoaded = false;
          }

          // Set flag when initial font loading is complete
          setInitialFontLoadComplete(true);
          console.log("[FONT] Initial font loading complete:", allLoaded);
        } catch (error) {
          console.warn("[FONT] Font loading check failed:", error);
          // Still set the flag to prevent blocking
          setInitialFontLoadComplete(true);
        }
      } else {
        // If fonts API is not available, just set the flag
        setInitialFontLoadComplete(true);
      }
    };

    // Check fonts after a short delay to allow CSS to load
    setTimeout(checkFontLoading, 1000);
  }, []);

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoadingMessage("Fetching book information...");
        console.log("[DEBUG] Looking for book with ID:", bookValue);

        // Get book from IndexedDB
        const bookInfo = await bookStorageDB.getBook(bookValue);
        console.log("[DEBUG] Book metadata found:", bookInfo);

        if (bookInfo) {
          // Fetch the file data separately
          console.log("[DEBUG] Fetching file data for ISBN:", bookInfo.isbn);
          const fileData = await bookStorageDB.getBookFile(bookInfo.isbn);
          console.log("[DEBUG] File data found:", !!fileData);
          console.log("[DEBUG] File data type:", typeof fileData);
          console.log("[DEBUG] File data size:", fileData?.size);

          if (fileData) {
            // Convert File object to base64 for compatibility with existing code
            const reader = new FileReader();
            reader.onload = function (e) {
              const base64Data = e.target.result;
              console.log(
                "[DEBUG] File converted to base64, length:",
                base64Data.length
              );

              const bookWithFileData = {
                ...bookInfo,
                file_data: base64Data,
              };

              setBookData(bookWithFileData);
              setLoadingMessage("Book information loaded");
            };
            reader.readAsDataURL(fileData);
          } else {
            console.error("[DEBUG] No file data found for book");
            setBookData(bookInfo); // Set book data anyway, but it won't be readable
            setLoadingMessage("Book information loaded (no file data)");
          }
        } else {
          const allBooks = await bookStorageDB.getAllBooks();
          console.log("[DEBUG] Available books:", allBooks);
          throw new Error("Book not found");
        }
      } catch (error) {
        console.error("Error fetching book data:", error);
        setLoadingMessage("Error loading book information");
      }
    };

    if (bookValue && !bookData) {
      fetchBook();
    }
  }, [bookValue, bookData]);

  // Fetch reading progress first, before loading the book
  useEffect(() => {
    const fetchReadingProgress = async () => {
      if (!bookData) return;

      try {
        setLoadingMessage("Loading reading progress...");

        // Get progress from IndexedDB
        const progress = await bookStorageDB.getReadingProgress(bookData.isbn);
        console.log(
          `[DEBUG] Loading progress for ${bookData.title}: ${progress.current_percentage}%`
        );

        if (progress.current_cfi && !currentCFI) {
          console.log(
            `[DEBUG] Setting CFI: ${progress.current_cfi.substring(0, 50)}...`
          );
          console.log(
            "[CFI] Setting currentCFI from progress:",
            progress.current_cfi
          );
          setCurrentCFI(progress.current_cfi);
          setLoadingMessage("Reading progress loaded");
        } else if (currentCFI) {
          console.log(
            "[CFI] currentCFI already set, skipping bookData progress"
          );
          setLoadingMessage("Reading progress already loaded");
        } else {
          setLoadingMessage("Starting from beginning");
        }
      } catch (error) {
        console.error("Error loading progress:", error);
        setLoadingMessage("Starting from beginning");
      } finally {
        setProgressFetched(true);
      }
    };

    if (bookData) {
      fetchReadingProgress();
    }
  }, [bookData]);

  // Load book file after progress is fetched
  useEffect(() => {
    console.log("[DEBUG] Load book effect triggered", {
      bookData: !!bookData,
      progressFetched,
      book: !!book,
      rendition: !!rendition,
      savedProgressData: !!savedProgressData,
      currentCFI: !!currentCFI,
    });

    if (!bookData || !progressFetched) {
      console.log("[DEBUG] Skipping book load - missing requirements", {
        bookData: !!bookData,
        progressFetched,
      });
      return;
    }

    // If we have saved progress data but currentCFI is not set yet, wait for it
    if (savedProgressData && savedProgressData.cfi && !currentCFI) {
      console.log(
        "[DEBUG] Waiting for currentCFI to be set from savedProgressData"
      );
      return;
    }

    if (isBookLoading) {
      console.log("[DEBUG] Book loading already in progress, skipping");
      return;
    }

    if (book && rendition) {
      console.log("[DEBUG] Book already loaded and rendered, skipping");
      return;
    }

    const loadArrayBuffer = (fileData) => {
      console.log("[DEBUG] Loading array buffer from file data", {
        fileDataLength: fileData?.length,
      });
      const base64Data = fileData.split(",")[1]; // Strip base64 prefix
      const binaryString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      console.log("[DEBUG] Array buffer created", {
        arrayBufferSize: arrayBuffer.byteLength,
      });
      return arrayBuffer;
    };

    const loadLocations = async (bookInstance) => {
      let loadedFromCache = false;

      try {
        const cached = await bookStorageDB.getBookLocations(bookData.isbn);
        if (cached) {
          setLoadingMessage("Loading book locations from cache...");
          bookInstance.locations.load(cached);
          loadedFromCache = true;
          setLoadingMessage("Book locations loaded from cache");
        }
      } catch (err) {
        console.warn("Cached locations not found or failed to load");
      }

      if (!loadedFromCache) {
        setLoadingMessage("Generating book locations...");
        await bookInstance.locations.generate(1024);
        setLoadingMessage("Book locations generated");

        try {
          await bookStorageDB.setBookLocations(
            bookData.isbn,
            bookInstance.locations.save()
          );
        } catch (err) {
          console.error("Error caching generated locations:", err);
        }
      }

      setLocationsGenerated(true);
    };

    const loadBook = async () => {
      try {
        console.log("[DEBUG] Starting loadBook function");
        setIsBookLoading(true);
        setLoadingMessage("Loading book...");

        let arrayBuffer;
        console.log("[DEBUG] Checking book data format", {
          hasFileData: !!bookData.file_data,
          hasFileDirectory: !!bookData.file_directory,
          fileDataLength: bookData.file_data?.length,
        });

        if (bookData.file_data) {
          console.log("[DEBUG] Using file_data format");
          setLoadingMessage("Loading your uploaded book...");
          arrayBuffer = loadArrayBuffer(bookData.file_data);
        } else if (bookData.file_directory) {
          console.log("[DEBUG] Old file_directory format detected");
          setLoadingMessage("Old format not supported. Please re-upload.");
          setTimeout(() => setLoading(false), 5000);
          return;
        } else {
          console.log("[DEBUG] No valid book data found");
          setLoadingMessage("Invalid book data. Please upload again.");
          setTimeout(() => setLoading(false), 3000);
          return;
        }

        console.log(
          "[DEBUG] Creating ePub instance with arrayBuffer size:",
          arrayBuffer.byteLength
        );
        const newBook = ePub(arrayBuffer);

        console.log("[DEBUG] Waiting for book.ready...");
        await newBook.ready;
        console.log("[DEBUG] Book ready completed, setting book state");
        setBook(newBook);

        console.log("[DEBUG] Loading locations...");
        await loadLocations(newBook);
        console.log("[DEBUG] Locations loaded");

        // Set the book in state and let React render the viewer element
        setLoadingMessage("Preparing viewer...");
        console.log("[DEBUG] Book loaded successfully, preparing to render");

        // Since the viewer element is now always rendered, we can proceed directly
        // Use a small delay to ensure the DOM is ready
        setTimeout(() => {
          console.log("[DEBUG] Looking for viewer element to render book");
          const viewerEl =
            viewerRef.current || document.getElementById("viewer");
          console.log("[DEBUG] Viewer element found:", !!viewerEl);

          if (viewerEl) {
            setLoadingMessage("Rendering book...");
            console.log("[DEBUG] Calling renderBook");
            renderBook(newBook);
          } else {
            console.error("[DEBUG] Viewer element still not found");
            setLoadingMessage("Error: Could not initialize viewer");
            setLoading(false);
          }
        }, 200); // Slightly longer delay to ensure DOM is ready
      } catch (error) {
        const isMissingResource = error?.message?.includes(
          "File not found in the epub"
        );

        console.error("Error loading book:", error);
        setLoadingMessage(
          isMissingResource
            ? "Error: Missing book resources"
            : "Error loading book"
        );
        setLoading(false);
        setIsBookLoading(false);
      }
    };

    // Avoid duplicate loads
    if (!book && !rendition) {
      console.log("[DEBUG] Calling loadBook from useEffect");
      loadBook();
    } else {
      console.log("Book already loaded, skipping...");
    }
  }, [bookData, progressFetched, savedProgressData, currentCFI]);

  // Handle title bar visibility
  useEffect(() => {
    const handleInteraction = (e) => {
      // Check if the interaction is over navigation buttons
      const target = e.target;
      const isNavButton =
        target.classList.contains("nav-button") ||
        target.closest(".nav-button") ||
        target.classList.contains("reader-controls") ||
        target.closest(".reader-controls");

      // Only show title bar if not interacting with navigation buttons
      if (!isNavButton) {
        setShowTitleBar(true);

        if (titleBarTimerRef.current) {
          clearTimeout(titleBarTimerRef.current);
        }

        titleBarTimerRef.current = setTimeout(
          () => setShowTitleBar(false),
          1500
        );
      }
    };

    const handleTouchStart = (e) => {
      handleInteraction(e);
    };

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("touchstart", handleTouchStart);

    return () => {
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleTouchStart);
      if (titleBarTimerRef.current) {
        clearTimeout(titleBarTimerRef.current);
      }
    };
  }, []);

  // Save reading progress on page unload only
  useEffect(() => {
    if (!rendition || !bookData) return;

    // Save progress when user leaves the page
    const handleBeforeUnload = () => {
      saveReadingProgress(true);
    };

    // Save progress when user navigates away
    const handleVisibilityChange = () => {
      console.log(
        "[VISIBILITY] Tab visibility changed:",
        document.visibilityState
      );
      if (document.visibilityState === "hidden") {
        console.log("[VISIBILITY] Tab hidden, saving progress");
        saveReadingProgress(true);
      } else if (document.visibilityState === "visible") {
        console.log("[VISIBILITY] Tab visible again");
        // Check if we need to update currentCFI when tab becomes visible
        if (rendition) {
          try {
            const location = rendition.currentLocation();
            if (location && location.start && location.start.cfi) {
              console.log(
                "[VISIBILITY] Setting CFI on tab visible:",
                location.start.cfi
              );
              setCurrentCFI(location.start.cfi);
            }
          } catch (error) {
            console.error(
              "[VISIBILITY] Error getting location on tab visible:",
              error
            );
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function for component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Clear hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Save on component unmount
      if (book && rendition) {
        saveReadingProgress(true);
      }
    };
  }, [rendition, bookData, book]);

  // Apply theme changes
  useEffect(() => {
    if (readingMode === "scrolled") {
      // Use custom scroll manager for theme
      if (scrollApplyTheme && preferencesLoaded) {
        console.log("[THEME] Applying theme via scroll manager:", isDarkTheme);
        scrollApplyTheme(isDarkTheme);
      }
    } else if (rendition && rendition.themes && preferencesLoaded) {
      // Use regular rendition for theme
      if (isDarkTheme) {
        if (isDarkClicked > 0) {
          rendition.themes.override("transition", "0.3s ease-in-out");
        }
        rendition.themes.override("background", "black");
        rendition.themes.override("color", "white");
      } else {
        if (isDarkClicked > 0) {
          rendition.themes.override("transition", "0.3s ease-in-out");
        }
        rendition.themes.override("background", "white");
        rendition.themes.override("color", "black");
      }
    }
  }, [
    isDarkTheme,
    isDarkClicked,
    rendition,
    preferencesLoaded,
    readingMode,
    scrollApplyTheme,
  ]);

  // Apply font size changes
  useEffect(() => {
    if (
      rendition &&
      rendition.themes &&
      preferencesLoaded &&
      !isUpdatingReadingMode
    ) {
      // Use epub.js built-in fontSize for better performance
      rendition.themes.fontSize(fontSize);

      // In scrolled mode, also apply via our custom method to ensure consistency
      if (readingMode === "scrolled") {
        console.log("[FONT_SIZE] Applying font size in scrolled mode");
        debouncedApplyFontSettings();
      }
    }
  }, [
    fontSize,
    rendition,
    preferencesLoaded,
    isUpdatingReadingMode,
    readingMode,
  ]);

  // Apply font family changes
  useEffect(() => {
    console.log("Font family effect triggered:", {
      fontFamily,
      rendition: !!rendition,
      preferencesLoaded,
      isUpdatingReadingMode,
      readingMode,
      initialFontLoadComplete,
    });
    if (
      (rendition || readingMode === "scrolled") &&
      preferencesLoaded &&
      !isUpdatingReadingMode &&
      initialFontLoadComplete
    ) {
      console.log("Applying font settings via effect");
      // Use debounced version to prevent rapid applications
      debouncedApplyFontSettings();
    } else if (isUpdatingReadingMode) {
      console.log("Skipping font application - reading mode is being updated");
    } else if (!initialFontLoadComplete) {
      console.log(
        "Skipping font application - initial font loading not complete"
      );
    } else if (!rendition && readingMode !== "scrolled") {
      console.log(
        "Skipping font application - no rendition available for paginated mode"
      );
    }
  }, [
    fontFamily,
    fontSize,
    rendition,
    preferencesLoaded,
    isUpdatingReadingMode,
    readingMode,
    initialFontLoadComplete,
  ]);

  // Listen for new views being rendered and apply fonts to them
  useEffect(() => {
    if (!rendition || !preferencesLoaded || !initialFontLoadComplete) return;

    const handleViewRendered = () => {
      console.log("New view rendered, checking if font application is needed");
      // Skip font application if reading mode is being updated
      if (isUpdatingReadingMode) {
        console.log(
          "Skipping font application on view rendered - reading mode is being updated"
        );
        return;
      }

      // Use actual rendition flow to avoid sync issues
      const actualFlow = rendition?.settings?.flow;

      // In scrolled mode, skip font applications during chapter navigation to prevent jumping
      if (actualFlow === "scrolled" && isNavigatingToChapter) {
        console.log(
          "Skipping font application during chapter navigation in scrolled mode"
        );
        return;
      }

      // In scrolled mode, be more conservative about font applications in general
      if (actualFlow === "scrolled") {
        console.log(
          "Skipping font application on view rendered in scrolled mode to prevent jumping"
        );
        return;
      }

      // Small delay to ensure the iframe is fully loaded
      setTimeout(() => {
        console.log("Applying font settings after view rendered");
        debouncedApplyFontSettings();
      }, 150); // Slightly longer delay for stability
    };

    // Listen for when new views are rendered
    rendition.on("rendered", handleViewRendered);

    return () => {
      rendition.off("rendered", handleViewRendered);
    };
  }, [
    rendition,
    preferencesLoaded,
    fontFamily,
    isUpdatingReadingMode,
    readingMode,
    isNavigatingToChapter,
    initialFontLoadComplete,
  ]);

  // Fetch and apply annotations
  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!rendition || !bookValue) return;

      try {
        // Get annotations from IndexedDB
        const annotations = await bookStorageDB.getAnnotations(bookValue);
        console.log("[DEBUG] Applying", annotations.length, "annotations");

        // Apply annotations to the rendition
        annotations.forEach((annotation) => {
          try {
            rendition.annotations.highlight(
              annotation.cfi_range,
              {},
              (e) => console.error("Annotation error:", e),
              undefined,
              {
                fill: annotation.color,
              }
            );
          } catch (error) {
            console.error(
              "Error applying annotation:",
              annotation.cfi_range,
              error
            );
          }
        });
      } catch (error) {
        console.error("Error fetching annotations:", error);
      }
    };

    fetchAnnotations();
  }, [rendition, bookValue]);
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        nextBtn();
      } else if (event.key === "ArrowLeft") {
        backBtn();
      } else if (event.key === "Escape") {
        // Close reading progress modal if open
        if (showReadingProgress) {
          setShowReadingProgress(false);
        }
      }
    };

    if (rendition) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [rendition, showReadingProgress]);

  // Save book data to IndexedDB
  useEffect(() => {
    if (bookData) {
      const saveSelectedBook = async () => {
        try {
          const bookWithTimestamp = {
            ...bookData,
            last_accessed: new Date().toISOString(),
          };
          await bookStorageDB.setSelectedBook(bookWithTimestamp);
          // Dispatch custom event to notify other components
          window.dispatchEvent(new Event("selectedBookChanged"));
        } catch (error) {
          console.error("Error saving selected book:", error);
        }
      };
      saveSelectedBook();
    }
  }, [bookData]);

  // Get font family with proper fallbacks
  const getFontWithFallback = (fontName) => {
    switch (fontName) {
      case "Alegreya":
        return "'Alegreya', Georgia, serif";
      case "Lora":
        return "'Lora', Georgia, serif";
      case "Atkinson":
        return "'Atkinson', Arial, sans-serif";
      case "Bookerly":
        return "'Bookerly', Georgia, serif";
      case "Literata":
        return "'Literata', Georgia, serif";
      default:
        return "'Lora', Georgia, serif";
    }
  };

  // Inject font definitions into epub iframe
  const injectFontDefinitions = (rendition) => {
    if (!rendition) return;

    const fontDefinitions = `
      @font-face {
        font-family: "Alegreya";
        src: url("/fonts/alegreya/Alegreya-Regular.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Lora";
        src: url("/fonts/lora/Lora.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Atkinson";
        src: url("/fonts/atkinson/Atkinson-Hyperlegible-Regular-102a.woff2") format("woff2"),
             url("/fonts/atkinson/Atkinson-Hyperlegible-Regular-102.woff") format("woff"),
             url("/fonts/atkinson/Atkinson-Hyperlegible-Regular-102.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Bookerly";
        src: url("/fonts/bookerley/Bookerly.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Literata";
        src: url("/fonts/literata/Literata-Regular.ttf") format("truetype");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `;

    // Function to inject fonts into iframe
    const injectIntoIframe = () => {
      const iframe = document.querySelector("#viewer iframe");
      if (iframe && iframe.contentDocument) {
        try {
          const iframeDoc = iframe.contentDocument;
          let styleElement = iframeDoc.getElementById("custom-fonts");

          if (!styleElement) {
            styleElement = iframeDoc.createElement("style");
            styleElement.id = "custom-fonts";
            styleElement.textContent = fontDefinitions;
            iframeDoc.head.appendChild(styleElement);
            console.log("[FONT] Font definitions injected into iframe head");
          }
        } catch (e) {
          console.warn("[FONT] Could not access iframe document:", e);
        }
      }
    };

    // Try multiple approaches to inject fonts

    // Method 1: Inject immediately if iframe exists
    setTimeout(injectIntoIframe, 100);

    // Method 2: Inject on rendered event
    rendition.on("rendered", injectIntoIframe);

    // Method 3: Inject on locationChanged event (for navigation)
    rendition.on("locationChanged", injectIntoIframe);

    // Method 4: Use mutation observer to detect iframe changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasIframe = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node.tagName === "IFRAME" || node.querySelector("iframe"))
          );

          if (hasIframe) {
            setTimeout(injectIntoIframe, 100);
          }
        }
      });
    });

    const viewer = document.getElementById("viewer");
    if (viewer) {
      observer.observe(viewer, {
        childList: true,
        subtree: true,
      });
    }
  };

  // Debounced font application to prevent multiple rapid calls
  const debouncedApplyFontSettings = useCallback(() => {
    const now = Date.now();

    // Clear any existing timeout
    if (fontApplicationTimeoutRef.current) {
      clearTimeout(fontApplicationTimeoutRef.current);
    }

    // If we're in scrolled mode and this is too soon after the last application, debounce it
    if (
      readingMode === "scrolled" &&
      now - lastFontApplicationRef.current < fontApplicationDebounceTime
    ) {
      console.log("[FONT] Debouncing font application in scrolled mode");
      fontApplicationTimeoutRef.current = setTimeout(() => {
        applyFontSettingsImmediate();
      }, fontApplicationDebounceTime);
      return;
    }

    // Apply immediately
    applyFontSettingsImmediate();
  }, [readingMode, fontFamily, isNavigatingToChapter, initialFontLoadComplete]);

  // Apply font settings to all elements (immediate version)
  const applyFontSettingsImmediate = () => {
    if (readingMode === "scrolled") {
      // Use custom scroll manager for font settings
      if (scrollApplyFontSettings) {
        console.log("[FONT] Applying font settings via scroll manager:", {
          fontSize,
          fontFamily,
          scrollApplyFontSettings: !!scrollApplyFontSettings,
        });
        scrollApplyFontSettings(fontSize, fontFamily);
      } else {
        console.log("[FONT] Scroll manager not available for font settings");
      }
      return;
    }

    if (!rendition || isUpdatingReadingMode) {
      console.log(
        "Cannot apply font settings - rendition not available or mode updating"
      );
      return;
    }

    // Additional check to ensure rendition is properly initialized
    try {
      if (!rendition.manager || !rendition.manager.views) {
        console.log(
          "Cannot apply font settings - rendition not fully initialized"
        );
        return;
      }
    } catch (error) {
      console.log("Cannot apply font settings - rendition error:", error);
      return;
    }

    // Update last application time
    lastFontApplicationRef.current = Date.now();

    console.log(
      "[FONT] Applying font settings for:",
      fontFamily,
      "- Reading Mode:",
      readingMode
    );

    // Store scroll position before applying fonts in scrolled mode
    let scrollPositions = [];
    if (readingMode === "scrolled") {
      const iframes = rendition.manager.views._views;
      iframes.forEach((view, index) => {
        if (view && view.iframe && view.iframe.contentWindow) {
          const scrollY = view.iframe.contentWindow.scrollY;
          scrollPositions[index] = scrollY;
          console.log(
            `[FONT] Storing scroll position for view ${index}:`,
            scrollY
          );
        }
      });
    }

    // First inject font definitions
    injectFontDefinitions(rendition);

    const fontWithFallback = getFontWithFallback(fontFamily);
    console.log("[FONT] Font with fallback:", fontWithFallback);

    // Get all iframes in the rendition
    const iframes = rendition.manager.views._views;

    iframes.forEach((view, index) => {
      if (view && view.iframe && view.iframe.contentDocument) {
        const doc = view.iframe.contentDocument;

        // Remove any existing font override style
        const existingStyle = doc.getElementById("font-override-style");
        if (existingStyle) {
          existingStyle.remove();
        }

        // Create new style element with font override
        const style = doc.createElement("style");
        style.id = "font-override-style";

        // Calculate font size based on user preference
        const baseFontSize = 18; // Base size in px
        const calculatedFontSize = `${baseFontSize * fontSize}px`;

        style.textContent = `
          /* High specificity overrides for global font styles */
          html *, html body *, body *, div *, p *, span *, 
          h1 *, h2 *, h3 *, h4 *, h5 *, h6 * {
            font-family: ${fontWithFallback} !important;
          }
          
          /* Main content styling */
          body {
            font-family: ${fontWithFallback} !important;
            font-size: ${calculatedFontSize} !important;
            line-height: 1.7 !important;
            text-align: justify !important;
            hyphens: auto !important;
            word-spacing: 0.1em !important;
          }
          
          /* Paragraph styling */
          p {
            font-family: ${fontWithFallback} !important;
            font-size: ${calculatedFontSize} !important;
            line-height: 1.7 !important;
            margin: 0 0 1.5em 0 !important;
            text-indent: 1.5em !important;
          }
          
          /* Heading styling */
          h1, h2, h3, h4, h5, h6 {
            font-family: ${fontWithFallback} !important;
            line-height: 1.4 !important;
            margin: 1.5em 0 1em 0 !important;
          }
          
          /* Override any global font declarations */
          * {
            font-family: ${fontWithFallback} !important;
          }
        `;

        // Inject the style into the iframe head
        if (doc.head) {
          doc.head.appendChild(style);
          console.log(`[FONT] Font style injected into iframe ${index}`);
        }

        // Restore scroll position in scrolled mode (but not during chapter navigation)
        if (
          readingMode === "scrolled" &&
          scrollPositions[index] !== undefined &&
          !isNavigatingToChapter
        ) {
          // Use multiple attempts to restore scroll position for better reliability
          const restoreScrollPosition = (attempt = 1) => {
            if (view.iframe && view.iframe.contentWindow) {
              const currentScroll = view.iframe.contentWindow.scrollY;
              const targetScroll = scrollPositions[index];

              console.log(
                `[FONT] Attempt ${attempt} - Restoring scroll position for view ${index}: ${currentScroll} -> ${targetScroll}`
              );

              view.iframe.contentWindow.scrollTo(0, targetScroll);

              // Verify scroll position was set correctly and retry if needed
              setTimeout(() => {
                if (view.iframe && view.iframe.contentWindow) {
                  const newScroll = view.iframe.contentWindow.scrollY;
                  if (Math.abs(newScroll - targetScroll) > 5 && attempt < 3) {
                    console.log(
                      `[FONT] Scroll position not accurate (${newScroll} vs ${targetScroll}), retrying...`
                    );
                    restoreScrollPosition(attempt + 1);
                  } else {
                    console.log(
                      `[FONT] Scroll position restored successfully: ${newScroll}`
                    );
                  }
                }
              }, 50);
            }
          };

          setTimeout(restoreScrollPosition, 100);
        } else if (isNavigatingToChapter) {
          console.log(
            `[FONT] Skipping scroll position restoration during chapter navigation for view ${index}`
          );
        }
      }
    });

    console.log(
      "[FONT] Font settings applied successfully via direct CSS injection"
    );
  };

  // Legacy function for backward compatibility
  const applyFontSettings = debouncedApplyFontSettings;

  // Find spine index manually (since indexOf is not available)
  const findSpineIndex = (book, href) => {
    if (!book || !book.spine || !book.spine.items || !href) {
      return -1;
    }

    for (let i = 0; i < book.spine.items.length; i++) {
      const item = book.spine.items[i];
      if (item.href === href || href.includes(item.href)) {
        return i;
      }
    }
    return 0; // Default to first item if not found
  };

  // Render the book
  const renderBook = (loadedBook, retryCount = 0) => {
    console.log("[DEBUG] renderBook called", {
      loadedBook: !!loadedBook,
      retryCount,
    });
    if (!loadedBook) {
      console.log("[DEBUG] No loaded book provided");
      return;
    }

    // Ensure the viewer element exists
    const viewerElement =
      viewerRef.current || document.getElementById("viewer");
    console.log("[DEBUG] Viewer element check", {
      viewerElement: !!viewerElement,
      viewerRef: !!viewerRef.current,
      getElementById: !!document.getElementById("viewer"),
    });

    if (!viewerElement) {
      console.error(
        "[DEBUG] Viewer element not found, retry count:",
        retryCount
      );

      // Retry up to 3 times with increasing delays
      if (retryCount < 3) {
        console.log(
          "[DEBUG] Retrying renderBook in",
          200 * (retryCount + 1),
          "ms"
        );
        setTimeout(() => {
          renderBook(loadedBook, retryCount + 1);
        }, 200 * (retryCount + 1));
        return;
      }

      console.error("[DEBUG] Max retries reached, giving up");
      setLoadingMessage("Error: Viewer element not found");
      setLoading(false);
      return;
    }

    try {
      // In scrolled mode, don't create a rendition - let the custom scroll manager handle everything
      console.log("[DEBUG] renderBook - readingMode:", readingMode);
      if (readingMode === "scrolled") {
        console.log(
          "[DEBUG] Scrolled mode detected - skipping rendition creation, custom scroll manager will handle rendering"
        );
        setBook(loadedBook);
        setLoading(false);
        return;
      }

      console.log("[DEBUG] Creating rendition with element:", viewerElement);

      // Double-check that we're not in scrolled mode (safety check)
      if (readingMode === "scrolled") {
        console.log(
          "[DEBUG] Safety check: readingMode is scrolled, aborting rendition creation"
        );
        setBook(loadedBook);
        setLoading(false);
        return;
      }

      // Configure rendition options for paginated mode only
      const renditionOptions = {
        width: `${window.innerWidth}px`,
        height: "90vh",
        ignoreClass: "annotator-hl",
        manager: "default",
        flow: "paginated",
      };

      // Ensure the viewer element is properly attached to the DOM
      if (!viewerElement.isConnected) {
        console.error("[DEBUG] Viewer element is not connected to DOM");
        setLoadingMessage("Error: Viewer element not ready");
        setLoading(false);
        return;
      }

      console.log("Creating rendition with options:", renditionOptions);
      let newRendition;
      try {
        newRendition = loadedBook.renderTo(viewerElement, renditionOptions);
        console.log("[DEBUG] Rendition created successfully");
      } catch (error) {
        console.error("[DEBUG] Error creating rendition:", error);
        setLoadingMessage("Error creating book renderer");
        setLoading(false);
        return;
      }

      // Apply global font styles before displaying content
      // First inject font definitions
      injectFontDefinitions(newRendition);

      const fontWithFallback = getFontWithFallback(fontFamily);

      newRendition.themes.default({
        body: {
          "font-family": `${fontWithFallback} !important`,
        },
        p: {
          "font-family": `${fontWithFallback} !important`,
        },
        div: {
          "font-family": `${fontWithFallback} !important`,
        },
        span: {
          "font-family": `${fontWithFallback} !important`,
        },
        "h1, h2, h3, h4, h5, h6": {
          "font-family": `${fontWithFallback} !important`,
        },
        "*": {
          "font-family": `${fontWithFallback} !important`,
        },
      });

      // Register themes
      newRendition.themes.register("dark", {
        body: {
          background: "black",
          color: "white",
          "font-family": `${fontWithFallback} !important`,
        },
        "p, div, span, h1, h2, h3, h4, h5, h6, *": {
          "font-family": `${fontWithFallback} !important`,
        },
        ".calibre": {
          background: "black",
          color: "white",
          "font-family": `${fontWithFallback} !important`,
        },
      });

      newRendition.themes.register("default", {
        body: {
          background: "white",
          color: "black",
          "font-family": `${fontWithFallback} !important`,
        },
        "p, div, span, h1, h2, h3, h4, h5, h6, *": {
          "font-family": `${fontWithFallback} !important`,
        },
        ".calibre": {
          background: "white",
          color: "black",
          "font-family": `${fontWithFallback} !important`,
        },
      });

      // Set font size from saved preferences
      newRendition.themes.fontSize(fontSize);

      // Apply theme from saved preferences
      if (isDarkTheme) {
        newRendition.themes.select("dark");
      } else {
        newRendition.themes.select("default");
      }

      // Display at saved position or start from beginning
      console.log("[DEBUG] About to display book", { currentCFI });
      const displayPromise = currentCFI
        ? newRendition.display(currentCFI)
        : newRendition.display();

      displayPromise
        .then(() => {
          console.log("[DEBUG] Book display promise resolved successfully");

          // Get and set the current CFI immediately after display
          try {
            const location = newRendition.currentLocation();
            if (location && location.start && location.start.cfi) {
              console.log(
                "[CFI] Setting initial currentCFI after display:",
                location.start.cfi
              );
              setCurrentCFI(location.start.cfi);

              // Also set the initial chapter
              console.log("[CHAPTER] Setting initial chapter after display");
              updateCurrentChapter(location, loadedBook);
            } else {
              console.log(
                "[CFI] No location available immediately after display"
              );
            }
          } catch (error) {
            console.error("[CFI] Error getting location after display:", error);
          }

          // Set the rendition in state
          setRendition(newRendition);
          setIsBookLoading(false);

          // Schedule a delayed page calculation to ensure everything is loaded
          if (pageCalculationTimeoutRef.current) {
            clearTimeout(pageCalculationTimeoutRef.current);
          }

          console.log("[DEBUG] Scheduling page calculation");
          pageCalculationTimeoutRef.current = setTimeout(() => {
            console.log("[DEBUG] Running calculateInitialPageInfo");
            calculateInitialPageInfo(newRendition, loadedBook);

            // Ensure chapter is set even if it wasn't set initially
            try {
              const location = newRendition.currentLocation();
              if (location) {
                console.log("[CHAPTER] Setting chapter in delayed calculation");
                updateCurrentChapter(location, loadedBook);
              } else {
                // Last resort: set a default chapter if we have TOC
                if (loadedBook?.navigation?.toc) {
                  const toc = flatten(loadedBook.navigation.toc);
                  if (toc.length > 0) {
                    console.log("[CHAPTER] Setting first chapter as fallback");
                    const firstChapter = toc[0];
                    const chapterLabel =
                      firstChapter.label?.trim() || "Chapter 1";
                    setCurrentChapter(chapterLabel);
                  }
                }
              }
            } catch (error) {
              console.error(
                "[CHAPTER] Error in delayed chapter setting:",
                error
              );
              // Ensure loading is marked complete even if there's an error
              setLoading(false);
              setIsBookLoading(false);
            }
          }, 500);
        })
        .catch((error) => {
          console.error("[DEBUG] Error displaying book:", error);
          setLoadingMessage("Error displaying book: " + error.message);
          setLoading(false);
          setIsBookLoading(false);
        });

      // Handle window resize with debouncing for better performance
      let resizeTimeout;
      const resizeListener = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const newWidth = window.innerWidth;
          const newHeight = "90vh";

          // Resize the rendition
          newRendition.resize(`${newWidth}px`, newHeight);

          // Force a re-render to ensure proper layout
          if (newRendition.manager && newRendition.manager.views) {
            newRendition.manager.views.forEach((view) => {
              if (view.pane) {
                view.pane.render();
              }
            });
          }

          // Update page info after resize (only in paginated mode)
          setTimeout(() => {
            if (readingMode === "paginated") {
              updatePageInfo(newRendition, loadedBook);
            }
          }, 100);
        }, 150); // Debounce resize events
      };

      window.addEventListener("resize", resizeListener);

      // Track current chapter and update page info
      newRendition.on("locationChanged", (location) => {
        console.log(
          "[LOCATION] locationChanged event fired - Reading Mode:",
          readingMode
        );
        console.log("[LOCATION] - location.start.cfi:", location.start.cfi);
        console.log("[LOCATION] - location.end.cfi:", location.end?.cfi);
        console.log("[LOCATION] - location.start.href:", location.start.href);
        console.log("[LOCATION] - location.percentage:", location.percentage);
        console.log(
          "[LOCATION] - Current state currentCFI before update:",
          currentCFI
        );

        // Check if this is a scroll position jump in scrolled mode
        if (readingMode === "scrolled") {
          console.log(
            "[SCROLLED_MODE] Location changed in scrolled mode - checking for unwanted jumps"
          );
          const iframe = newRendition.getContents()[0];
          if (iframe && iframe.window) {
            console.log(
              "[SCROLLED_MODE] Current scroll position:",
              iframe.window.scrollY
            );
            console.log(
              "[SCROLLED_MODE] Document height:",
              iframe.window.document.body.scrollHeight
            );
            console.log(
              "[SCROLLED_MODE] Window height:",
              iframe.window.innerHeight
            );
          }
        }

        console.log(
          "[LOCATION] - About to call updatePageInfo and chapter detection"
        );

        // Only call updatePageInfo in paginated mode
        if (readingMode === "paginated") {
          updatePageInfo(newRendition, loadedBook);
        } else {
          console.log("[LOCATION] Skipping updatePageInfo - in scrolled mode");
        }

        // Update current chapter with enhanced detection
        updateCurrentChapter(location, loadedBook);

        // Percentage calculation is now handled by updatePageInfo

        // Update current CFI - only in paginated mode to avoid jumping in scrolled mode
        if (readingMode === "paginated") {
          try {
            const currentLocation = newRendition.currentLocation();
            const newCFI =
              currentLocation?.start?.cfi ||
              location.start.cfi ||
              location.start;
            if (newCFI) {
              console.log(
                "[CFI] Setting currentCFI from currentLocation (paginated):",
                newCFI
              );
              setCurrentCFI(newCFI);
            } else {
              console.log(
                "[CFI] Skipping undefined/null CFI from locationChanged, location:",
                location
              );
            }
          } catch (error) {
            console.warn(
              "[CFI] Error getting current location, falling back to location.start:",
              error
            );
            const newCFI = location.start.cfi || location.start;
            if (newCFI) {
              console.log(
                "[CFI] Setting currentCFI from locationChanged fallback (paginated):",
                newCFI
              );
              setCurrentCFI(newCFI);
            }
          }
        } else {
          console.log(
            "[CFI] Skipping CFI update in scrolled mode to prevent jumping"
          );
        }

        // Reapply font settings on each page change, but skip during chapter navigation in scrolled mode
        console.log(
          "[FONT] About to apply font settings - Reading Mode:",
          readingMode
        );

        if (readingMode === "scrolled" && isNavigatingToChapter) {
          console.log(
            "[FONT] Skipping font application during chapter navigation in scrolled mode"
          );
        } else {
          debouncedApplyFontSettings();
        }

        // Reset swipe state when location changes (e.g., chapter navigation)
        console.log("[SWIPE] Location changed - resetting swipe state");
        resetSwipeState();
      });

      return () => {
        window.removeEventListener("resize", resizeListener);
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        if (pageCalculationTimeoutRef.current) {
          clearTimeout(pageCalculationTimeoutRef.current);
        }
      };
    } catch (error) {
      console.error("Error rendering book:", error);
      setLoadingMessage("Error rendering book: " + error.message);
      setLoading(false);
    }
  };

  // Calculate initial page info with a more robust approach
  const calculateInitialPageInfo = (renditionInstance, bookInstance) => {
    console.log("[DEBUG] calculateInitialPageInfo called", {
      renditionInstance: !!renditionInstance,
      bookInstance: !!bookInstance,
      locationsTotal: bookInstance?.locations?.total,
    });

    if (!renditionInstance || !bookInstance) {
      console.log("[DEBUG] Missing rendition or book instance");
      return;
    }

    try {
      // Get total pages estimate using a simpler approach
      const totalPagesEstimate =
        Math.ceil(bookInstance.locations.total / 2) || 100;
      console.log("[DEBUG] Setting total pages to:", totalPagesEstimate);
      setTotalPages(totalPagesEstimate);

      // Get current location
      const location = renditionInstance.currentLocation();
      console.log("[DEBUG] Current location:", location);
      if (!location || !location.start) {
        console.log("[DEBUG] No location found, setting page to 1");
        setCurrentPage(1);
        return;
      }

      // Use percentage-based calculation for initial page
      const currentCfi = location.start.cfi;
      const currentPercentage =
        bookInstance.locations.percentageFromCfi(currentCfi);
      const estimatedCurrentPage = Math.max(
        1,
        Math.ceil(currentPercentage * totalPagesEstimate)
      );

      setCurrentPage(estimatedCurrentPage);

      // Mark loading as complete
      console.log(
        "[DEBUG] Initial page calculation complete, setting loading to false"
      );
      setLoading(false);
      setIsBookLoading(false);
    } catch (error) {
      console.error("Error in initial page calculation:", error);
      setCurrentPage(1);
      setTotalPages(100);

      // Still mark loading as complete even if there was an error
      console.log(
        "[DEBUG] Page calculation had error, but setting loading to false"
      );
      setLoading(false);
      setIsBookLoading(false);
    }
  };

  // Improved chapter detection function
  const updateCurrentChapter = (location, bookInstance) => {
    console.log(
      "[CHAPTER] updateCurrentChapter called with location:",
      location
    );

    if (
      !bookInstance ||
      !bookInstance.navigation ||
      !bookInstance.navigation.toc
    ) {
      console.log("[CHAPTER] No navigation or TOC available");
      return;
    }

    if (!location) {
      console.log("[CHAPTER] No valid location provided");
      return;
    }

    try {
      const toc = flatten(bookInstance.navigation.toc);
      console.log(
        "[CHAPTER] Available TOC items:",
        toc.map((item) => ({
          label: item.label?.trim() || "Untitled",
          href: item.href,
          id: item.id,
        }))
      );

      // Get href from location - try multiple sources
      const currentHref = location.start?.href || location.href;
      console.log("[CHAPTER] Current location href:", currentHref);
      console.log("[CHAPTER] Location object:", location);

      if (!currentHref) {
        console.log(
          "[CHAPTER] No href in location, trying spine index fallback"
        );
        // If no href, try to use the spine index directly
        if (location.index !== undefined && bookInstance.spine) {
          try {
            const spineItem = bookInstance.spine.get(location.index);
            if (spineItem && spineItem.href) {
              console.log(
                "[CHAPTER] Found href from spine index:",
                spineItem.href
              );
              const spineHref = spineItem.href;

              // Try to match this spine href with TOC
              let chapter = toc.find((item) => item.href === spineHref);
              if (!chapter) {
                const baseHref = spineHref.split("#")[0];
                chapter = toc.find((item) => {
                  const itemBaseHref = item.href?.split("#")[0];
                  return itemBaseHref === baseHref;
                });
              }
              if (!chapter) {
                chapter = toc.find((item) => {
                  if (!item.href) return false;
                  return (
                    spineHref.includes(item.href) ||
                    item.href.includes(spineHref)
                  );
                });
              }

              if (chapter) {
                console.log("[CHAPTER] Spine-based match found:", chapter);
                const chapterLabel =
                  chapter.label?.trim() || "Untitled Chapter";
                setCurrentChapter(chapterLabel);
                return;
              }
            }
          } catch (error) {
            console.log("[CHAPTER] Error in spine index lookup:", error);
          }
        }

        // If still no href, use the spine index approximation method
        if (location.index !== undefined && toc.length > 0) {
          const spineIndex = location.index;
          const chapterIndex = Math.min(
            Math.floor((spineIndex / bookInstance.spine.length) * toc.length),
            toc.length - 1
          );
          const chapter = toc[chapterIndex];
          if (chapter) {
            console.log("[CHAPTER] Index approximation match found:", chapter);
            const chapterLabel =
              chapter.label?.trim() || `Chapter ${chapterIndex + 1}`;
            setCurrentChapter(chapterLabel);
            return;
          }
        }

        console.log("[CHAPTER] Could not determine chapter from location");
        return;
      }

      // Method 1: Try exact href match
      let chapter = toc.find((item) => item.href === currentHref);
      if (chapter) {
        console.log("[CHAPTER] Exact href match found:", chapter);
        const chapterLabel = chapter.label?.trim() || "Untitled Chapter";
        setCurrentChapter(chapterLabel);
        return;
      }

      // Method 2: Try base href match (without fragment)
      const baseHref = currentHref.split("#")[0];
      chapter = toc.find((item) => {
        const itemBaseHref = item.href?.split("#")[0];
        return itemBaseHref === baseHref;
      });
      if (chapter) {
        console.log("[CHAPTER] Base href match found:", chapter);
        const chapterLabel = chapter.label?.trim() || "Untitled Chapter";
        setCurrentChapter(chapterLabel);
        return;
      }

      // Method 3: Try partial href matching (contains)
      chapter = toc.find((item) => {
        if (!item.href) return false;
        return (
          currentHref.includes(item.href) || item.href.includes(currentHref)
        );
      });
      if (chapter) {
        console.log("[CHAPTER] Partial href match found:", chapter);
        const chapterLabel = chapter.label?.trim() || "Untitled Chapter";
        setCurrentChapter(chapterLabel);
        return;
      }

      // Method 4: Try canonical URL matching if available
      if (bookInstance.canonical) {
        try {
          const canonicalCurrent = bookInstance.canonical(currentHref);
          chapter = toc.find((item) => {
            if (!item.href) return false;
            try {
              const canonicalItem = bookInstance.canonical(item.href);
              return (
                canonicalCurrent === canonicalItem ||
                canonicalCurrent.includes(canonicalItem) ||
                canonicalItem.includes(canonicalCurrent)
              );
            } catch (error) {
              return false;
            }
          });
          if (chapter) {
            console.log("[CHAPTER] Canonical URL match found:", chapter);
            const chapterLabel = chapter.label?.trim() || "Untitled Chapter";
            setCurrentChapter(chapterLabel);
            return;
          }
        } catch (error) {
          console.log("[CHAPTER] Error in canonical URL matching:", error);
        }
      }

      // Method 5: Last resort - use first chapter or generic name
      if (toc.length > 0) {
        console.log("[CHAPTER] Using first chapter as fallback");
        const firstChapter = toc[0];
        const chapterLabel = firstChapter.label?.trim() || "Chapter 1";
        setCurrentChapter(chapterLabel);
      } else {
        console.log("[CHAPTER] No TOC available, using generic name");
        setCurrentChapter("Current Chapter");
      }
    } catch (error) {
      console.error("[CHAPTER] Error in chapter detection:", error);
      // Set a fallback chapter name
      setCurrentChapter("Current Chapter");
    }
  };

  // Update page information with improved accuracy
  const updatePageInfo = (renditionInstance, bookInstance) => {
    console.log(
      "[PAGE_INFO] updatePageInfo called - Reading Mode:",
      readingMode
    );
    const currentRendition = renditionInstance || rendition;
    const currentBook = bookInstance || book;
    if (!currentRendition || !currentBook) {
      console.log("[PAGE_INFO] Missing rendition or book:", {
        hasRendition: !!currentRendition,
        hasBook: !!currentBook,
      });
      return;
    }

    try {
      // Get the current location
      const location = currentRendition.currentLocation();
      if (!location || !location.start) {
        console.log("[PAGE_INFO] No location available:", location);
        return;
      }

      // In scrolled mode, check if this call might cause unwanted navigation
      if (readingMode === "scrolled") {
        const iframe = currentRendition.getContents()[0];
        if (iframe && iframe.window) {
          console.log(
            "[PAGE_INFO] Scroll position before updatePageInfo:",
            iframe.window.scrollY
          );
        }
      }

      const currentCfi = location.start.cfi;
      const currentHref = location.start.href;

      console.log("[PAGE_INFO] Processing location:", {
        currentCfi,
        currentHref,
        hasLocations: !!currentBook.locations,
        locationsTotal: currentBook.locations?.total,
      });

      // Check if locations are available
      if (!currentBook.locations || !currentBook.locations.total) {
        console.log("[PAGE_INFO] Book locations not ready yet");
        return;
      }

      // Use percentage-based calculation which is more reliable
      const percentage = currentBook.locations.percentageFromCfi(currentCfi);
      const totalPagesEstimate =
        Math.ceil(currentBook.locations.total / 2) || 100;
      const estimatedCurrentPage = Math.max(
        1,
        Math.ceil(percentage * totalPagesEstimate)
      );

      console.log("[PAGE_INFO] Calculated values:", {
        currentCfi,
        percentage: percentage * 100,
        estimatedCurrentPage,
        totalPagesEstimate,
      });

      setCurrentPage(estimatedCurrentPage);
      setTotalPages(totalPagesEstimate);
      setCurrentPercentage(Math.round(percentage * 100)); // Set percentage here

      // In scrolled mode, check if scroll position changed after updatePageInfo
      if (readingMode === "scrolled") {
        const iframe = currentRendition.getContents()[0];
        if (iframe && iframe.window) {
          console.log(
            "[PAGE_INFO] Scroll position after updatePageInfo:",
            iframe.window.scrollY
          );
        }
      }
    } catch (error) {
      console.error("Error updating page info:", error);

      // Set default values if calculation fails
      setCurrentPage(1);
      setTotalPages(100);
    }
  };

  // Save reading progress
  const saveReadingProgress = async (syncToDatabase = false) => {
    if (!bookData) return;

    try {
      let newCFI, newPercentage;

      if (readingMode === "scrolled" && scrollCurrentLocation) {
        // Use scroll manager location
        console.log("[PROGRESS] Saving progress from scroll manager");
        newCFI =
          scrollCurrentLocation.start?.cfi ||
          scrollCurrentLocation.cfi ||
          currentCFI;
        newPercentage = Math.round(scrollReadingProgress);

        // If we still don't have a CFI, try to generate one from the current location
        if (!newCFI && scrollCurrentLocation.href && book) {
          try {
            // Generate a basic CFI for the start of the section
            const sectionIndex = scrollCurrentLocation.index;
            if (sectionIndex !== undefined && sectionIndex >= 0) {
              // Create a basic CFI pointing to the start of the section (consistent with CustomScrollManager)
              newCFI = `/6/${(sectionIndex + 1) * 2}[id${sectionIndex}]!/0`;
              console.log(
                "[PROGRESS] Generated CFI from section index:",
                newCFI
              );
            }
          } catch (error) {
            console.warn("[PROGRESS] Failed to generate CFI:", error);
            newCFI = currentCFI; // Fallback to current CFI
          }
        }
      } else if (rendition) {
        // Use regular rendition location
        console.log("[PROGRESS] Saving progress from rendition");

        // Guard against invalid location data
        if (
          !rendition.location ||
          !rendition.location.start ||
          !rendition.location.start.cfi
        ) {
          console.log(
            `[DEBUG] Cannot save progress - invalid location data:`,
            rendition.location
          );
          return;
        }

        newCFI = rendition.location.start.cfi;

        // Use book instance instead of rendition.book which might be undefined
        const bookInstance = book || rendition.book;
        if (bookInstance && bookInstance.locations) {
          newPercentage = Math.round(
            bookInstance.locations.percentageFromCfi(newCFI) * 100
          );
        } else {
          console.log(
            "[PROGRESS] Book locations not available, using current percentage"
          );
          newPercentage = currentPercentage || 0;
        }
      } else {
        console.log("[PROGRESS] No valid location source available");
        return;
      }

      // Guard against invalid CFI
      if (!newCFI || newCFI === "undefined") {
        console.log(`[DEBUG] Cannot save progress - invalid CFI:`, newCFI);
        return;
      }

      console.log(
        `[DEBUG] Saving progress for ${
          bookData.title
        }: ${newPercentage}% at CFI: ${newCFI.substring(0, 50)}...`
      );

      // For completed books, save the CFI that corresponds to 100% instead of current position
      let cfiToSave = newCFI;
      const bookInstance = book || rendition.book;
      if (newPercentage >= 100 && bookInstance && bookInstance.locations) {
        try {
          const lastCFI = bookInstance.locations.cfiFromPercentage(1.0);
          if (lastCFI) {
            cfiToSave = lastCFI;
            console.log(
              `[DEBUG] Book completed, using last CFI: ${lastCFI.substring(
                0,
                50
              )}...`
            );
          }
        } catch (error) {
          console.error(
            "Could not get CFI for 100%, using current CFI:",
            error
          );
        }
      }

      // Update progress in IndexedDB
      await bookStorageDB.updateReadingProgress(
        bookData.isbn,
        newPercentage,
        cfiToSave
      );

      if (newPercentage >= 100) {
        console.log(`Book "${bookData.title}" completed!`);
      }

      // Store current CFI and percentage in state for immediate access
      console.log(
        "[CFI] Setting currentCFI from saveReadingProgress:",
        cfiToSave
      );
      setCurrentCFI(cfiToSave);
    } catch (error) {
      console.error("Error saving reading progress:", error);
    }
  };

  // Toggle theme
  const toggleTheme = async () => {
    const newThemeState = !isDarkTheme;
    setIsDarkTheme(newThemeState);
    setisDarkClicked(1);

    // Save to IndexedDB
    try {
      await userPreferencesDB.setTheme(newThemeState ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme setting:", error);
    }
  };

  // Update font size
  const updateFontSize = async (newSize) => {
    console.log(
      "[FONT SIZE] Updating font size to:",
      newSize,
      "Current reading mode:",
      readingMode
    );
    setFontSize(newSize);

    // Save to IndexedDB
    try {
      await userPreferencesDB.setFontSize(newSize);
    } catch (error) {
      console.error("Error saving font size setting:", error);
    }
  };

  // Update font family
  const updateFontFamily = async (newFont) => {
    console.log("Updating font family to:", newFont);
    setFontFamily(newFont);

    // Apply font immediately if rendition is available
    if (rendition) {
      console.log("Applying font immediately:", newFont);

      // First inject font definitions
      injectFontDefinitions(rendition);

      const fontWithFallback = getFontWithFallback(newFont);

      // Get all iframes in the rendition and inject CSS directly
      const iframes = rendition.manager.views._views;

      iframes.forEach((view) => {
        if (view && view.iframe && view.iframe.contentDocument) {
          const doc = view.iframe.contentDocument;

          // Remove any existing font override style
          const existingStyle = doc.getElementById("font-override-style");
          if (existingStyle) {
            existingStyle.remove();
          }

          // Create new style element with font override
          const style = doc.createElement("style");
          style.id = "font-override-style";
          style.textContent = `
            * {
              font-family: ${fontWithFallback} !important;
            }
            body, p, div, span, h1, h2, h3, h4, h5, h6 {
              font-family: ${fontWithFallback} !important;
            }
          `;

          // Inject the style into the iframe head
          if (doc.head) {
            doc.head.appendChild(style);
            console.log("Font style injected immediately into iframe");
          }
        }
      });
    }

    // Save to IndexedDB
    try {
      await userPreferencesDB.setFontFamily(newFont);
    } catch (error) {
      console.error("Error saving font family setting:", error);
    }
  };

  // Function to set up rendition event listeners
  const setupRenditionEventListeners = (rendition) => {
    // Track current chapter and update page info
    rendition.on("locationChanged", (location) => {
      console.log("[LOCATION] locationChanged event fired");
      console.log("[LOCATION] - Raw location object:", location);

      // Get the actual current location from rendition if the event location is incomplete
      let actualLocation = location;
      if (!location.start?.cfi) {
        try {
          actualLocation = rendition.currentLocation();
          console.log(
            "[LOCATION] - Got actual location from rendition:",
            actualLocation
          );
        } catch (error) {
          console.warn("[LOCATION] - Could not get current location:", error);
        }
      }

      console.log(
        "[LOCATION] - location.start.cfi:",
        actualLocation?.start?.cfi
      );
      console.log("[LOCATION] - location.end.cfi:", actualLocation?.end?.cfi);
      console.log(
        "[LOCATION] - location.start.href:",
        actualLocation?.start?.href
      );
      console.log(
        "[LOCATION] - Current state currentCFI before update:",
        currentCFI
      );
      console.log(
        "[LOCATION] - About to call updatePageInfo and chapter detection"
      );

      // Skip updatePageInfo if we're currently updating reading mode OR in scrolled mode
      if (!isUpdatingReadingMode && readingMode === "paginated") {
        updatePageInfo(rendition, book);
      } else if (isUpdatingReadingMode) {
        console.log(
          "[LOCATION] Skipping updatePageInfo - reading mode is being updated"
        );
      } else if (readingMode === "scrolled") {
        console.log("[LOCATION] Skipping updatePageInfo - in scrolled mode");
      }

      // Update current chapter with enhanced detection
      updateCurrentChapter(actualLocation, book);

      // Update current CFI - only in paginated mode to avoid jumping in scrolled mode
      if (readingMode === "paginated") {
        try {
          const currentLocation = rendition.currentLocation();
          const newCFI =
            currentLocation?.start?.cfi ||
            actualLocation?.start?.cfi ||
            actualLocation?.start;
          if (newCFI) {
            console.log(
              "[CFI] Setting currentCFI from currentLocation (paginated):",
              newCFI
            );
            setCurrentCFI(newCFI);
          } else {
            console.log(
              "[CFI] Skipping undefined/null CFI from locationChanged, location:",
              location
            );
          }
        } catch (error) {
          console.warn(
            "[CFI] Error getting current location, falling back to location.start:",
            error
          );
          const newCFI = location.start.cfi || location.start;
          if (newCFI) {
            console.log(
              "[CFI] Setting currentCFI from locationChanged fallback (paginated):",
              newCFI
            );
            setCurrentCFI(newCFI);
          }
        }
      } else {
        console.log(
          "[CFI] Skipping CFI update in scrolled mode to prevent jumping"
        );
      }

      // Only reapply font settings in paginated mode, but skip during chapter navigation
      // In scrolled mode, avoid frequent font reapplication to prevent jumping
      const actualFlow = rendition?.settings?.flow;
      console.log("[LOCATION] Font application decision:", {
        readingMode,
        actualFlow,
        isNavigatingToChapter,
      });

      // Use actual rendition flow instead of state to avoid sync issues
      if (actualFlow === "paginated" && !isNavigatingToChapter) {
        console.log(
          "[LOCATION] Applying font settings due to location change in paginated mode"
        );
        debouncedApplyFontSettings();
      } else if (actualFlow === "scrolled" && isNavigatingToChapter) {
        console.log(
          "[LOCATION] Skipping font application during chapter navigation in scrolled mode"
        );
      } else if (actualFlow === "scrolled") {
        console.log(
          "[LOCATION] Skipping font application in scrolled mode to prevent jumping"
        );
      } else {
        console.log(
          "[LOCATION] Skipping font application - unknown flow or during navigation"
        );
      }

      // Reset swipe state when location changes (e.g., chapter navigation)
      console.log("[SWIPE] Location changed - resetting swipe state");
      resetSwipeState();
    });
  };

  // Update reading mode
  const updateReadingMode = async (newMode) => {
    console.log(
      "[READING_MODE] updateReadingMode called - changing from",
      readingMode,
      "to:",
      newMode
    );
    setIsUpdatingReadingMode(true);
    setIsNavigatingToChapter(true); // Prevent scroll restoration during mode switch

    // Save to IndexedDB
    try {
      await userPreferencesDB.setReadingMode(newMode);
    } catch (error) {
      console.error("Error saving reading mode setting:", error);
    }

    // Store current location before switching modes
    let currentLocation = null;
    try {
      if (readingMode === "scrolled" && scrollCurrentLocation) {
        // Get location from scroll manager
        currentLocation = scrollCurrentLocation;
        console.log(
          "[READING_MODE] Got location from scroll manager:",
          currentLocation
        );

        // For switching to paginated mode, we need to ensure the location format is correct
        // The scroll manager might return a different format than what paginated expects
        if (newMode === "paginated" && currentLocation) {
          // Extract CFI if available, or use the location as-is
          let cfiToUse = null;
          if (currentLocation.start?.cfi) {
            cfiToUse = currentLocation.start.cfi;
          } else if (currentLocation.cfi) {
            cfiToUse = currentLocation.cfi;
          }

          // Convert custom CFI format to standard ePub.js format
          if (cfiToUse && typeof cfiToUse === "string") {
            // Our format: /6/16[id7]!/0
            // ePub.js expects: epubcfi(/6/16!/4/2/1:0)
            try {
              // Try to use the section index directly instead of CFI
              if (currentLocation.index !== undefined) {
                console.log(
                  "[READING_MODE] Using section index for paginated mode:",
                  currentLocation.index
                );
                // Don't use CFI, let the rendition navigate to the section by index
                currentLocation = null; // Will fall back to using section navigation
              } else {
                currentLocation = cfiToUse;
              }
            } catch (error) {
              console.warn("[READING_MODE] CFI conversion failed:", error);
              currentLocation = null; // Will fall back to beginning
            }
          }

          console.log(
            "[READING_MODE] Converted scroll location for paginated mode:",
            currentLocation
          );
        }
      } else if (rendition) {
        // Get location from regular rendition
        currentLocation = rendition.currentLocation();
        console.log(
          "[READING_MODE] Got location from rendition:",
          currentLocation
        );

        // For switching to scrolled mode, we might need to format the location differently
        if (newMode === "scrolled" && currentLocation) {
          // The scroll manager expects a location object with start/end
          if (typeof currentLocation === "string") {
            // If it's just a CFI string, wrap it in the expected format
            currentLocation = {
              start: { cfi: currentLocation },
              end: { cfi: currentLocation },
            };
          }
          console.log(
            "[READING_MODE] Converted paginated location for scroll mode:",
            currentLocation
          );
        }
      }
    } catch (error) {
      console.warn("Could not get current location:", error);

      // Fallback: try to use the current CFI if available
      if (!currentLocation && currentCFI) {
        console.log("[READING_MODE] Using fallback CFI:", currentCFI);

        // Check if CFI is in custom format (contains [id...])
        const isCustomCFI =
          currentCFI.includes("[id") && currentCFI.includes("]");

        if (newMode === "paginated" && !isCustomCFI) {
          // Only use CFI for paginated mode if it's in standard format
          currentLocation = currentCFI;
        } else if (newMode === "scrolled") {
          currentLocation = {
            start: { cfi: currentCFI },
            end: { cfi: currentCFI },
          };
        } else if (newMode === "paginated" && isCustomCFI) {
          console.log(
            "[READING_MODE] Custom CFI detected, skipping fallback for paginated mode"
          );
          currentLocation = null; // Will use default display
        }
      }
    }

    // Update the reading mode state - this will trigger the custom scroll manager hook
    setReadingMode(newMode);

    // If switching to paginated mode, we need to recreate the rendition
    if (newMode === "paginated" && book && viewerRef.current) {
      console.log(
        "[READING_MODE] Switching to paginated mode, recreating rendition"
      );

      // If we're coming from scrolled mode, ensure we have the correct location format
      if (readingMode === "scrolled" && scrollReadingProgress !== undefined) {
        // Update the current percentage to match the scroll reading progress
        setCurrentPercentage(Math.round(scrollReadingProgress * 100));

        // If we have a location from the scroll manager, ensure it's properly formatted
        if (currentLocation && typeof currentLocation === "object") {
          console.log(
            "[READING_MODE] Formatting scroll location for paginated mode:",
            currentLocation
          );

          // Extract CFI if available
          if (currentLocation.start?.cfi) {
            currentLocation = currentLocation.start.cfi;
          } else if (currentLocation.cfi) {
            currentLocation = currentLocation.cfi;
          }

          console.log(
            "[READING_MODE] Formatted location for paginated mode:",
            currentLocation
          );
        }
      }

      // Destroy current rendition if it exists
      if (rendition) {
        try {
          rendition.destroy();
        } catch (error) {
          console.warn("Error destroying rendition:", error);
        }
      }

      // Clear the viewer element
      const viewerElement = viewerRef.current;
      if (viewerElement) {
        viewerElement.innerHTML = "";
      }

      // Create new paginated rendition
      try {
        // Configure rendition options for paginated mode
        const renditionOptions = {
          width: `${window.innerWidth}px`,
          height: "90vh",
          ignoreClass: "annotator-hl",
          manager: "default",
          flow: "paginated",
        };

        console.log(
          "[READING_MODE] Creating new paginated rendition with options:",
          renditionOptions
        );
        const newRendition = book.renderTo(viewerElement, renditionOptions);

        // Apply font styles
        injectFontDefinitions(newRendition);

        // Apply theme and font styles
        const fontWithFallback = getFontWithFallback(fontFamily);
        newRendition.themes.default({
          body: {
            "font-family": `${fontWithFallback} !important`,
            "font-size": `${fontSize}em !important`,
            "line-height": "1.6 !important",
            color: isDarkTheme ? "#e0e0e0 !important" : "#333 !important",
            "background-color": isDarkTheme ? "#000000" : "#ffffff !important",
          },
        });

        console.log(
          "[READING_MODE] About to display book at location:",
          currentLocation,
          "- Mode: paginated"
        );

        // If we're coming from scrolled mode, use section index instead of CFI
        if (
          readingMode === "scrolled" &&
          scrollCurrentLocation &&
          scrollCurrentLocation.index !== undefined
        ) {
          console.log(
            "[READING_MODE] Using section index for paginated mode:",
            scrollCurrentLocation.index
          );
          try {
            // Navigate to the section by index (more reliable than CFI conversion)
            const sectionIndex = scrollCurrentLocation.index;
            if (book && book.spine && book.spine.items[sectionIndex]) {
              const section = book.spine.items[sectionIndex];
              console.log(
                "[READING_MODE] Navigating to section:",
                section.href
              );
              await newRendition.display(section.href);
            } else {
              console.log(
                "[READING_MODE] Section index out of range, using beginning"
              );
              await newRendition.display();
            }
          } catch (error) {
            console.error("[READING_MODE] Error navigating to section:", error);
            console.log("[READING_MODE] Falling back to beginning");
            await newRendition.display();
          }
        }
        // Otherwise use the currentLocation if available
        else if (currentLocation) {
          console.log(
            "[READING_MODE] Displaying at specific location:",
            currentLocation
          );
          await newRendition.display(currentLocation);
        }
        // Fallback to beginning if no location is available
        else {
          console.log(
            "[READING_MODE] No location provided, displaying from beginning"
          );
          await newRendition.display();
        }

        console.log(
          "[READING_MODE] Book displayed successfully in paginated mode"
        );

        // Set up event listeners
        setupRenditionEventListeners(newRendition);

        // Update state
        setRendition(newRendition);

        // Ensure proper sizing after mode change
        setTimeout(() => {
          newRendition.resize(`${window.innerWidth}px`, "90vh");
          updatePageInfo(newRendition, book);
          // Reset the updating flags after everything is complete
          setIsUpdatingReadingMode(false);
          setIsNavigatingToChapter(false);
        }, 100);

        console.log("Successfully recreated rendition with new reading mode");
      } catch (error) {
        console.error("Error recreating rendition:", error);
        setIsUpdatingReadingMode(false);
        setIsNavigatingToChapter(false);
      }
    } else if (newMode === "scrolled") {
      // When switching to scrolled mode, the custom scroll manager hook will handle everything
      console.log(
        "[READING_MODE] Switching to scrolled mode - custom scroll manager will handle initialization"
      );

      // Clear the viewer element for the custom scroll manager
      const viewerElement = viewerRef.current;
      if (viewerElement) {
        viewerElement.innerHTML = "";
      }

      // Destroy current rendition if it exists
      if (rendition) {
        try {
          rendition.destroy();
        } catch (error) {
          console.warn("Error destroying rendition:", error);
        }
        setRendition(null);
      }

      // If we have a current location, save it for the scroll manager to restore
      if (currentLocation) {
        console.log(
          "[READING_MODE] Saving location for scroll manager:",
          currentLocation
        );

        // Get the current CFI from the rendition
        let cfi = null;
        try {
          if (rendition && rendition.currentLocation) {
            const loc = rendition.currentLocation();
            if (loc && loc.start && loc.start.cfi) {
              cfi = loc.start.cfi;
            } else if (typeof loc === "string") {
              cfi = loc;
            } else if (currentCFI) {
              cfi = currentCFI;
            }
          } else if (currentCFI) {
            cfi = currentCFI;
          }
        } catch (error) {
          console.error("[READING_MODE] Error getting current CFI:", error);
          if (currentCFI) {
            cfi = currentCFI;
          }
        }

        console.log("[READING_MODE] Current CFI for scroll manager:", cfi);

        // Try to extract the section index from the CFI
        let sectionIndex = null;
        if (cfi && book && book.spine) {
          try {
            console.log("[READING_MODE] Parsing CFI:", cfi);

            // Try multiple CFI formats
            // Format: epubcfi(/6/22!/4[8IL20-...]/6/1:0) - extract spine position
            let match = cfi.match(/epubcfi\(\/6\/(\d+)!/);
            if (match && match[1]) {
              const spinePos = parseInt(match[1], 10);
              console.log(
                "[READING_MODE] Extracted spine position from CFI:",
                spinePos
              );

              // Find the corresponding section index
              const spineItems = book.spine.spineItems;
              if (spineItems && spineItems.length > 0) {
                console.log(
                  "[READING_MODE] Total spine items:",
                  spineItems.length
                );

                // For this book format, spine positions start at 2 and increment by 2
                // So spine position 22 = section index 10 (22-2)/2 = 10
                sectionIndex = Math.floor((spinePos - 2) / 2);

                // Validate and adjust if needed
                if (sectionIndex < 0) {
                  sectionIndex = 0;
                } else if (sectionIndex >= spineItems.length) {
                  // Try alternative calculations
                  sectionIndex = spinePos - 2; // Direct offset
                  if (sectionIndex >= spineItems.length) {
                    sectionIndex = Math.floor(spinePos / 2) - 1; // Another calculation
                  }
                  if (sectionIndex >= spineItems.length) {
                    sectionIndex = spineItems.length - 1; // Fallback to last section
                  }
                }

                console.log(
                  "[READING_MODE] Calculated section index:",
                  sectionIndex
                );
                console.log(
                  "[READING_MODE] Section href:",
                  spineItems[sectionIndex]?.href
                );
              }
            }

            // Fallback: try to use the book's spine API directly
            if (
              sectionIndex === null ||
              sectionIndex < 0 ||
              sectionIndex >= book.spine.spineItems.length
            ) {
              try {
                const section = book.spine.get(cfi);
                if (section) {
                  sectionIndex = section.index;
                  console.log(
                    "[READING_MODE] Resolved section index via spine.get():",
                    sectionIndex
                  );
                }
              } catch (spineError) {
                console.error(
                  "[READING_MODE] Error using spine.get():",
                  spineError
                );
              }
            }

            // Final validation
            if (sectionIndex !== null) {
              sectionIndex = Math.max(
                0,
                Math.min(book.spine.spineItems.length - 1, sectionIndex)
              );
              console.log(
                "[READING_MODE] Final validated section index:",
                sectionIndex
              );
            }
          } catch (error) {
            console.error(
              "[READING_MODE] Error extracting section index:",
              error
            );
          }
        }

        // Format the progress data properly for the scroll manager
        let formattedProgress = {
          location: currentLocation,
          percentage: currentPercentage / 100, // Convert percentage to decimal
          chapter: currentChapter,
          scrollPosition:
            window.pageYOffset || document.documentElement.scrollTop,
          cfi: cfi,
        };

        // If we found a section index, add it to the progress data
        if (sectionIndex !== null) {
          formattedProgress.sectionIndex = sectionIndex;
        }

        console.log(
          "[READING_MODE] Formatted progress for scroll manager:",
          formattedProgress
        );

        // Update the saved progress data so the scroll manager can use it
        setSavedProgressData(formattedProgress);

        // Also set it directly on the scroll manager if it's available
        if (setSavedProgress) {
          setSavedProgress(formattedProgress);
        }
      }

      // Reset flags after a delay to allow the scroll manager to initialize and restore progress
      setTimeout(async () => {
        // Try to restore progress if we have a current location and the scroll manager is ready
        if (restoreProgress) {
          console.log(
            "[READING_MODE] Attempting to restore progress in scroll manager"
          );
          try {
            // The restoreProgress function will use the savedProgress that was set earlier
            await restoreProgress();

            // After restoring progress, update the current percentage to match
            if (scrollReadingProgress !== undefined) {
              setCurrentPercentage(Math.round(scrollReadingProgress * 100));
            }
          } catch (error) {
            console.warn("Error restoring progress in scroll manager:", error);
          }
        }
        setIsUpdatingReadingMode(false);
        setIsNavigatingToChapter(false);
      }, 2000); // Increased timeout to allow for scroll manager initialization
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const root = document.getElementById("root");
    if (root) {
      if (isFullscreen) {
        document.exitFullscreen();
      } else {
        root.requestFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Show loading overlay instead of blocking entire component render
  const showLoadingOverlay =
    loading ||
    !preferencesLoaded ||
    !initialFontLoadComplete ||
    (readingMode === "scrolled" && !scrollManagerInitialized);

  let loadingOverlayMessage = loadingMessage;
  if (!preferencesLoaded) {
    loadingOverlayMessage = "Loading preferences...";
  } else if (!initialFontLoadComplete) {
    loadingOverlayMessage = "Loading fonts...";
  } else if (readingMode === "scrolled" && !scrollManagerInitialized) {
    loadingOverlayMessage = "Initializing scroll reader...";
  }

  // Error state - book not found
  if (!bookData) {
    return (
      <div className="addBook-error-handle">
        <p>Sorry, we don't have this book.</p>
        <div>
          <input type="file" accept=".epub" />
          <button>Add to Collection</button>
        </div>
      </div>
    );
  }

  // Render the reader
  return (
    <div
      className={`${
        readingMode === "paginated" ? "overflow-y-hidden" : ""
      } main-book-reader-container h-lvh ${isDarkTheme ? "dark" : "default"}`}
    >
      {/* Text selection UI - independent of titlebar opacity */}
      <TextSelectionCoordinates
        bookValue={bookValue}
        book={book}
        updatePageInfo={() => {
          if (readingMode === "paginated") {
            updatePageInfo(rendition, book);
          }
        }}
        rendition={rendition}
        saveReadingProgress={saveReadingProgress}
        setForceUpdate={setForceUpdate}
      />
      <div
        className={`titlebar reader-controls ${
          showTitleBar || (isMobile && mobileHoverMode) ? "" : "opacity-low"
        } ${isMobile && mobileHoverMode ? "mobile-hover-active" : ""} ${
          readingMode === "scrolled" ? "fixed w-full" : ""
        } transition-opacity duration-300`}
      >
        <div className="desktop-reader-menu">
          <ReaderMenu
            book={book}
            bookValue={bookValue}
            saveReadingProgress={saveReadingProgress}
            rendition={rendition}
            selectedColor={null}
            currentCFI={currentCFI}
            currentChapter={currentChapter}
            setIsNavigatingToChapter={setIsNavigatingToChapter}
            onChapterSelect={readingMode === "scrolled" ? navigateToHref : null}
          />
        </div>

        <div id="metainfo">
          <span id="book-title">{bookData.author}</span>
          <span id="title-separator">&nbsp;&nbsp;–&nbsp;&nbsp;</span>
          <span id="chapter-title">{bookData.title}</span>
        </div>

        <div id="title-controls">
          {/* Mobile-only: Add ReaderMenu icons */}
          <div className="mobile-reader-icons">
            <ReaderMenu
              book={book}
              bookValue={bookValue}
              saveReadingProgress={saveReadingProgress}
              rendition={rendition}
              selectedColor={null}
              currentCFI={currentCFI}
              currentChapter={currentChapter}
              setIsNavigatingToChapter={setIsNavigatingToChapter}
              onChapterSelect={
                readingMode === "scrolled" ? navigateToHref : null
              }
            />
          </div>

          <Button
            isIconOnly
            onClick={toggleTheme}
            variant="light"
            className="text-foreground hover:bg-default-100 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            <FiMoon className="w-4 h-4 text-black" />
          </Button>
          <EpubReaderSettings
            rendition={rendition}
            fontSize={fontSize}
            fontFamily={fontFamily}
            readingMode={readingMode}
            updateFontSize={updateFontSize}
            updateFontFamily={updateFontFamily}
            updateReadingMode={updateReadingMode}
          />
          <Button
            isIconOnly
            onClick={() => setShowReadingProgress(!showReadingProgress)}
            variant="light"
            className="text-foreground hover:bg-default-100 transition-all duration-200"
            aria-label="Toggle reading progress"
          >
            <BarChart3 className="w-4 h-4 text-black" />
          </Button>
          <Button
            isIconOnly
            onClick={toggleFullscreen}
            variant="light"
            className="text-foreground hover:bg-default-100 transition-all duration-200"
            aria-label="Toggle fullscreen"
          >
            <AiOutlineFullscreen className="w-4 h-4 text-black" />
          </Button>
        </div>
      </div>

      <div className={isDarkTheme ? "dark" : "default"}>
        <div
          id="divider"
          className={
            !book || readingMode === "scrolled"
              ? "hidden"
              : `show ${isDarkTheme ? "lightDivider" : ""}`
          }
        />
        <div
          id="viewer"
          ref={viewerRef}
          className={`epub-viewer ${isFullscreen ? "h-lvh" : ""}`}
        />

        {/* Navigation buttons - hidden on mobile devices since swipe is available and in vertical scroll mode */}
        {!isMobile && readingMode === "paginated" && (
          <>
            <button
              className={
                !book
                  ? "hidden"
                  : `prev reset-btn nav-button ${
                      isDarkTheme ? "light-button" : ""
                    }`
              }
              onClick={backBtn}
              aria-label="Previous page"
            >
              <GrPrevious />
            </button>
            <button
              className={
                !book
                  ? "hidden"
                  : `next reset-btn nav-button ${
                      isDarkTheme ? "light-button" : ""
                    }`
              }
              onClick={nextBtn}
              aria-label="Next page"
            >
              <GrNext />
            </button>
          </>
        )}
      </div>
      <div
        className={`absolute bottom-0 left-3 transition-opacity duration-300 ${
          showTitleBar ? "" : "opacity-low"
        }`}
      >
        <div className="flex flex-col items-start">
          <span>
            {currentPage} of {totalPages}
          </span>
        </div>
      </div>

      {/* Reading Progress Panel */}
      {showReadingProgress && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-end pt-20 pr-4"
          onClick={() => setShowReadingProgress(false)}
        >
          <div
            className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Reading Progress
              </h3>
              <button
                onClick={() => setShowReadingProgress(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close reading progress"
              >
                <svg
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <ReadingProgress
              currentPage={currentPage}
              totalPages={totalPages}
              currentPercentage={currentPercentage}
              currentChapter={currentChapter}
              book={book}
              rendition={rendition}
              isUpdatingReadingMode={isUpdatingReadingMode}
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col justify-center items-center gap-4 bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
          <CircularProgress size="lg" color="default" aria-label="Loading" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {loadingOverlayMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please wait while we prepare your book...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EpubReader;
