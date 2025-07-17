"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * CustomPaginatedManager - Fixed implementation for proper EPUB pagination
 * This implementation creates a true book-like experience with:
 * - Exactly 2 columns per page on desktop
 * - Single column on mobile
 * - Proper page breaks and navigation
 * - Accurate page counting
 */
class CustomPaginatedManager {
  constructor(book, options = {}) {
    this.book = book;
    this.container = null;
    this.viewerRef = options.viewerRef;

    // Pagination settings
    this.pageWidth = options.pageWidth || 1080;
    this.pageHeight = options.pageHeight || 815;
    this.columnGap = options.columnGap || 40;
    this.padding = 40;
    this.isMobile = window.innerWidth <= 768;

    // Calculate column dimensions
    const availableWidth = this.pageWidth - this.padding;
    const availableHeight = this.pageHeight - this.padding;

    if (this.isMobile) {
      this.columnsPerPage = 1;
      this.columnWidth = availableWidth;
    } else {
      this.columnsPerPage = 2;
      this.columnWidth = Math.floor((availableWidth - this.columnGap) / 2);
    }

    this.pageContentHeight = availableHeight;

    // Font settings
    this.fontSize = 1.0;
    this.fontFamily = "Lora, Georgia, serif";
    this.isDarkTheme = false;

    // State
    this.sections = [];
    this.currentSectionIndex = 0;
    this.currentPageIndex = 0;
    this.totalPages = 0;
    this.isInitialized = false;

    // Progress restoration
    this.savedProgress = options.savedProgress || null;

    // Callbacks
    this.onLocationChange = null;
    this.onProgressChange = null;

    // Bind methods
    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.goToPage = this.goToPage.bind(this);
    this.applyTheme = this.applyTheme.bind(this);
    this.applyFontSettings = this.applyFontSettings.bind(this);
  }

  async init() {
    try {
      console.log("[CustomPaginatedManager] Starting initialization...");

      // Wait for book to be ready
      await this.book.ready;

      // Set up container
      this.setupContainer();

      // Load all sections and calculate pagination
      await this.loadAllSections();

      // Calculate total pages
      this.calculateTotalPages();

      // Restore progress or go to first page
      if (this.savedProgress) {
        await this.restoreProgress();
      } else {
        this.goToPage(1);
      }

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log(
        `[CustomPaginatedManager] Initialization complete. Total pages: ${this.totalPages}`
      );

      return true;
    } catch (error) {
      console.error("[CustomPaginatedManager] Initialization failed:", error);
      return false;
    }
  }

  setupContainer() {
    if (!this.viewerRef?.current) {
      throw new Error("Viewer container not found");
    }

    this.container = this.viewerRef.current;
    this.container.innerHTML = "";

    // Set up container styles
    this.container.style.cssText = `
      width: ${this.pageWidth}px;
      height: ${this.pageHeight}px;
      overflow: hidden;
      position: relative;
      margin: 0 auto;
      background: ${this.isDarkTheme ? "#000" : "#fff"};
      color: ${this.isDarkTheme ? "#fff" : "#000"};
      padding: ${this.padding / 2}px;
      box-sizing: border-box;
    `;

    console.log("[CustomPaginatedManager] Container setup complete");
  }

  async loadAllSections() {
    console.log("[CustomPaginatedManager] Loading all sections...");

    this.sections = [];

    for (let i = 0; i < this.book.spine.spineItems.length; i++) {
      const spineItem = this.book.spine.spineItems[i];

      try {
        console.log(
          `[CustomPaginatedManager] Loading section ${i}: ${spineItem.href}`
        );

        // Load section content
        await spineItem.load(this.book.load.bind(this.book));

        if (!spineItem.document || !spineItem.document.body) {
          console.warn(`[CustomPaginatedManager] Section ${i} has no content`);
          this.sections.push({
            index: i,
            href: spineItem.href,
            content: null,
            pages: [],
            loaded: true,
          });
          continue;
        }

        // Process and paginate section
        const processedContent = this.processSection(spineItem);
        const pages = await this.paginateSection(processedContent, i);

        this.sections.push({
          index: i,
          href: spineItem.href,
          content: processedContent,
          pages: pages,
          loaded: true,
        });

        console.log(
          `[CustomPaginatedManager] Section ${i} loaded with ${pages.length} pages`
        );
      } catch (error) {
        console.error(
          `[CustomPaginatedManager] Failed to load section ${i}:`,
          error
        );
        this.sections.push({
          index: i,
          href: spineItem.href,
          content: null,
          pages: [],
          loaded: false,
        });
      }
    }

    console.log(
      `[CustomPaginatedManager] All sections loaded. Total sections: ${this.sections.length}`
    );
  }

  processSection(spineItem) {
    const content = spineItem.document.body.cloneNode(true);

    // Process images
    const images = content.querySelectorAll("img, image");
    images.forEach((img) => this.processImage(img, spineItem));

    // Apply base styles
    this.applyContentStyles(content);

    return content;
  }

  processImage(img, spineItem) {
    const src =
      img.getAttribute("src") ||
      img.getAttribute("xlink:href") ||
      img.getAttribute("href");
    if (!src) return;

    // Skip if already processed
    if (src.startsWith("blob:") || src.startsWith("data:")) return;

    try {
      // Get image from book archive
      const imageUrl = this.book.archive.createUrl(src);
      img.src = imageUrl;
    } catch (error) {
      console.warn(
        `[CustomPaginatedManager] Failed to process image: ${src}`,
        error
      );
    }
  }

  applyContentStyles(content) {
    // Apply font and theme styles
    content.style.cssText = `
      font-family: ${this.fontFamily};
      font-size: ${this.fontSize}em;
      line-height: 1.6;
      color: ${this.isDarkTheme ? "#fff" : "#000"};
      background: transparent;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `;

    // Style paragraphs and other elements
    const paragraphs = content.querySelectorAll("p, div, span");
    paragraphs.forEach((p) => {
      p.style.marginBottom = "1em";
      p.style.textAlign = "justify";
    });

    // Style headings
    const headings = content.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((h) => {
      h.style.marginTop = "1.5em";
      h.style.marginBottom = "1em";
      h.style.fontWeight = "bold";
    });

    // Style images
    const images = content.querySelectorAll("img");
    images.forEach((img) => {
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "1em auto";
    });
  }

  async paginateSection(content, sectionIndex) {
    if (!content) return [];

    // Create temporary container for measurement
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${this.columnWidth}px;
      height: ${this.pageContentHeight}px;
      overflow: hidden;
      visibility: hidden;
      font-family: ${this.fontFamily};
      font-size: ${this.fontSize}em;
      line-height: 1.6;
    `;

    document.body.appendChild(tempContainer);

    const pages = [];

    try {
      // Clone content for measurement
      const contentClone = content.cloneNode(true);
      tempContainer.appendChild(contentClone);

      // Get all text nodes and elements
      const elements = this.getAllContentElements(contentClone);

      if (elements.length === 0) {
        // Empty section
        pages.push({
          sectionIndex,
          pageIndex: 0,
          elements: [],
          columns: this.isMobile ? 1 : 2,
        });
      } else {
        // Split elements into pages
        const paginatedElements = this.splitElementsIntoPages(
          elements,
          tempContainer
        );

        paginatedElements.forEach((pageElements, pageIndex) => {
          pages.push({
            sectionIndex,
            pageIndex,
            elements: pageElements,
            columns: this.isMobile ? 1 : 2,
          });
        });
      }
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }

    console.log(
      `[CustomPaginatedManager] Section ${sectionIndex} paginated into ${pages.length} pages`
    );
    return pages;
  }

  getAllContentElements(container) {
    const elements = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes
          if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      elements.push(node.cloneNode(true));
    }

    return elements;
  }

  splitElementsIntoPages(elements, measureContainer) {
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    const maxHeight = this.pageContentHeight * (this.isMobile ? 1 : 2); // 2 columns worth of height

    for (const element of elements) {
      // Create a test container to measure this element
      const testDiv = document.createElement("div");
      testDiv.style.cssText = `
        width: ${this.columnWidth}px;
        font-family: ${this.fontFamily};
        font-size: ${this.fontSize}em;
        line-height: 1.6;
      `;
      testDiv.appendChild(element.cloneNode(true));
      measureContainer.appendChild(testDiv);

      const elementHeight = testDiv.offsetHeight;
      measureContainer.removeChild(testDiv);

      // Check if adding this element would exceed page height
      if (currentHeight + elementHeight > maxHeight && currentPage.length > 0) {
        // Start new page
        pages.push([...currentPage]);
        currentPage = [element];
        currentHeight = elementHeight;
      } else {
        // Add to current page
        currentPage.push(element);
        currentHeight += elementHeight;
      }
    }

    // Add the last page if it has content
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]]; // Ensure at least one page
  }

  calculateTotalPages() {
    this.totalPages = this.sections.reduce((total, section) => {
      return total + (section.pages ? section.pages.length : 0);
    }, 0);

    console.log(
      `[CustomPaginatedManager] Total pages calculated: ${this.totalPages}`
    );
  }

  displayPage(globalPageIndex) {
    if (globalPageIndex < 0 || globalPageIndex >= this.totalPages) {
      console.warn(
        `[CustomPaginatedManager] Invalid page index: ${globalPageIndex}`
      );
      return;
    }

    // Find which section and page this global index corresponds to
    let currentGlobalIndex = 0;
    let targetSection = null;
    let targetPage = null;

    for (const section of this.sections) {
      if (currentGlobalIndex + section.pages.length > globalPageIndex) {
        targetSection = section;
        targetPage = section.pages[globalPageIndex - currentGlobalIndex];
        this.currentSectionIndex = section.index;
        this.currentPageIndex = globalPageIndex - currentGlobalIndex;
        break;
      }
      currentGlobalIndex += section.pages.length;
    }

    if (!targetSection || !targetPage) {
      console.error(
        `[CustomPaginatedManager] Could not find page for index ${globalPageIndex}`
      );
      return;
    }

    console.log(
      `[CustomPaginatedManager] Displaying page ${globalPageIndex + 1}/${
        this.totalPages
      } (Section ${targetSection.index}, Page ${targetPage.pageIndex})`
    );

    // Clear container
    this.container.innerHTML = "";

    // Create page layout
    this.createPageLayout(targetPage);

    // Update location and progress
    this.updateLocation(globalPageIndex);
  }

  createPageLayout(page) {
    const pageContainer = document.createElement("div");
    pageContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      gap: ${this.columnGap}px;
    `;

    if (this.isMobile || page.columns === 1) {
      // Single column layout
      const column = this.createColumn(page.elements);
      pageContainer.appendChild(column);
    } else {
      // Two column layout
      const halfElements = Math.ceil(page.elements.length / 2);
      const leftElements = page.elements.slice(0, halfElements);
      const rightElements = page.elements.slice(halfElements);

      const leftColumn = this.createColumn(leftElements);
      const rightColumn = this.createColumn(rightElements);

      pageContainer.appendChild(leftColumn);
      pageContainer.appendChild(rightColumn);
    }

    this.container.appendChild(pageContainer);
  }

  createColumn(elements) {
    const column = document.createElement("div");
    column.style.cssText = `
      width: ${this.columnWidth}px;
      height: ${this.pageContentHeight}px;
      overflow: hidden;
      font-family: ${this.fontFamily};
      font-size: ${this.fontSize}em;
      line-height: 1.6;
      color: ${this.isDarkTheme ? "#fff" : "#000"};
    `;

    elements.forEach((element) => {
      column.appendChild(element.cloneNode(true));
    });

    return column;
  }

  updateLocation(globalPageIndex) {
    const section = this.sections[this.currentSectionIndex];
    const percentage = ((globalPageIndex + 1) / this.totalPages) * 100;

    const location = {
      index: this.currentSectionIndex,
      href: section?.href || "",
      percentage: Math.round(percentage),
      sectionIndex: this.currentSectionIndex,
      pageIndex: this.currentPageIndex,
      globalPage: globalPageIndex,
      totalPages: this.totalPages,
    };

    if (this.onLocationChange) {
      this.onLocationChange(location);
    }

    if (this.onProgressChange) {
      this.onProgressChange(percentage / 100);
    }
  }

  // Navigation methods
  next() {
    const currentGlobalPage = this.getCurrentGlobalPage();
    if (currentGlobalPage < this.totalPages - 1) {
      this.goToPage(currentGlobalPage + 2); // +2 because goToPage expects 1-based index
    }
  }

  prev() {
    const currentGlobalPage = this.getCurrentGlobalPage();
    if (currentGlobalPage > 0) {
      this.goToPage(currentGlobalPage); // goToPage expects 1-based index
    }
  }

  goToPage(pageNumber) {
    const globalPageIndex = pageNumber - 1; // Convert to 0-based index
    this.displayPage(globalPageIndex);
  }

  getCurrentGlobalPage() {
    let globalIndex = 0;
    for (let i = 0; i < this.currentSectionIndex; i++) {
      globalIndex += this.sections[i].pages.length;
    }
    return globalIndex + this.currentPageIndex;
  }

  getCurrentLocation() {
    const globalPageIndex = this.getCurrentGlobalPage();
    const section = this.sections[this.currentSectionIndex];
    const percentage = ((globalPageIndex + 1) / this.totalPages) * 100;

    return {
      index: this.currentSectionIndex,
      href: section?.href || "",
      percentage: Math.round(percentage),
      sectionIndex: this.currentSectionIndex,
      pageIndex: this.currentPageIndex,
      globalPage: globalPageIndex,
      totalPages: this.totalPages,
    };
  }

  // Theme and font methods
  applyTheme(isDark) {
    this.isDarkTheme = isDark;

    if (this.container) {
      this.container.style.background = isDark ? "#000" : "#fff";
      this.container.style.color = isDark ? "#fff" : "#000";
    }

    // Re-render current page with new theme
    if (this.isInitialized) {
      const currentGlobalPage = this.getCurrentGlobalPage();
      this.displayPage(currentGlobalPage);
    }
  }

  applyFontSettings(fontSize, fontFamily) {
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;

    // Re-paginate all sections with new font settings
    if (this.isInitialized) {
      console.log(
        "[CustomPaginatedManager] Re-paginating with new font settings..."
      );
      this.repaginate();
    }
  }

  async repaginate() {
    const currentLocation = this.getCurrentLocation();
    const currentPercentage = currentLocation.percentage;

    // Re-process and paginate all sections
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.content) {
        this.applyContentStyles(section.content);
        section.pages = await this.paginateSection(section.content, i);
      }
    }

    // Recalculate total pages
    this.calculateTotalPages();

    // Restore position based on percentage
    const targetPage = Math.round((currentPercentage / 100) * this.totalPages);
    this.goToPage(Math.max(1, targetPage));
  }

  async restoreProgress() {
    if (!this.savedProgress) return;

    console.log(
      "[CustomPaginatedManager] Restoring progress:",
      this.savedProgress
    );

    if (this.savedProgress.percentage !== undefined) {
      const targetPage = Math.round(
        (this.savedProgress.percentage / 100) * this.totalPages
      );
      this.goToPage(Math.max(1, targetPage));
    } else {
      this.goToPage(1);
    }
  }

  setupEventListeners() {
    // Keyboard navigation
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          this.prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          this.next();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Store reference for cleanup
    this.keydownHandler = handleKeyDown;
  }

  destroy() {
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }

    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

// React hook for using the CustomPaginatedManager
export function useCustomPaginatedManager(book, rendition, options = {}) {
  const [manager, setManager] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const managerRef = useRef(null);

  useEffect(() => {
    console.log("[useCustomPaginatedManager] Effect triggered:", {
      hasBook: !!book,
      hasSavedProgress: !!options.savedProgress,
    });

    if (!book) {
      setIsInitialized(false);
      return;
    }

    const initManager = async () => {
      try {
        console.log(
          "[useCustomPaginatedManager] Initializing with book:",
          !!book
        );

        // Clean up existing manager
        if (managerRef.current) {
          managerRef.current.destroy();
        }

        const newManager = new CustomPaginatedManager(book, options);

        // Set up callbacks
        newManager.onLocationChange = (location) => {
          console.log(
            "[useCustomPaginatedManager] Location changed:",
            location
          );
          setCurrentLocation(location);
          setCurrentPage(location.globalPage + 1);
          setTotalPages(location.totalPages);
        };

        newManager.onProgressChange = (progress) => {
          console.log(
            "[useCustomPaginatedManager] Progress changed:",
            progress
          );
          setReadingProgress(progress);
        };

        const success = await newManager.init();

        if (success) {
          managerRef.current = newManager;
          setManager(newManager);
          setIsInitialized(true);
          console.log(
            "[useCustomPaginatedManager] Manager initialized successfully"
          );
        } else {
          console.error(
            "[useCustomPaginatedManager] Manager initialization failed"
          );
        }
      } catch (error) {
        console.error(
          "[useCustomPaginatedManager] Error initializing manager:",
          error
        );
      }
    };

    initManager();

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [book, options.savedProgress]);

  const navigateToSection = useCallback((sectionIndex) => {
    if (managerRef.current) {
      // Find the first page of the target section
      let globalPageIndex = 0;
      for (
        let i = 0;
        i < sectionIndex && i < managerRef.current.sections.length;
        i++
      ) {
        globalPageIndex += managerRef.current.sections[i].pages.length;
      }
      managerRef.current.goToPage(globalPageIndex + 1);
    }
  }, []);

  const navigateToHref = useCallback(
    (href) => {
      if (managerRef.current) {
        const sectionIndex = managerRef.current.sections.findIndex(
          (s) => s.href === href
        );
        if (sectionIndex >= 0) {
          navigateToSection(sectionIndex);
        }
      }
    },
    [navigateToSection]
  );

  const goToPage = useCallback((pageNumber) => {
    if (managerRef.current) {
      managerRef.current.goToPage(pageNumber);
    }
  }, []);

  const next = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.next();
    }
  }, []);

  const prev = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.prev();
    }
  }, []);

  const applyTheme = useCallback((isDark) => {
    if (managerRef.current) {
      managerRef.current.applyTheme(isDark);
    }
  }, []);

  const applyFontSettings = useCallback((fontSize, fontFamily) => {
    if (managerRef.current) {
      managerRef.current.applyFontSettings(fontSize, fontFamily);
    }
  }, []);

  const setSavedProgress = useCallback((progress) => {
    if (managerRef.current) {
      managerRef.current.savedProgress = progress;
    }
  }, []);

  const restoreProgress = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.restoreProgress();
    }
  }, []);

  return {
    manager,
    currentLocation,
    readingProgress,
    isInitialized,
    currentPage,
    totalPages,
    navigateToSection,
    navigateToHref,
    goToPage,
    next,
    prev,
    applyTheme,
    applyFontSettings,
    setSavedProgress,
    restoreProgress,
  };
}
