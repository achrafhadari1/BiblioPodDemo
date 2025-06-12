"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocation } from "react-router-dom";
import "../style/bookdisplay.css";

import ePub from "epubjs";
import axios from "../../api/axios";
import "../../index.css";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { AiOutlineFullscreen } from "react-icons/ai";
import { GrNext, GrPrevious } from "react-icons/gr";
import { FiMoon } from "react-icons/fi";
import { CircularProgress } from "@nextui-org/react";

import TextSelectionCoordinates from "../Modals/TextSelectionCoordinates";
import { EpubReaderSettings } from "../EpubReaderComponents/EpubReaderSettings";

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
  fontSize:
    typeof window !== "undefined" && window.innerWidth <= 768 ? "18px" : "28px",
  fontFamily: "'Lora', serif",
  isDarkTheme: false,
};

function EpubReader() {
  // URL parameters
  const searchParams = useSearchParams();
  const bookValue = searchParams.get("book");

  // State variables
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SETTINGS.fontSize);
  const [fontFamily, setFontFamily] = useState(DEFAULT_SETTINGS.fontFamily);
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
  const [touchDebug, setTouchDebug] = useState("");

  // Touch/swipe state - using refs to avoid race conditions
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const isSwipingRef = useRef(false);
  const lastSwipeTimeRef = useRef(0);

  // Minimum swipe distance (in px) and debounce time
  const minSwipeDistance = 50;
  const swipeDebounceTime = 300; // ms

  // Refs
  const titleBarTimerRef = useRef(null);
  const viewerRef = useRef(null);
  const pageCalculationTimeoutRef = useRef(null);

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

  // Helper function to reset swipe state
  const resetSwipeState = useCallback(() => {
    isSwipingRef.current = false;
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, []);

  // Navigation functions (defined first to avoid dependency issues)
  const nextBtn = useCallback(() => {
    if (!rendition) return;
    resetSwipeState(); // Reset swipe state before navigation
    rendition.next();
    updatePageInfo();
  }, [rendition, resetSwipeState]);

  const backBtn = useCallback(() => {
    if (!rendition) return;
    resetSwipeState(); // Reset swipe state before navigation
    rendition.prev();
    updatePageInfo();
  }, [rendition, resetSwipeState]);

  // Touch/swipe handlers with improved debouncing and state management
  const onTouchStart = useCallback((e) => {
    // Prevent multiple simultaneous swipes
    if (isSwipingRef.current) {
      e.preventDefault();
      return;
    }

    const startX = e.targetTouches[0].clientX;
    touchStartRef.current = startX;
    touchEndRef.current = null;
    isSwipingRef.current = true;

    setTouchDebug(`Touch Start: ${startX}`);
    console.log("[SWIPE] Touch start detected at X:", startX);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!touchStartRef.current || !isSwipingRef.current) return;

    const currentX = e.targetTouches[0].clientX;
    touchEndRef.current = currentX;

    // Prevent default scrolling if this looks like a horizontal swipe
    const distance = Math.abs(currentX - touchStartRef.current);
    if (distance > 10) {
      e.preventDefault();
    }

    console.log("[SWIPE] Touch move detected at X:", currentX);
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      // Check debounce time to prevent rapid swipes
      const now = Date.now();
      if (now - lastSwipeTimeRef.current < swipeDebounceTime) {
        console.log("[SWIPE] Swipe debounced - too soon after last swipe");
        isSwipingRef.current = false;
        touchStartRef.current = null;
        touchEndRef.current = null;
        return;
      }

      if (!touchStartRef.current || !isSwipingRef.current) {
        console.log("[SWIPE] Touch end without valid start");
        isSwipingRef.current = false;
        return;
      }

      // Get end position from current ref or changedTouches
      let endX = touchEndRef.current;
      if (!endX && e.changedTouches && e.changedTouches[0]) {
        endX = e.changedTouches[0].clientX;
      }

      if (!endX) {
        console.log("[SWIPE] Touch end without valid end position");
        isSwipingRef.current = false;
        touchStartRef.current = null;
        return;
      }

      const distance = touchStartRef.current - endX;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      setTouchDebug(
        `Touch End: distance=${distance}, left=${isLeftSwipe}, right=${isRightSwipe}`
      );

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

      // Reset touch state
      isSwipingRef.current = false;
      touchStartRef.current = null;
      touchEndRef.current = null;
    },
    [minSwipeDistance, rendition, nextBtn, backBtn, swipeDebounceTime]
  );

  // Attach touch event listeners - simplified to avoid duplicate events
  useEffect(() => {
    if (!book || !isMobile) return;

    console.log("[SWIPE] Attaching touch event listeners for mobile");

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

    return () => {
      console.log("[SWIPE] Removing touch event listeners");
      clearTimeout(iframeTimer);

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
      touchEndRef.current = null;
    };
  }, [book, isMobile, onTouchStart, onTouchMove, onTouchEnd]);

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
        const settings = await bookStorageDB.getReaderSettings();
        setIsDarkTheme(settings.isDarkTheme ?? DEFAULT_SETTINGS.isDarkTheme);
        setFontSize(settings.fontSize || DEFAULT_SETTINGS.fontSize);
        setFontFamily(settings.fontFamily || DEFAULT_SETTINGS.fontFamily);
      } catch (error) {
        console.error("Error loading saved settings:", error);
        // Use defaults if there's an error
        setIsDarkTheme(DEFAULT_SETTINGS.isDarkTheme);
        setFontSize(DEFAULT_SETTINGS.fontSize);
        setFontFamily(DEFAULT_SETTINGS.fontFamily);
      }
    };
    loadSettings();
  }, []);

  // Save user preferences to IndexedDB when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settings = {
          isDarkTheme,
          fontSize,
          fontFamily,
        };
        await bookStorageDB.setReaderSettings(settings);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    };
    saveSettings();
  }, [isDarkTheme, fontSize, fontFamily]);

  // Ensure font is loaded
  useEffect(() => {
    if (!document.getElementById("lora-font")) {
      const link = document.createElement("link");
      link.id = "lora-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap";
      document.head.appendChild(link);
    }
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
      if (document.visibilityState === "hidden") {
        saveReadingProgress(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function for component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Save on component unmount
      if (book && rendition) {
        saveReadingProgress(true);
      }
    };
  }, [rendition, bookData, book]);

  // Apply theme changes
  useEffect(() => {
    if (rendition && rendition.themes) {
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
  }, [isDarkTheme, isDarkClicked, rendition]);

  // Apply font size changes
  useEffect(() => {
    if (rendition && rendition.themes) {
      rendition.themes.fontSize(fontSize);
    }
  }, [fontSize, rendition]);

  // Apply font family changes
  useEffect(() => {
    if (rendition && rendition.themes) {
      applyFontSettings();
    }
  }, [fontFamily, rendition]);

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
      }
    };

    if (rendition) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [rendition]);

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

  // Apply font settings to all elements
  const applyFontSettings = () => {
    if (!rendition || !rendition.themes) return;

    rendition.themes.default({
      body: {
        "font-family": `${fontFamily} !important`,
      },
      p: {
        "font-family": `${fontFamily} !important`,
      },
      div: {
        "font-family": `${fontFamily} !important`,
      },
      span: {
        "font-family": `${fontFamily} !important`,
      },
      "h1, h2, h3, h4, h5, h6": {
        "font-family": `${fontFamily} !important`,
      },
      "*": {
        "font-family": `${fontFamily} !important`,
      },
    });
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
      const newRendition = loadedBook.renderTo(viewerElement, {
        width: `${window.innerWidth}px`,
        height: "90vh",
        ignoreClass: "annotator-hl",
        manager: "default",
      });
      console.log("[DEBUG] Rendition created successfully");

      // Apply global font styles before displaying content
      newRendition.themes.default({
        body: {
          "font-family": `${fontFamily} !important`,
        },
        p: {
          "font-family": `${fontFamily} !important`,
        },
        div: {
          "font-family": `${fontFamily} !important`,
        },
        span: {
          "font-family": `${fontFamily} !important`,
        },
        "h1, h2, h3, h4, h5, h6": {
          "font-family": `${fontFamily} !important`,
        },
        "*": {
          "font-family": `${fontFamily} !important`,
        },
      });

      // Register themes
      newRendition.themes.register("dark", {
        body: {
          background: "black",
          color: "white",
          "font-family": `${fontFamily} !important`,
        },
        "p, div, span, h1, h2, h3, h4, h5, h6, *": {
          "font-family": `${fontFamily} !important`,
        },
        ".calibre": {
          background: "black",
          color: "white",
          "font-family": `${fontFamily} !important`,
        },
      });

      newRendition.themes.register("default", {
        body: {
          background: "white",
          color: "black",
          "font-family": `${fontFamily} !important`,
        },
        "p, div, span, h1, h2, h3, h4, h5, h6, *": {
          "font-family": `${fontFamily} !important`,
        },
        ".calibre": {
          background: "white",
          color: "black",
          "font-family": `${fontFamily} !important`,
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
          }, 500);
        })
        .catch((error) => {
          console.error("[DEBUG] Error displaying book:", error);
          setLoadingMessage("Error displaying book: " + error.message);
          setLoading(false);
          setIsBookLoading(false);
        });

      // Handle window resize
      const resizeListener = () => {
        newRendition.resize(`${window.innerWidth}px`, "90vh");
        updatePageInfo(newRendition);
      };

      window.addEventListener("resize", resizeListener);

      // Track current chapter and update page info
      newRendition.on("locationChanged", (location) => {
        updatePageInfo(newRendition);

        // Update current chapter
        if (loadedBook.navigation && loadedBook.navigation.toc) {
          const toc = loadedBook.navigation.toc;
          const currentHref = location.start.href;

          // Find the current chapter from TOC
          const chapter = toc.find((item) => currentHref?.includes(item.href));
          if (chapter) {
            setCurrentChapter(chapter.label);
          }
        }

        // Reapply font settings on each page change
        applyFontSettings();
      });

      return () => {
        window.removeEventListener("resize", resizeListener);
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

  // Update page information with improved accuracy
  const updatePageInfo = (renditionInstance) => {
    const currentRendition = renditionInstance || rendition;
    if (!currentRendition || !book) return;

    try {
      // Get the current location
      const location = currentRendition.currentLocation();
      if (!location || !location.start) {
        return;
      }

      const currentCfi = location.start.cfi;
      const currentHref = location.start.href;

      // Use percentage-based calculation which is more reliable
      const currentPercentage = book.locations.percentageFromCfi(currentCfi);
      const totalPagesEstimate = Math.ceil(book.locations.total / 2) || 100;
      const estimatedCurrentPage = Math.max(
        1,
        Math.ceil(currentPercentage * totalPagesEstimate)
      );

      setCurrentPage(estimatedCurrentPage);
      setTotalPages(totalPagesEstimate);
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
      await bookStorageDB.updateReaderSetting("isDarkTheme", newThemeState);
    } catch (error) {
      console.error("Error saving theme setting:", error);
    }
  };

  // Update font size
  const updateFontSize = async (newSize) => {
    setFontSize(newSize);

    // Save to IndexedDB
    try {
      await bookStorageDB.updateReaderSetting("fontSize", newSize);
    } catch (error) {
      console.error("Error saving font size setting:", error);
    }
  };

  // Update font family
  const updateFontFamily = async (newFont) => {
    setFontFamily(newFont);

    // Save to IndexedDB
    try {
      await bookStorageDB.updateReaderSetting("fontFamily", newFont);
    } catch (error) {
      console.error("Error saving font family setting:", error);
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
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center gap-4">
        <CircularProgress size="lg" color="default" aria-label="Loading" />
        <div className="text-center">
          <p className="text-lg font-medium">{loadingMessage}</p>
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
      <div
        className={`titlebar reader-controls ${
          showTitleBar ? "" : "opacity-low"
        } transition-opacity duration-300`}
      >
        <TextSelectionCoordinates
          bookValue={bookValue}
          book={book}
          updatePageInfo={() => updatePageInfo()}
          rendition={rendition}
          saveReadingProgress={saveReadingProgress}
          setForceUpdate={setForceUpdate}
        />

        <div id="metainfo">
          <span id="book-title">{bookData.author}</span>
          <span id="title-separator">&nbsp;&nbsp;–&nbsp;&nbsp;</span>
          <span id="chapter-title">{currentChapter || bookData.title}</span>
        </div>
        <div id="title-controls">
          <button
            onClick={toggleTheme}
            id="darkmode"
            className="cursor icon-resize-full"
            aria-label="Toggle dark mode"
          >
            <FiMoon />
          </button>
          <EpubReaderSettings
            rendition={rendition}
            fontSize={fontSize}
            fontFamily={fontFamily}
            updateFontSize={updateFontSize}
            updateFontFamily={updateFontFamily}
          />
          <button
            id="fullscreen"
            onClick={toggleFullscreen}
            className="icon-resize-full cursor"
            aria-label="Toggle fullscreen"
          >
            <AiOutlineFullscreen />
          </button>
        </div>
      </div>

      <div className={isDarkTheme ? "dark" : "default"}>
        <div
          id="divider"
          className={
            !book ? "hidden" : `show ${isDarkTheme ? "lightDivider" : ""}`
          }
        />
        <div
          id="viewer"
          ref={viewerRef}
          className={`epub-viewer ${isFullscreen ? "h-lvh" : ""}`}
        />

        {/* Swipe feedback indicator for mobile */}
        {isMobile && swipeDirection && (
          <div
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                       bg-black bg-opacity-70 text-white px-4 py-2 rounded-full 
                       flex items-center gap-2 z-50 animate-pulse`}
          >
            {swipeDirection === "left" ? (
              <>
                <GrNext className="text-lg" />
                <span>Next</span>
              </>
            ) : (
              <>
                <GrPrevious className="text-lg" />
                <span>Previous</span>
              </>
            )}
          </div>
        )}

        {/* Navigation buttons - hidden on mobile devices since swipe is available */}
        {!isMobile && (
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
          {isMobile && (
            <span className="text-xs opacity-70 mt-1">Swipe to navigate</span>
          )}
          {/* Debug info - remove in production */}
          {touchDebug && (
            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded mt-1">
              {touchDebug}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default EpubReader;
