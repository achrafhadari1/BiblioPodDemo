"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocation } from "react-router-dom";
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
import { userPreferencesDB } from "../../utils/userPreferences";

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

  // Minimum swipe distance (in px) and debounce time - optimized for mobile
  const minSwipeDistance = 30; // Reduced from 50 to 30 for better mobile responsiveness
  const swipeDebounceTime = 100; // ms - reduced for better responsiveness

  // Refs
  const titleBarTimerRef = useRef(null);
  const viewerRef = useRef(null);
  const pageCalculationTimeoutRef = useRef(null);

  // Helper function to reset swipe state
  const resetSwipeState = useCallback(() => {
    isSwipingRef.current = false;
    touchStartRef.current = null;
    touchStartYRef.current = null;
    touchEndRef.current = null;
  }, []);

  // Detect mobile device on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };

    // Handle orientation change and resize events
    const handleOrientationChange = () => {
      console.log(
        "[ORIENTATION] Orientation/resize change detected, resetting touch state"
      );
      // Reset touch/swipe state when orientation changes
      resetSwipeState();
      // Clear any ongoing hover mode
      setMobileHoverMode(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Update mobile detection
      checkMobile();
    };

    // Handle specific orientation change events (mobile devices)
    const handleOrientationChangeEvent = () => {
      console.log("[ORIENTATION] Specific orientationchange event detected");
      // Add a small delay to allow the viewport to settle after orientation change
      setTimeout(() => {
        handleOrientationChange();
        // Brief visual feedback for orientation change (optional)
        if (isMobile && navigator.vibrate) {
          navigator.vibrate(30); // Short vibration to indicate orientation change handled
        }
      }, 100);
    };

    checkMobile();

    // Listen for both resize and orientation change events
    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChangeEvent);

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener(
        "orientationchange",
        handleOrientationChangeEvent
      );
    };
  }, [resetSwipeState]);

  // Force re-render when reading mode changes to update UI elements
  useEffect(() => {
    // Force update to ensure navigation buttons and divider visibility updates
    setForceUpdate({});
  }, [readingMode]);

  // Navigation functions (defined first to avoid dependency issues)
  const nextBtn = useCallback(() => {
    if (!rendition) return;

    if (readingMode === "scrolled") {
      // In scrolled mode, scroll down by viewport height
      const iframe = rendition.getContents()[0];
      if (iframe && iframe.window) {
        iframe.window.scrollBy(0, iframe.window.innerHeight * 0.8);
      }
    } else {
      // In paginated mode, go to next page
      rendition.next();
      updatePageInfo(rendition, book);
    }
  }, [rendition, book, readingMode]);

  const backBtn = useCallback(() => {
    if (!rendition) return;

    if (readingMode === "scrolled") {
      // In scrolled mode, scroll up by viewport height
      const iframe = rendition.getContents()[0];
      if (iframe && iframe.window) {
        iframe.window.scrollBy(0, -iframe.window.innerHeight * 0.8);
      }
    } else {
      // In paginated mode, go to previous page
      rendition.prev();
      updatePageInfo(rendition, book);
    }
  }, [rendition, book, readingMode]);

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
        targetElement: e.target.tagName,
        readingMode,
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

      // Ensure we have valid touch data
      if (!e.targetTouches || e.targetTouches.length === 0) {
        console.log("[SWIPE] No valid touch data available");
        return;
      }

      const startX = e.targetTouches[0].clientX;
      const startY = e.targetTouches[0].clientY;

      // Validate coordinates
      if (
        typeof startX !== "number" ||
        typeof startY !== "number" ||
        isNaN(startX) ||
        isNaN(startY) ||
        startX < 0 ||
        startX > window.innerWidth ||
        startY < 0 ||
        startY > window.innerHeight
      ) {
        console.log("[SWIPE] Invalid touch coordinates:", { startX, startY });
        return;
      }

      touchStartRef.current = startX;
      touchStartYRef.current = startY;
      touchEndRef.current = null;
      isSwipingRef.current = true;

      console.log("[SWIPE] Touch start detected", {
        startX,
        startY,
        readingMode,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
    },
    [handleDoubleTap, readingMode]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!touchStartRef.current || !isSwipingRef.current) return;

      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;
      touchEndRef.current = currentX;

      // Calculate distances
      const horizontalDistance = Math.abs(currentX - touchStartRef.current);
      const verticalDistance = touchStartYRef.current
        ? Math.abs(currentY - touchStartYRef.current)
        : 0;

      // Determine if this is a horizontal or vertical gesture
      const isHorizontalGesture =
        horizontalDistance > verticalDistance && horizontalDistance > 10;
      const isVerticalGesture =
        verticalDistance > horizontalDistance && verticalDistance > 10;

      if (readingMode === "paginated") {
        // In paginated mode, prevent scrolling for horizontal swipes but allow vertical scrolling for UI elements
        if (isHorizontalGesture) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        // In scrolled mode, prevent horizontal swipes but allow vertical scrolling
        if (isHorizontalGesture) {
          e.preventDefault();
          e.stopPropagation();
        }
        // Allow vertical scrolling to continue naturally for scrolled mode
      }

      console.log("[SWIPE] Touch move detected", {
        currentX,
        currentY,
        horizontalDistance,
        verticalDistance,
        isHorizontalGesture,
        isVerticalGesture,
        readingMode,
      });
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

      // Validate end coordinates
      if (
        endX &&
        (typeof endX !== "number" ||
          isNaN(endX) ||
          endX < 0 ||
          endX > window.innerWidth)
      ) {
        console.log("[SWIPE] Invalid touch end coordinates:", { endX });
        cleanup();
        return;
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

  // Attach touch event listeners - improved approach using epub.js events
  useEffect(() => {
    if (!book || !isMobile || !rendition) return;

    console.log("[SWIPE] Attaching touch event listeners for mobile", {
      currentChapter,
      hasRendition: !!rendition,
      isMobile,
    });

    // Reset touch state when re-attaching listeners (e.g., after orientation change)
    resetSwipeState();

    // Use the viewer element as the primary target
    const viewer = viewerRef.current || document.getElementById("viewer");

    if (!viewer) {
      console.log("[SWIPE] Viewer element not found, skipping touch setup");
      return;
    }

    // Add event listeners to the viewer container with capture
    viewer.addEventListener("touchstart", onTouchStart, {
      passive: false,
      capture: true,
    });
    viewer.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    viewer.addEventListener("touchend", onTouchEnd, {
      passive: false,
      capture: true,
    });

    console.log("[SWIPE] Added touch listeners to viewer element");

    // Enhanced iframe content handling using epub.js events
    const setupIframeListeners = () => {
      try {
        // Use epub.js's contents to access iframe documents
        const contents = rendition.getContents();

        contents.forEach((content, index) => {
          try {
            if (content.document) {
              // Remove any existing listeners first to avoid duplicates
              content.document.removeEventListener("touchstart", onTouchStart, {
                capture: true,
              });
              content.document.removeEventListener("touchmove", onTouchMove, {
                capture: true,
              });
              content.document.removeEventListener("touchend", onTouchEnd, {
                capture: true,
              });

              // Add touch listeners to each iframe's document
              content.document.addEventListener("touchstart", onTouchStart, {
                passive: false,
                capture: true,
              });
              content.document.addEventListener("touchmove", onTouchMove, {
                passive: false,
                capture: true,
              });
              content.document.addEventListener("touchend", onTouchEnd, {
                passive: false,
                capture: true,
              });

              console.log(
                `[SWIPE] Added touch listeners to iframe content ${index}`
              );
            }
          } catch (e) {
            console.log(
              `[SWIPE] Could not access iframe content ${index}:`,
              e.message
            );
          }
        });

        // Fallback: also try to add listeners to any iframe elements directly
        const iframes = viewer.querySelectorAll("iframe");
        iframes.forEach((iframe, index) => {
          try {
            if (iframe.contentDocument) {
              // Remove any existing listeners first
              iframe.contentDocument.removeEventListener(
                "touchstart",
                onTouchStart,
                { capture: true }
              );
              iframe.contentDocument.removeEventListener(
                "touchmove",
                onTouchMove,
                { capture: true }
              );
              iframe.contentDocument.removeEventListener(
                "touchend",
                onTouchEnd,
                { capture: true }
              );

              iframe.contentDocument.addEventListener(
                "touchstart",
                onTouchStart,
                {
                  passive: false,
                  capture: true,
                }
              );
              iframe.contentDocument.addEventListener(
                "touchmove",
                onTouchMove,
                {
                  passive: false,
                  capture: true,
                }
              );
              iframe.contentDocument.addEventListener("touchend", onTouchEnd, {
                passive: false,
                capture: true,
              });

              console.log(
                `[SWIPE] Added fallback touch listeners to iframe ${index}`
              );
            }
          } catch (e) {
            console.log(
              `[SWIPE] Could not access fallback iframe ${index}:`,
              e.message
            );
          }
        });
      } catch (e) {
        console.log("[SWIPE] Error setting up iframe listeners:", e.message);
      }
    };

    // Set up listeners immediately if content is already loaded
    setupIframeListeners();

    // Also set up listeners when new content is rendered
    const onRendered = () => {
      console.log("[SWIPE] Content rendered, setting up iframe listeners");
      setTimeout(setupIframeListeners, 100); // Small delay to ensure content is ready
    };

    // Listen for epub.js rendered events to catch new content
    rendition.on("rendered", onRendered);

    // Also listen for location changes which might load new content
    const onLocationChanged = () => {
      console.log("[SWIPE] Location changed, refreshing iframe listeners");
      setTimeout(setupIframeListeners, 200);
    };

    rendition.on("locationChanged", onLocationChanged);

    // Fallback: periodically check for new iframes (for edge cases)
    const intervalCheck = setInterval(() => {
      setupIframeListeners();
    }, 2000);

    return () => {
      console.log("[SWIPE] Removing touch event listeners");

      // Remove listeners from viewer
      if (viewer) {
        viewer.removeEventListener("touchstart", onTouchStart, {
          capture: true,
        });
        viewer.removeEventListener("touchmove", onTouchMove, {
          capture: true,
        });
        viewer.removeEventListener("touchend", onTouchEnd, {
          capture: true,
        });
      }

      // Remove epub.js event listeners
      if (rendition) {
        rendition.off("rendered", onRendered);
        rendition.off("locationChanged", onLocationChanged);
      }

      // Clear interval
      clearInterval(intervalCheck);

      // Reset swipe state on cleanup
      resetSwipeState();
    };
  }, [
    book,
    isMobile,
    rendition,
    currentChapter,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetSwipeState,
  ]);

  // Cleanup swipe state on unmount
  useEffect(() => {
    return () => {
      resetSwipeState();
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
          for (const font of fonts) {
            const isLoaded = await document.fonts.check(`16px "${font}"`);
            console.log(`[FONT] ${font} loaded:`, isLoaded);
          }
        } catch (error) {
          console.warn("[FONT] Font loading check failed:", error);
        }
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

        if (progress.current_cfi) {
          console.log(
            `[DEBUG] Setting CFI: ${progress.current_cfi.substring(0, 50)}...`
          );
          console.log(
            "[CFI] Setting currentCFI from progress:",
            progress.current_cfi
          );
          setCurrentCFI(progress.current_cfi);
          setLoadingMessage("Reading progress loaded");
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
    });

    if (!bookData || !progressFetched) {
      console.log("[DEBUG] Skipping book load - missing requirements", {
        bookData: !!bookData,
        progressFetched,
      });
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
        console.log(
          "[DEBUG] Setting loading to false to trigger viewer render"
        );
        setLoading(false); // This will cause React to render the viewer element

        // Use a small delay to ensure the DOM has updated, then render the book
        setTimeout(() => {
          console.log("[DEBUG] Timeout callback - looking for viewer element");
          const viewerEl =
            viewerRef.current || document.getElementById("viewer");
          console.log("[DEBUG] Viewer element found:", !!viewerEl);
          if (viewerEl) {
            setLoadingMessage("Rendering book...");
            console.log("[DEBUG] Calling renderBook");
            renderBook(newBook);
          } else {
            console.error(
              "[DEBUG] Viewer element still not found after DOM update"
            );
            setLoadingMessage("Error: Could not initialize viewer");
          }
        }, 100);
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
  }, [bookData, progressFetched]);

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
    if (rendition && rendition.themes && preferencesLoaded) {
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
  }, [isDarkTheme, isDarkClicked, rendition, preferencesLoaded]);

  // Apply font size changes
  useEffect(() => {
    if (
      rendition &&
      rendition.themes &&
      preferencesLoaded &&
      !isUpdatingReadingMode
    ) {
      rendition.themes.fontSize(fontSize);
    }
  }, [fontSize, rendition, preferencesLoaded, isUpdatingReadingMode]);

  // Apply font family changes
  useEffect(() => {
    console.log("Font family effect triggered:", {
      fontFamily,
      rendition: !!rendition,
      preferencesLoaded,
      isUpdatingReadingMode,
    });
    if (rendition && preferencesLoaded && !isUpdatingReadingMode) {
      console.log("Applying font settings via effect");
      applyFontSettings();
    } else if (isUpdatingReadingMode) {
      console.log("Skipping font application - reading mode is being updated");
    }
  }, [fontFamily, rendition, preferencesLoaded, isUpdatingReadingMode]);

  // Listen for new views being rendered and apply fonts to them
  useEffect(() => {
    if (!rendition || !preferencesLoaded) return;

    const handleViewRendered = () => {
      console.log("New view rendered, applying font settings");
      // Skip font application if reading mode is being updated
      if (isUpdatingReadingMode) {
        console.log(
          "Skipping font application on view rendered - reading mode is being updated"
        );
        return;
      }
      // Small delay to ensure the iframe is fully loaded
      setTimeout(() => {
        applyFontSettings();
      }, 100);
    };

    // Listen for when new views are rendered
    rendition.on("rendered", handleViewRendered);

    return () => {
      rendition.off("rendered", handleViewRendered);
    };
  }, [rendition, preferencesLoaded, fontFamily, isUpdatingReadingMode]);

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

  // Apply font settings to all elements
  const applyFontSettings = () => {
    if (!rendition) {
      console.log("Cannot apply font settings - rendition not available");
      return;
    }

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
          console.log(`[FONT] Font style injected into iframe ${index}`);
        }

        // Restore scroll position in scrolled mode (but not during chapter navigation)
        if (
          readingMode === "scrolled" &&
          scrollPositions[index] !== undefined &&
          !isNavigatingToChapter
        ) {
          setTimeout(() => {
            if (view.iframe && view.iframe.contentWindow) {
              console.log(
                `[FONT] Restoring scroll position for view ${index}:`,
                scrollPositions[index]
              );
              view.iframe.contentWindow.scrollTo(0, scrollPositions[index]);
            }
          }, 50);
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
      console.log("[DEBUG] Creating rendition with element:", viewerElement);
      // Configure rendition options based on reading mode
      const renditionOptions = {
        width: `${window.innerWidth}px`,
        height: "90vh",
        ignoreClass: "annotator-hl",
        manager: "default",
      };

      // Set flow mode based on reading preference
      if (readingMode === "scrolled") {
        renditionOptions.flow = "scrolled";
        renditionOptions.manager = "continuous";
      } else {
        renditionOptions.flow = "paginated";
        renditionOptions.manager = "default";
      }

      console.log("Creating rendition with options:", renditionOptions);
      const newRendition = loadedBook.renderTo(viewerElement, renditionOptions);
      console.log("[DEBUG] Rendition created successfully");

      // Disable epub.js default touch handling to prevent conflicts with our custom swipe
      if (isMobile) {
        console.log(
          "[SWIPE] Disabling epub.js default touch handling for mobile"
        );
        try {
          // Disable epub.js's built-in touch navigation
          if (newRendition.manager && newRendition.manager.settings) {
            newRendition.manager.settings.snap = false;
          }

          // Override epub.js touch handlers when content is rendered
          newRendition.on("rendered", () => {
            const contents = newRendition.getContents();
            contents.forEach((content, index) => {
              try {
                if (content.document) {
                  // Disable epub.js touch events by removing their listeners
                  const iframeDoc = content.document;

                  // Add CSS to prevent text selection during swipes
                  const style = iframeDoc.createElement("style");
                  style.textContent = `
                    * {
                      -webkit-touch-callout: none;
                      -webkit-user-select: none;
                      -khtml-user-select: none;
                      -moz-user-select: none;
                      -ms-user-select: none;
                      user-select: none;
                      -webkit-tap-highlight-color: transparent;
                    }
                    body {
                      touch-action: pan-y; /* Allow vertical scrolling but prevent horizontal */
                    }
                  `;
                  if (iframeDoc.head) {
                    iframeDoc.head.appendChild(style);
                  }

                  console.log(
                    `[SWIPE] Disabled epub.js touch handling for content ${index}`
                  );
                }
              } catch (e) {
                console.log(
                  `[SWIPE] Could not disable touch handling for content ${index}:`,
                  e.message
                );
              }
            });
          });
        } catch (e) {
          console.log(
            "[SWIPE] Error disabling epub.js touch handling:",
            e.message
          );
        }
      }

      // Apply global font styles before displaying content
      // First inject font definitions
      injectFontDefinitions(newRendition);

      // Add smooth scrolling for scrolled mode
      if (readingMode === "scrolled") {
        newRendition.on("rendered", () => {
          const iframe = newRendition.getContents()[0];
          if (iframe && iframe.document) {
            const style = iframe.document.createElement("style");
            style.textContent = `
              html {
                scroll-behavior: smooth;
              }
              body {
                overflow-x: hidden;
                overflow-y: auto;
              }
            `;
            iframe.document.head.appendChild(style);
          }
        });
      }

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
          console.log(
            "[RESIZE] Handling rendition resize, resetting touch state"
          );

          // Reset touch/swipe state on resize to prevent stale touch data
          resetSwipeState();

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

        // Reapply font settings on each page change
        console.log(
          "[FONT] About to apply font settings - Reading Mode:",
          readingMode
        );
        applyFontSettings();

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
    } catch (error) {
      console.error("Error in initial page calculation:", error);
      setCurrentPage(1);
      setTotalPages(100);
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

    if (!location || !location.start) {
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
    if (!rendition || !bookData) return;

    try {
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

      const newCFI = rendition.location.start.cfi;

      // Guard against invalid CFI
      if (!newCFI || newCFI === "undefined") {
        console.log(`[DEBUG] Cannot save progress - invalid CFI:`, newCFI);
        return;
      }

      const newPercentage = Math.round(
        rendition.book.locations.percentageFromCfi(newCFI) * 100
      );

      console.log(
        `[DEBUG] Saving progress for ${
          bookData.title
        }: ${newPercentage}% at CFI: ${newCFI.substring(0, 50)}...`
      );

      // For completed books, save the CFI that corresponds to 100% instead of current position
      let cfiToSave = newCFI;
      if (newPercentage >= 100 && rendition.book.locations) {
        try {
          const lastCFI = rendition.book.locations.cfiFromPercentage(1.0);
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
      console.log("[LOCATION] - location.start.cfi:", location.start.cfi);
      console.log("[LOCATION] - location.end.cfi:", location.end?.cfi);
      console.log("[LOCATION] - location.start.href:", location.start.href);
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
      updateCurrentChapter(location, book);

      // Update current CFI - only in paginated mode to avoid jumping in scrolled mode
      if (readingMode === "paginated") {
        try {
          const currentLocation = rendition.currentLocation();
          const newCFI =
            currentLocation?.start?.cfi || location.start.cfi || location.start;
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

      // Reapply font settings on each page change
      applyFontSettings();

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
    setReadingMode(newMode);

    // Save to IndexedDB
    try {
      await userPreferencesDB.setReadingMode(newMode);
    } catch (error) {
      console.error("Error saving reading mode setting:", error);
    }

    // Recreate rendition with new flow mode if book is loaded
    if (book && viewerRef.current && rendition) {
      console.log("Recreating rendition with new reading mode:", newMode);

      // Store current location before destroying rendition
      let currentLocation = null;
      try {
        currentLocation = rendition.currentLocation();
      } catch (error) {
        console.warn("Could not get current location:", error);
      }

      // Destroy current rendition
      try {
        rendition.destroy();
      } catch (error) {
        console.warn("Error destroying rendition:", error);
      }

      // Clear the viewer element
      const viewerElement = viewerRef.current;
      if (viewerElement) {
        viewerElement.innerHTML = "";
      }

      // Create new rendition with updated reading mode
      try {
        // Configure rendition options based on reading mode
        const renditionOptions = {
          width: `${window.innerWidth}px`,
          height: "90vh",
          ignoreClass: "annotator-hl",
          manager: "default",
        };

        // Set flow mode based on reading preference
        if (newMode === "scrolled") {
          renditionOptions.flow = "scrolled";
          renditionOptions.manager = "continuous";
        } else {
          renditionOptions.flow = "paginated";
          renditionOptions.manager = "default";
        }

        console.log("Creating new rendition with options:", renditionOptions);
        const newRendition = book.renderTo(viewerElement, renditionOptions);

        // Disable epub.js default touch handling to prevent conflicts with our custom swipe
        if (isMobile) {
          console.log(
            "[SWIPE] Disabling epub.js default touch handling for mobile (reading mode update)"
          );
          try {
            // Disable epub.js's built-in touch navigation
            if (newRendition.manager && newRendition.manager.settings) {
              newRendition.manager.settings.snap = false;
            }

            // Override epub.js touch handlers when content is rendered
            newRendition.on("rendered", () => {
              const contents = newRendition.getContents();
              contents.forEach((content, index) => {
                try {
                  if (content.document) {
                    // Disable epub.js touch events by removing their listeners
                    const iframeDoc = content.document;

                    // Add CSS to prevent text selection during swipes
                    const style = iframeDoc.createElement("style");
                    style.textContent = `
                      * {
                        -webkit-touch-callout: none;
                        -webkit-user-select: none;
                        -khtml-user-select: none;
                        -moz-user-select: none;
                        -ms-user-select: none;
                        user-select: none;
                        -webkit-tap-highlight-color: transparent;
                      }
                      body {
                        touch-action: pan-y; /* Allow vertical scrolling but prevent horizontal */
                      }
                    `;
                    if (iframeDoc.head) {
                      iframeDoc.head.appendChild(style);
                    }

                    console.log(
                      `[SWIPE] Disabled epub.js touch handling for content ${index} (reading mode update)`
                    );
                  }
                } catch (e) {
                  console.log(
                    `[SWIPE] Could not disable touch handling for content ${index} (reading mode update):`,
                    e.message
                  );
                }
              });
            });
          } catch (e) {
            console.log(
              "[SWIPE] Error disabling epub.js touch handling (reading mode update):",
              e.message
            );
          }
        }

        // Apply font styles
        injectFontDefinitions(newRendition);

        // Add smooth scrolling for scrolled mode
        if (newMode === "scrolled") {
          newRendition.on("rendered", () => {
            const iframe = newRendition.getContents()[0];
            if (iframe && iframe.document) {
              const style = iframe.document.createElement("style");
              style.textContent = `
                html {
                  scroll-behavior: smooth;
                }
                body {
                  overflow-x: hidden;
                  overflow-y: auto;
                }
              `;
              iframe.document.head.appendChild(style);
            }
          });
        }

        // Apply theme and font styles
        const fontWithFallback = getFontWithFallback(fontFamily);
        newRendition.themes.default({
          body: {
            "font-family": `${fontWithFallback} !important`,
            "font-size": `${fontSize}em !important`,
            "line-height": "1.6 !important",
            color: isDarkTheme ? "#e0e0e0" : "#333",
            "background-color": isDarkTheme ? "#000000" : "#ffffff",
          },
        });

        // Display the book at the appropriate location
        let locationToDisplay;
        if (newMode === "scrolled") {
          // In scrolled mode, go to the beginning of the current chapter
          if (currentLocation?.start?.href) {
            const currentHref = currentLocation.start.href;
            const item = book.spine.get(currentHref);
            if (item) {
              await item.load(book.load.bind(book));
              const firstElement =
                item.document.body.firstElementChild || item.document.body;
              locationToDisplay = item.cfiFromElement(firstElement);
              console.log(
                "[READING_MODE] Using chapter beginning CFI for scrolled mode:",
                locationToDisplay
              );
            }
          }
        } else {
          // In paginated mode, use the exact previous location
          locationToDisplay =
            currentLocation?.start?.cfi || currentCFI || book.locations?.start;
        }

        console.log(
          "[READING_MODE] About to display book at location:",
          locationToDisplay,
          "- Mode:",
          newMode
        );
        if (locationToDisplay) {
          await newRendition.display(locationToDisplay);
        } else {
          await newRendition.display();
        }

        // Force scroll to top if switching to scrolled mode
        if (newMode === "scrolled") {
          setTimeout(() => {
            const iframe = newRendition.getContents()[0];
            if (iframe && iframe.window) {
              iframe.window.scrollTo(0, 0);
              console.log(
                "[READING_MODE] Forced scroll to top after switching to scrolled mode"
              );
            }
          }, 200);
        }
        console.log(
          "[READING_MODE] Book displayed successfully in mode:",
          newMode
        );

        // Set up event listeners
        setupRenditionEventListeners(newRendition);

        // Update state
        setRendition(newRendition);

        // Ensure proper sizing after mode change
        setTimeout(() => {
          newRendition.resize(`${window.innerWidth}px`, "90vh");
          // Only update page info in paginated mode
          if (newMode === "paginated") {
            updatePageInfo(newRendition, book);
          }
          // Reset the updating flags after everything is complete
          setIsUpdatingReadingMode(false);
          setIsNavigatingToChapter(false);
        }, 100);

        console.log("Successfully recreated rendition with new reading mode");
      } catch (error) {
        console.error("Error recreating rendition:", error);
        setIsUpdatingReadingMode(false);
      }
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

  // Loading state
  if (loading || !preferencesLoaded) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center gap-4">
        <CircularProgress size="lg" color="default" aria-label="Loading" />
        <div className="text-center">
          <p className="text-lg font-medium">
            {!preferencesLoaded ? "Loading preferences..." : loadingMessage}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait while we prepare your book...
          </p>
        </div>
      </div>
    );
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
      className={`overflow-y-hidden main-book-reader-container h-lvh ${
        isDarkTheme ? "dark" : "default"
      }`}
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
        } ${
          isMobile && mobileHoverMode ? "mobile-hover-active" : ""
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
    </div>
  );
}

export default EpubReader;
