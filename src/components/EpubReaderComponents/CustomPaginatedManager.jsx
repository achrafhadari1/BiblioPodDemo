/**
 * Custom Paginated Manager for EPUB Reader
 *
 * This provides a custom paginated reading experience that's consistent with
 * the CustomScrollManager, allowing for smooth switching between reading modes.
 * Unlike epub.js's built-in pagination, this manager provides better control
 * over layout, theming, and position tracking.
 */

import { useState, useEffect, useRef, useCallback } from "react";

class CustomPaginatedManager {
  constructor(book, rendition, options = {}) {
    this.book = book;
    this.rendition = rendition; // Keep for compatibility but won't use for rendering
    this.container = null;
    this.sections = [];
    this.currentSectionIndex = 0;
    this.currentPageIndex = 0;
    this.isLoading = false;
    this.loadedSections = new Map(); // Cache for loaded sections

    // User preferences
    this.userFontSize = 1; // em units
    this.userFontFamily = "Lora, Georgia, serif";
    this.isDarkTheme = false;

    // Progress restoration
    this.savedProgress = null;

    // Configuration
    this.options = {
      preloadCount: 1, // Number of sections to preload ahead/behind
      columnGap: 40, // Gap between columns in pixels
      pageWidth: 600, // Target page width in pixels
      pageHeight: 800, // Target page height in pixels
      ...options,
    };

    // Pagination state
    this.pages = []; // Array of page objects with section and content info
    this.currentPageGlobal = 0; // Global page index across all sections
    this.totalPages = 0;

    // Event handlers
    this.onResize = this.onResize.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  async init() {
    try {
      // Wait for book to be ready
      if (this.book && this.book.ready) {
        await this.book.ready;
      } else {
        console.warn("[CustomPaginatedManager] Book not ready, waiting...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!this.book || !this.book.spine) {
          throw new Error("Book not properly loaded");
        }
      }

      // Get all sections from spine
      console.log(
        `[CustomPaginatedManager] Book spine has ${this.book.spine.spineItems.length} items`
      );
      this.book.spine.spineItems.forEach((item, index) => {
        console.log(
          `[CustomPaginatedManager] Section ${index}: ${item.href} (id: ${item.id}, linear: ${item.linear})`
        );
      });

      this.sections = this.book.spine.spineItems.map((item, index) => ({
        index,
        href: item.href,
        id: item.id,
        item,
        element: null,
        pages: [], // Pages within this section
        loaded: false,
        content: null,
      }));

      console.log(
        "[CustomPaginatedManager] Initialized with",
        this.sections.length,
        "sections"
      );

      // Set up container and wait for it to be ready
      await this.setupContainer();

      // Load initial sections and create pages
      await this.loadInitialSections();

      // Set up event listeners
      this.setupEventListeners();

      // Trigger initial location update
      setTimeout(() => {
        if (this.onSectionChangeCallback) {
          const location = this.getCurrentLocation();
          if (location) {
            console.log(
              "[CustomPaginatedManager] Initial location update:",
              location
            );
            this.onSectionChangeCallback(location);
          }
        }
      }, 500);
    } catch (error) {
      console.error("[CustomPaginatedManager] Initialization failed:", error);
      throw error;
    }
  }

  setupContainer() {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const maxRetries = 5;

      const findContainer = () => {
        const refContainer =
          this.options.viewerRef && this.options.viewerRef.current;
        const idContainer = document.getElementById("viewer");

        console.log(
          `[CustomPaginatedManager] Looking for container - ref: ${!!refContainer}, id: ${!!idContainer}`
        );

        this.container = refContainer || idContainer;
        if (!this.container && retries < maxRetries) {
          retries++;
          console.log(
            `[CustomPaginatedManager] Viewer container not found, retry ${retries}/${maxRetries}`
          );
          setTimeout(findContainer, 50);
          return;
        }

        if (!this.container) {
          console.warn(
            "[CustomPaginatedManager] Viewer container not found, creating fallback"
          );
          this.container = document.createElement("div");
          this.container.id = "viewer-fallback";
          this.container.style.cssText = `
             position: fixed;
             top: 0;
             left: 0;
             width: 100%;
             height: 100vh;
             z-index: 1000;
             background: white;
           `;
          document.body.appendChild(this.container);
        }

        console.log("[CustomPaginatedManager] Found viewer container");

        // Clear existing content
        this.container.innerHTML = "";

        // Set up container styles for pagination
        const backgroundColor = this.isDarkTheme ? "#1a1a1a" : "#ffffff";
        this.container.style.cssText = `
           width: 100vw !important;
           max-width: 100vw !important;
           height: 100vh !important;
           overflow: hidden !important;
           position: relative !important;
           background: ${backgroundColor};
           margin: 0 !important;
           padding: 0 !important;
         `;

        // Prevent body scrolling in paginated mode
        document.body.style.overflow = "hidden";

        // Create page container
        this.pageContainer = document.createElement("div");
        this.pageContainer.className = "paginated-container";
        this.pageContainer.style.cssText = `
           width: 100%;
           height: 100%;
           position: relative;
           display: flex;
           align-items: center;
           justify-content: center;
           overflow: hidden;
         `;
        this.container.appendChild(this.pageContainer);

        // Create page content area
        this.pageContent = document.createElement("div");
        this.pageContent.className = "page-content";
        this.updatePageContentStyles();
        this.pageContainer.appendChild(this.pageContent);

        console.log("[CustomPaginatedManager] Container setup complete");
        resolve();
      };

      findContainer();
    });
  }

  updatePageContentStyles() {
    if (!this.pageContent) return;

    const isMobile = window.innerWidth <= 768;
    const backgroundColor = this.isDarkTheme ? "#1a1a1a" : "#ffffff";
    const textColor = this.isDarkTheme ? "#e0e0e0" : "#333333";

    // Calculate responsive dimensions
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    let pageWidth, pageHeight, padding;

    if (isMobile) {
      // Mobile: use most of the screen
      pageWidth = containerWidth - 40;
      pageHeight = containerHeight - 120; // Leave space for navigation
      padding = "20px";
    } else {
      // Desktop: use most of the available screen space for better reading
      pageWidth = Math.min(containerWidth - 100, 1200); // Leave some margin, max 1200px
      pageHeight = containerHeight - 100; // Leave space for navigation
      padding = "40px 60px";
    }

    this.pageContent.style.cssText = `
       width: ${pageWidth}px;
       height: ${pageHeight}px;
       background: ${backgroundColor};
       color: ${textColor};
       padding: ${padding};
       box-sizing: border-box;
       overflow: hidden;
       position: relative;
       box-shadow: ${
         this.isDarkTheme
           ? "0 4px 20px rgba(0,0,0,0.5)"
           : "0 4px 20px rgba(0,0,0,0.1)"
       };
       border-radius: 8px;
       font-family: ${this.userFontFamily};
       font-size: ${this.userFontSize}em;
       line-height: 1.6;
       column-fill: auto;
       column-gap: ${this.options.columnGap}px;
     `;

    // Store dimensions for pagination calculations
    this.pageWidth = pageWidth - (isMobile ? 40 : 120); // Account for padding
    this.pageHeight = pageHeight - (isMobile ? 40 : 80);

    // Force layout recalculation to ensure proper rendering
    if (this.pageContent) {
      this.pageContent.offsetHeight; // Force reflow
    }
  }

  setupEventListeners() {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
  }

  onResize() {
    console.log("[CustomPaginatedManager] Window resized, updating layout");
    this.updatePageContentStyles();
    // Re-paginate current section
    if (this.sections[this.currentSectionIndex]?.loaded) {
      this.paginateSection(this.currentSectionIndex);
      this.displayCurrentPage();
    }
  }

  onKeyDown(event) {
    // Handle keyboard navigation
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        this.prevPage();
        break;
      case "ArrowRight":
        event.preventDefault();
        this.nextPage();
        break;
      case "Home":
        event.preventDefault();
        this.goToPage(0);
        break;
      case "End":
        event.preventDefault();
        this.goToPage(this.totalPages - 1);
        break;
    }
  }

  async loadInitialSections() {
    if (this.sections.length === 0) return;

    // Determine starting section based on saved progress
    let startSectionIndex = 0;
    let startPageIndex = 0;

    if (this.savedProgress) {
      console.log(
        "[CustomPaginatedManager] Checking saved progress:",
        this.savedProgress
      );

      // Try to extract section index from saved progress
      if (this.savedProgress.sectionIndex !== undefined) {
        startSectionIndex = this.savedProgress.sectionIndex;
      } else if (this.savedProgress.cfi) {
        // Extract from CFI
        const match = this.savedProgress.cfi.match(
          /\/6\/(\d+)(?:\[[^\]]*\])?!/
        );
        if (match) {
          const spinePos = parseInt(match[1], 10);
          startSectionIndex = Math.floor((spinePos - 2) / 2);
          startSectionIndex = Math.max(
            0,
            Math.min(startSectionIndex, this.sections.length - 1)
          );
        }
      }

      // Try to extract page index from percentage
      if (this.savedProgress.percentage !== undefined) {
        // We'll calculate the exact page after loading the section
        startPageIndex = 0; // Will be updated after pagination
      }
    }

    console.log(
      `[CustomPaginatedManager] Loading initial section ${startSectionIndex}`
    );

    // Load the starting section
    await this.loadSection(startSectionIndex);
    this.currentSectionIndex = startSectionIndex;

    // Paginate the section
    await this.paginateSection(startSectionIndex);

    // TEMPORARY: Force start from page 0 to test content visibility
    startPageIndex = 0;

    // If we have saved progress with percentage, calculate the correct page
    // if (this.savedProgress?.percentage !== undefined) {
    //   const section = this.sections[startSectionIndex];
    //   if (section.pages.length > 0) {
    //     startPageIndex = Math.floor(
    //       (this.savedProgress.percentage / 100) * section.pages.length
    //     );
    //     startPageIndex = Math.max(0, Math.min(startPageIndex, section.pages.length - 1));
    //   }
    // }

    this.currentPageIndex = startPageIndex;
    this.updateGlobalPageIndex();

    // Display the current page
    this.displayCurrentPage();

    // Preload adjacent sections
    const preloadPromises = [];
    for (let i = 1; i <= this.options.preloadCount; i++) {
      if (startSectionIndex - i >= 0) {
        preloadPromises.push(this.loadSection(startSectionIndex - i));
      }
      if (startSectionIndex + i < this.sections.length) {
        preloadPromises.push(this.loadSection(startSectionIndex + i));
      }
    }

    // Load preload sections in background
    Promise.all(preloadPromises)
      .then(() => {
        console.log("[CustomPaginatedManager] Preload sections loaded");

        // Paginate all sections in background to get correct total pages
        this.paginateAllSections();
      })
      .catch((error) => {
        console.warn(
          "[CustomPaginatedManager] Some preload sections failed:",
          error
        );
      });
  }

  async loadSection(index) {
    if (index < 0 || index >= this.sections.length) return;

    const section = this.sections[index];
    if (section.loaded || section.loading) return;

    section.loading = true;

    try {
      console.log(
        "[CustomPaginatedManager] Loading section",
        index,
        section.href
      );

      // Ensure the section has access to the book object
      if (section.item && !section.item.book) {
        section.item.book = this.book;
      }

      await section.item.load(this.book.load.bind(this.book));

      if (!section.item.document || !section.item.document.body) {
        console.warn("[CustomPaginatedManager] Section has no content:", index);
        return;
      }

      // Clone the section content
      const content = section.item.document.body.cloneNode(true);

      // Process the content (handle images, links, etc.)
      this.processContent(content, section);

      // Update section data
      section.content = content;
      section.loaded = true;
      section.loading = false;

      // Cache the loaded section
      this.loadedSections.set(index, section);

      console.log(
        `[CustomPaginatedManager] Section ${index} loaded successfully`
      );
    } catch (error) {
      console.error(
        `[CustomPaginatedManager] Failed to load section ${index}:`,
        error
      );
      section.loading = false;
    }
  }

  processContent(content, section) {
    // Process images with advanced EPUB image handling
    const images = content.querySelectorAll("img, image");
    console.log(
      `[CustomPaginatedManager] Found ${images.length} images in section ${section.index}`
    );
    images.forEach((img) => {
      // Make images responsive
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "10px auto";

      // Process the image using enhanced image handler
      this.processImage(img, section);
    });

    // Process links
    const links = content.querySelectorAll("a");
    links.forEach((link) => {
      // Handle internal links
      if (link.href && link.href.includes("#")) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          // Handle internal navigation
          this.handleInternalLink(link.href);
        });
      }
    });

    // Apply theme styles
    this.applyContentTheme(content);
  }

  applyContentTheme(content) {
    const textColor = this.isDarkTheme ? "#e0e0e0" : "#333333";
    const linkColor = this.isDarkTheme ? "#66b3ff" : "#0066cc";

    // Apply text color to all text elements
    const textElements = content.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, span, div, li"
    );
    textElements.forEach((el) => {
      el.style.color = textColor;
    });

    // Apply link colors
    const links = content.querySelectorAll("a");
    links.forEach((link) => {
      link.style.color = linkColor;
    });
  }

  async paginateSection(sectionIndex) {
    const section = this.sections[sectionIndex];
    if (!section) {
      console.log(
        `[CustomPaginatedManager] paginateSection: No section at index ${sectionIndex}`
      );
      return;
    }
    if (!section.loaded) {
      console.log(
        `[CustomPaginatedManager] paginateSection: Section ${sectionIndex} not loaded`
      );
      return;
    }
    if (!section.content) {
      console.log(
        `[CustomPaginatedManager] paginateSection: Section ${sectionIndex} has no content`
      );
      return;
    }

    console.log(`[CustomPaginatedManager] Paginating section ${sectionIndex}`);

    // Create a temporary container to measure content
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `
       position: absolute;
       top: -9999px;
       left: -9999px;
       width: ${this.pageWidth}px;
       height: ${this.pageHeight}px;
       overflow: hidden;
       font-family: ${this.userFontFamily};
       font-size: ${this.userFontSize}em;
       line-height: 1.6;
       column-fill: auto;
       column-gap: ${this.options.columnGap}px;
     `;

    // Clone content for measurement
    const contentClone = section.content.cloneNode(true);
    tempContainer.appendChild(contentClone);
    document.body.appendChild(tempContainer);

    // For mobile, use single column; for desktop, use two columns
    const isMobile = window.innerWidth <= 768;
    const columnsPerPage = isMobile ? 1 : 2;
    const availableWidth = this.pageWidth;
    const columnWidth = isMobile
      ? availableWidth
      : Math.floor((availableWidth - this.options.columnGap) / columnsPerPage);

    console.log(
      `[CustomPaginatedManager] Page dimensions: ${this.pageWidth}x${this.pageHeight}`
    );
    console.log(`[CustomPaginatedManager] Columns per page: ${columnsPerPage}`);

    // Set column styles
    if (!isMobile) {
      tempContainer.style.columnWidth = `${columnWidth}px`;
      tempContainer.style.columnCount = columnsPerPage;
    } else {
      tempContainer.style.columnCount = 1;
    }

    // Force layout calculation
    tempContainer.offsetHeight;

    // For column-based layout, we need to calculate pages differently
    let pagesNeeded;

    if (isMobile) {
      // Mobile: single column, use vertical pagination
      const contentHeight = tempContainer.scrollHeight;
      pagesNeeded = Math.max(1, Math.ceil(contentHeight / this.pageHeight));

      console.log(
        `[CustomPaginatedManager] Mobile - Content height: ${contentHeight}px, pages needed: ${pagesNeeded}`
      );

      // Create page objects for mobile (vertical pagination)
      section.pages = [];
      for (let i = 0; i < pagesNeeded; i++) {
        section.pages.push({
          sectionIndex,
          pageIndex: i,
          startOffset: i * this.pageHeight,
          endOffset: Math.min((i + 1) * this.pageHeight, contentHeight),
        });
      }
    } else {
      // Desktop: For column-based layout, we need to calculate based on content height
      // and how it flows into columns, then determine horizontal pages
      const contentHeight = tempContainer.scrollHeight;
      const availableHeight = this.pageHeight;

      // Calculate how many "column sets" (pages) we need
      // Each page can hold pageHeight worth of content across 2 columns
      const contentPerPage = availableHeight * columnsPerPage;
      pagesNeeded = Math.max(1, Math.ceil(contentHeight / contentPerPage));

      console.log(
        `[CustomPaginatedManager] Desktop - Content height: ${contentHeight}px, content per page: ${contentPerPage}px, pages needed: ${pagesNeeded}`
      );

      // Create page objects for desktop (column-based pagination)
      section.pages = [];
      for (let i = 0; i < pagesNeeded; i++) {
        section.pages.push({
          sectionIndex,
          pageIndex: i,
          startOffset: i * contentPerPage, // Vertical offset for column content
          endOffset: Math.min((i + 1) * contentPerPage, contentHeight),
        });
      }
    }

    // Clean up temporary container
    document.body.removeChild(tempContainer);

    console.log(
      `[CustomPaginatedManager] Section ${sectionIndex} paginated into ${section.pages.length} pages`
    );

    // Update total pages count
    this.updateTotalPages();
  }

  async paginateAllSections() {
    console.log(
      "[CustomPaginatedManager] Starting background pagination of all sections"
    );

    for (let i = 0; i < this.sections.length; i++) {
      if (!this.sections[i].pages) {
        try {
          await this.loadSection(i);
          await this.paginateSection(i);

          // Update total pages after each section is paginated
          this.updateTotalPages();
          this.updateCurrentLocation(); // Update location with new total
        } catch (error) {
          console.warn(
            `[CustomPaginatedManager] Failed to paginate section ${i}:`,
            error
          );
        }
      }
    }

    console.log("[CustomPaginatedManager] Background pagination complete");
    this.updateTotalPages(); // Final update
    this.updateCurrentLocation(); // Final location update
  }

  updateTotalPages() {
    let paginatedSections = 0;
    this.totalPages = this.sections.reduce((total, section, index) => {
      const sectionPages = section.pages ? section.pages.length : 0;
      if (section.pages) paginatedSections++;
      console.log(
        `[CustomPaginatedManager] Section ${index}: ${sectionPages} pages (loaded: ${
          section.loaded
        }, paginated: ${!!section.pages})`
      );
      return total + sectionPages;
    }, 0);

    console.log(
      `[CustomPaginatedManager] Total pages: ${this.totalPages} (from ${paginatedSections}/${this.sections.length} paginated sections)`
    );
  }

  // Process an image element with EPUB archive support
  processImage(img, section) {
    // Get the source URL - handle both img src and SVG image xlink:href
    const originalSrc =
      img.getAttribute("src") ||
      img.getAttribute("xlink:href") ||
      img.getAttribute("href");

    if (!originalSrc) return;

    // Skip if already a blob or data URL
    if (originalSrc.startsWith("blob:") || originalSrc.startsWith("data:")) {
      console.log(
        "[CustomPaginatedManager] Image already has blob or data URL, skipping conversion"
      );
      return;
    }

    console.log("[CustomPaginatedManager] Processing image:", originalSrc);

    // For HTTP URLs, fetch directly
    if (originalSrc.startsWith("http")) {
      console.log(
        "[CustomPaginatedManager] Fetching external image:",
        originalSrc
      );
      this.fetchImageAsBlob(img, originalSrc);
      return;
    }

    // Try to find the image in the book's resources first
    if (this.tryBookResource(img, originalSrc)) {
      return;
    }

    // For relative URLs, try multiple approaches
    try {
      // First try: Use epubjs archive methods
      let blobPromise = null;

      // Ensure the URL starts with a slash for epubjs archive
      let archiveUrl = originalSrc;
      if (!archiveUrl.startsWith("/")) {
        archiveUrl = "/" + archiveUrl;
      }

      console.log(
        "[CustomPaginatedManager] Trying to get blob for:",
        archiveUrl
      );

      if (this.book && this.book.archive) {
        if (typeof this.book.archive.getBlob === "function") {
          blobPromise = this.book.archive.getBlob(archiveUrl);
        } else if (typeof this.book.archive.request === "function") {
          blobPromise = this.book.archive.request(archiveUrl, "blob");
        }
      }

      if (blobPromise) {
        blobPromise
          .then((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              console.log(
                "[CustomPaginatedManager] Created blob URL for image:",
                blobUrl
              );

              // Set the appropriate attribute based on element type
              if (img.tagName.toLowerCase() === "img") {
                img.src = blobUrl;
              } else {
                // For SVG image elements
                img.setAttribute("xlink:href", blobUrl);
                img.setAttribute("href", blobUrl);
              }

              // Store the blob URL for cleanup later
              img.dataset.blobUrl = blobUrl;
            } else {
              console.warn(
                "[CustomPaginatedManager] getBlob returned null/undefined for:",
                archiveUrl
              );
              this.fallbackImageResolution(img, originalSrc);
            }
          })
          .catch((error) => {
            console.error(
              "[CustomPaginatedManager] Error creating blob URL for image:",
              error
            );
            this.fallbackImageResolution(img, originalSrc);
          });
      } else {
        console.warn(
          "[CustomPaginatedManager] No suitable blob method found, using resolve fallback"
        );
        this.fallbackImageResolution(img, originalSrc);
      }
    } catch (error) {
      console.error("[CustomPaginatedManager] Error processing image:", error);
      // Try our fallback method as a last resort
      this.fallbackImageResolution(img, originalSrc);
    }
  }

  // Try to find and use a resource from the book
  tryBookResource(img, originalSrc) {
    if (!this.book) {
      return false;
    }

    // Extract filename for partial matching
    const filename = originalSrc.split("/").pop();

    // Try different variations of the path
    const pathVariations = [
      originalSrc,
      originalSrc.startsWith("/") ? originalSrc.substring(1) : originalSrc,
      !originalSrc.startsWith("/") ? "/" + originalSrc : originalSrc,
      "images/" +
        (originalSrc.startsWith("/") ? originalSrc.substring(1) : originalSrc),
      "/images/" +
        (originalSrc.startsWith("/") ? originalSrc.substring(1) : originalSrc),
      "Images/" +
        (originalSrc.startsWith("/") ? originalSrc.substring(1) : originalSrc),
      "/Images/" +
        (originalSrc.startsWith("/") ? originalSrc.substring(1) : originalSrc),
      filename,
      "images/" + filename,
      "/images/" + filename,
      "Images/" + filename,
      "/Images/" + filename,
    ];

    // First try: Direct access to the book's archive using the URL
    if (this.book.archive && typeof this.book.archive.getBlob === "function") {
      for (const path of pathVariations) {
        try {
          const archiveUrl = path.startsWith("/") ? path : "/" + path;
          console.log(
            "[CustomPaginatedManager] Directly trying archive for:",
            archiveUrl
          );

          // Get the blob directly from the archive
          const blobPromise = this.book.archive.getBlob(archiveUrl);
          if (blobPromise) {
            // Set a placeholder while loading
            if (img.tagName.toLowerCase() === "img") {
              img.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='10' text-anchor='middle' fill='%23999'%3ELoading...%3C/text%3E%3C/svg%3E";
            }

            // Handle the promise
            blobPromise
              .then((blob) => {
                if (blob) {
                  const blobUrl = URL.createObjectURL(blob);
                  console.log(
                    "[CustomPaginatedManager] Created blob URL directly from archive:",
                    blobUrl
                  );

                  if (img.tagName.toLowerCase() === "img") {
                    img.src = blobUrl;
                  } else {
                    img.setAttribute("xlink:href", blobUrl);
                    img.setAttribute("href", blobUrl);
                  }

                  // Store the blob URL for cleanup later
                  img.dataset.blobUrl = blobUrl;
                  return true;
                }
              })
              .catch(() => {
                // Silently fail and continue to next method
              });

            return true; // We found a potential match, even if async
          }
        } catch (error) {
          // Continue to next path variation
          continue;
        }
      }
    }

    return false;
  }

  // Fallback image resolution
  fallbackImageResolution(img, originalSrc) {
    console.log(
      "[CustomPaginatedManager] Using fallback image resolution for:",
      originalSrc
    );

    // Set a placeholder image
    if (img.tagName.toLowerCase() === "img") {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect width='200' height='150' fill='%23f0f0f0' stroke='%23ddd'/%3E%3Ctext x='100' y='75' font-family='Arial' font-size='12' text-anchor='middle' fill='%23999'%3EImage not found%3C/text%3E%3C/svg%3E";
    } else {
      img.setAttribute(
        "xlink:href",
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect width='200' height='150' fill='%23f0f0f0' stroke='%23ddd'/%3E%3Ctext x='100' y='75' font-family='Arial' font-size='12' text-anchor='middle' fill='%23999'%3EImage not found%3C/text%3E%3C/svg%3E"
      );
    }
  }

  // Fetch external image as blob
  fetchImageAsBlob(img, url) {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (img.tagName.toLowerCase() === "img") {
          img.src = blobUrl;
        } else {
          img.setAttribute("xlink:href", blobUrl);
          img.setAttribute("href", blobUrl);
        }
        img.dataset.blobUrl = blobUrl;
      })
      .catch((error) => {
        console.error(
          "[CustomPaginatedManager] Error fetching external image:",
          error
        );
        this.fallbackImageResolution(img, url);
      });
  }

  updateGlobalPageIndex() {
    let globalIndex = 0;

    // Add pages from previous sections
    for (let i = 0; i < this.currentSectionIndex; i++) {
      if (this.sections[i].pages) {
        globalIndex += this.sections[i].pages.length;
      }
    }

    // Add current page index within current section
    globalIndex += this.currentPageIndex;

    this.currentPageGlobal = globalIndex;
  }

  displayCurrentPage() {
    console.log(
      `[CustomPaginatedManager] displayCurrentPage called - section: ${this.currentSectionIndex}, page: ${this.currentPageIndex}`
    );

    const section = this.sections[this.currentSectionIndex];
    if (!section) {
      console.log(
        `[CustomPaginatedManager] No section found at index ${this.currentSectionIndex}`
      );
      return;
    }

    if (!section.loaded) {
      console.log(
        `[CustomPaginatedManager] Section ${this.currentSectionIndex} not loaded`
      );
      return;
    }

    if (!section.content) {
      console.log(
        `[CustomPaginatedManager] Section ${this.currentSectionIndex} has no content`
      );
      return;
    }

    if (!section.pages) {
      console.log(
        `[CustomPaginatedManager] Section ${this.currentSectionIndex} has no pages`
      );
      return;
    }

    const page = section.pages[this.currentPageIndex];
    if (!page) {
      console.log(
        `[CustomPaginatedManager] No page found at index ${this.currentPageIndex} in section ${this.currentSectionIndex}`
      );
      console.log(
        `[CustomPaginatedManager] Available pages: ${section.pages.length}`
      );
      return;
    }

    console.log(
      `[CustomPaginatedManager] Displaying section ${this.currentSectionIndex}, page ${this.currentPageIndex}`
    );

    // Clear current content
    this.pageContent.innerHTML = "";

    // Clone section content
    const contentClone = section.content.cloneNode(true);

    // Debug logging
    console.log(
      `[CustomPaginatedManager] Content clone has ${contentClone.children.length} children`
    );
    console.log(
      `[CustomPaginatedManager] Content clone innerHTML length: ${contentClone.innerHTML.length}`
    );
    console.log(
      `[CustomPaginatedManager] Page content container:`,
      this.pageContent
    );

    // Create page wrapper with column layout
    const pageWrapper = document.createElement("div");
    const isMobile = window.innerWidth <= 768;
    const columnsPerPage = isMobile ? 1 : 2;
    const availableWidth = this.pageWidth;
    const columnWidth = isMobile
      ? availableWidth
      : Math.floor((availableWidth - this.options.columnGap) / columnsPerPage);

    // Use vertical transforms for both mobile and desktop
    // since we're now using vertical offsets for column content
    const transform = `translateY(-${page.startOffset}px)`;

    pageWrapper.style.cssText = `
       width: 100%;
       height: 100%;
       overflow: hidden;
       ${isMobile ? "" : `column-width: ${columnWidth}px;`}
       column-count: ${columnsPerPage};
       column-gap: ${this.options.columnGap}px;
       column-fill: auto;
       transform: ${transform};
     `;

    // Debug the transform offset
    console.log(
      `[CustomPaginatedManager] Page ${this.currentPageIndex} startOffset: ${page.startOffset}px`
    );
    console.log(`[CustomPaginatedManager] Transform: ${transform}`);

    pageWrapper.appendChild(contentClone);
    this.pageContent.appendChild(pageWrapper);

    // Debug logging after adding content
    console.log(`[CustomPaginatedManager] Page wrapper added to page content`);
    console.log(
      `[CustomPaginatedManager] Page content children count: ${this.pageContent.children.length}`
    );
    console.log(
      `[CustomPaginatedManager] Page wrapper dimensions: ${pageWrapper.offsetWidth}x${pageWrapper.offsetHeight}`
    );
    console.log(
      `[CustomPaginatedManager] Page content dimensions: ${this.pageContent.offsetWidth}x${this.pageContent.offsetHeight}`
    );

    // Force layout recalculation to ensure content is visible
    this.pageContent.offsetHeight; // Force reflow
    pageWrapper.offsetHeight; // Force reflow

    // Update location and progress
    this.updateGlobalPageIndex();
    this.updateCurrentLocation();
    this.updateReadingProgress();
  }

  nextPage() {
    console.log("[CustomPaginatedManager] nextPage called");
    const section = this.sections[this.currentSectionIndex];

    console.log(
      `[CustomPaginatedManager] Current section: ${this.currentSectionIndex}/${this.sections.length}`
    );
    console.log(
      `[CustomPaginatedManager] Current page: ${this.currentPageIndex}/${
        section.pages?.length || 0
      }`
    );
    console.log(
      `[CustomPaginatedManager] Section has pages: ${!!section.pages}, pages length: ${
        section.pages?.length || 0
      }`
    );

    if (!section.pages || section.pages.length === 0) {
      console.log(
        "[CustomPaginatedManager] Current section has no pages, trying to paginate"
      );
      this.paginateSection(this.currentSectionIndex).then(() => {
        this.nextPage(); // Retry after pagination
      });
      return;
    }

    if (this.currentPageIndex < section.pages.length - 1) {
      // Next page in current section
      console.log(
        `[CustomPaginatedManager] Moving to next page: ${
          this.currentPageIndex + 1
        }/${section.pages.length}`
      );
      this.currentPageIndex++;
      this.displayCurrentPage();
    } else if (this.currentSectionIndex < this.sections.length - 1) {
      // Move to next section
      console.log(
        `[CustomPaginatedManager] Moving to next section: ${
          this.currentSectionIndex + 1
        }`
      );
      this.nextSection();
    } else {
      console.log("[CustomPaginatedManager] Already at last page");
    }
  }

  prevPage() {
    console.log("[CustomPaginatedManager] prevPage called");
    if (this.currentPageIndex > 0) {
      // Previous page in current section
      console.log(
        `[CustomPaginatedManager] Moving to previous page: ${
          this.currentPageIndex - 1
        }`
      );
      this.currentPageIndex--;
      this.displayCurrentPage();
    } else if (this.currentSectionIndex > 0) {
      // Move to previous section
      console.log(
        `[CustomPaginatedManager] Moving to previous section: ${
          this.currentSectionIndex - 1
        }`
      );
      this.prevSection();
    } else {
      console.log("[CustomPaginatedManager] Already at first page");
    }
  }

  async nextSection() {
    if (this.currentSectionIndex >= this.sections.length - 1) return;

    const nextSectionIndex = this.currentSectionIndex + 1;

    console.log(
      `[CustomPaginatedManager] nextSection: moving to section ${nextSectionIndex}`
    );
    console.log(
      `[CustomPaginatedManager] Section ${nextSectionIndex} loaded: ${this.sections[nextSectionIndex].loaded}`
    );
    console.log(
      `[CustomPaginatedManager] Section ${nextSectionIndex} has pages: ${!!this
        .sections[nextSectionIndex].pages}`
    );

    // Load section if not already loaded
    if (!this.sections[nextSectionIndex].loaded) {
      await this.loadSection(nextSectionIndex);
    }

    // Always paginate the section (in case it was loaded but not paginated)
    if (
      !this.sections[nextSectionIndex].pages ||
      this.sections[nextSectionIndex].pages.length === 0
    ) {
      console.log(
        `[CustomPaginatedManager] Paginating section ${nextSectionIndex} (no pages or empty pages array)`
      );
      await this.paginateSection(nextSectionIndex);
    }

    this.currentSectionIndex = nextSectionIndex;
    this.currentPageIndex = 0;

    console.log(
      `[CustomPaginatedManager] About to display section ${nextSectionIndex}, page 0`
    );
    console.log(
      `[CustomPaginatedManager] Section pages length: ${
        this.sections[nextSectionIndex].pages?.length || 0
      }`
    );

    this.displayCurrentPage();

    // Preload next section
    if (nextSectionIndex + 1 < this.sections.length) {
      this.loadSection(nextSectionIndex + 1);
    }
  }

  async prevSection() {
    if (this.currentSectionIndex <= 0) return;

    const prevSectionIndex = this.currentSectionIndex - 1;

    console.log(
      `[CustomPaginatedManager] prevSection: moving to section ${prevSectionIndex}`
    );
    console.log(
      `[CustomPaginatedManager] Section ${prevSectionIndex} loaded: ${this.sections[prevSectionIndex].loaded}`
    );
    console.log(
      `[CustomPaginatedManager] Section ${prevSectionIndex} has pages: ${!!this
        .sections[prevSectionIndex].pages}`
    );

    // Load section if not already loaded
    if (!this.sections[prevSectionIndex].loaded) {
      await this.loadSection(prevSectionIndex);
    }

    // Always paginate the section (in case it was loaded but not paginated)
    if (
      !this.sections[prevSectionIndex].pages ||
      this.sections[prevSectionIndex].pages.length === 0
    ) {
      console.log(
        `[CustomPaginatedManager] Paginating section ${prevSectionIndex} (no pages or empty pages array)`
      );
      await this.paginateSection(prevSectionIndex);
    }

    this.currentSectionIndex = prevSectionIndex;
    const section = this.sections[prevSectionIndex];
    this.currentPageIndex = Math.max(0, section.pages.length - 1);
    this.displayCurrentPage();

    // Preload previous section
    if (prevSectionIndex - 1 >= 0) {
      this.loadSection(prevSectionIndex - 1);
    }
  }

  goToPage(globalPageIndex) {
    if (globalPageIndex < 0 || globalPageIndex >= this.totalPages) return;

    // Find which section and page this global index corresponds to
    let currentGlobalIndex = 0;

    for (
      let sectionIndex = 0;
      sectionIndex < this.sections.length;
      sectionIndex++
    ) {
      const section = this.sections[sectionIndex];
      if (!section.pages) continue;

      if (currentGlobalIndex + section.pages.length > globalPageIndex) {
        // Found the section
        const pageIndex = globalPageIndex - currentGlobalIndex;
        this.goToSectionPage(sectionIndex, pageIndex);
        return;
      }

      currentGlobalIndex += section.pages.length;
    }
  }

  async goToSectionPage(sectionIndex, pageIndex) {
    if (sectionIndex < 0 || sectionIndex >= this.sections.length) return;

    // Load section if needed
    if (!this.sections[sectionIndex].loaded) {
      await this.loadSection(sectionIndex);
      await this.paginateSection(sectionIndex);
    }

    const section = this.sections[sectionIndex];
    if (!section.pages || pageIndex >= section.pages.length) return;

    this.currentSectionIndex = sectionIndex;
    this.currentPageIndex = Math.max(0, pageIndex);
    this.displayCurrentPage();
  }

  updateCurrentLocation() {
    const section = this.sections[this.currentSectionIndex];
    if (!section) return;

    const location = {
      index: this.currentSectionIndex,
      href: section.href,
      percentage:
        this.totalPages > 0 ? this.currentPageGlobal / this.totalPages : 0,
      sectionIndex: this.currentSectionIndex,
      pageIndex: this.currentPageIndex,
      globalPage: this.currentPageGlobal,
      totalPages: this.totalPages,
    };

    if (this.onSectionChangeCallback) {
      this.onSectionChangeCallback(location);
    }
  }

  updateReadingProgress() {
    const progress =
      this.totalPages > 0 ? this.currentPageGlobal / this.totalPages : 0;

    if (this.onProgressChangeCallback) {
      this.onProgressChangeCallback(progress);
    }
  }

  getCurrentLocation() {
    const section = this.sections[this.currentSectionIndex];
    if (!section) return null;

    return {
      index: this.currentSectionIndex,
      href: section.href,
      percentage:
        this.totalPages > 0 ? this.currentPageGlobal / this.totalPages : 0,
      sectionIndex: this.currentSectionIndex,
      pageIndex: this.currentPageIndex,
      globalPage: this.currentPageGlobal,
      totalPages: this.totalPages,
    };
  }

  getReadingProgress() {
    return this.totalPages > 0 ? this.currentPageGlobal / this.totalPages : 0;
  }

  // Navigation methods for external use
  next() {
    this.nextPage();
  }

  prev() {
    this.prevPage();
  }

  // Theme and font methods
  applyTheme(isDark) {
    this.isDarkTheme = isDark;
    this.updatePageContentStyles();

    // Re-apply theme to current content
    if (this.pageContent) {
      const content = this.pageContent.querySelector("div");
      if (content) {
        this.applyContentTheme(content);
      }
    }

    this.displayCurrentPage();
  }

  applyFontSettings(fontSize, fontFamily) {
    this.userFontSize = fontSize;
    this.userFontFamily = fontFamily;
    this.updatePageContentStyles();

    // Re-paginate current section with new font settings
    if (this.sections[this.currentSectionIndex]?.loaded) {
      this.paginateSection(this.currentSectionIndex);
      this.displayCurrentPage();
    }
  }

  // Navigation to specific locations
  async navigateToHref(href) {
    // Find section with matching href
    const sectionIndex = this.sections.findIndex(
      (section) => section.href === href || section.href.includes(href)
    );

    if (sectionIndex >= 0) {
      await this.goToSectionPage(sectionIndex, 0);
    }
  }

  async navigateToSection(index) {
    if (index >= 0 && index < this.sections.length) {
      await this.goToSectionPage(index, 0);
    }
  }

  // Progress restoration
  setSavedProgress(progress) {
    this.savedProgress = progress;
  }

  async restoreProgress() {
    if (!this.savedProgress) return;

    console.log(
      "[CustomPaginatedManager] Restoring progress:",
      this.savedProgress
    );

    let sectionIndex = 0;
    let pageIndex = 0;

    // Extract section index
    if (this.savedProgress.sectionIndex !== undefined) {
      sectionIndex = this.savedProgress.sectionIndex;
    } else if (this.savedProgress.cfi) {
      const match = this.savedProgress.cfi.match(/\/6\/(\d+)(?:\[[^\]]*\])?!/);
      if (match) {
        const spinePos = parseInt(match[1], 10);
        sectionIndex = Math.floor((spinePos - 2) / 2);
      }
    }

    // Extract page index from percentage
    if (this.savedProgress.percentage !== undefined) {
      // Load the section first to get page count
      if (!this.sections[sectionIndex].loaded) {
        await this.loadSection(sectionIndex);
        await this.paginateSection(sectionIndex);
      }

      const section = this.sections[sectionIndex];
      if (section.pages && section.pages.length > 0) {
        pageIndex = Math.floor(
          (this.savedProgress.percentage / 100) * section.pages.length
        );
        pageIndex = Math.max(0, Math.min(pageIndex, section.pages.length - 1));
      }
    }

    await this.goToSectionPage(sectionIndex, pageIndex);
  }

  // Event callbacks
  onSectionChange(callback) {
    this.onSectionChangeCallback = callback;
  }

  onProgressChange(callback) {
    this.onProgressChangeCallback = callback;
  }

  // Cleanup
  destroy() {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);

    if (this.container) {
      this.container.innerHTML = "";
    }

    // Restore body scroll
    document.body.style.overflow = "auto";
  }

  handleInternalLink(href) {
    // Extract fragment identifier
    const fragment = href.split("#")[1];
    if (!fragment) return;

    // Find element with matching id in current content
    const targetElement = this.pageContent.querySelector(`#${fragment}`);
    if (targetElement) {
      // Calculate which page this element is on
      const elementTop = targetElement.offsetTop;
      const pageIndex = Math.floor(elementTop / this.pageHeight);

      if (pageIndex !== this.currentPageIndex) {
        this.currentPageIndex = Math.max(
          0,
          Math.min(
            pageIndex,
            this.sections[this.currentSectionIndex].pages.length - 1
          )
        );
        this.displayCurrentPage();
      }
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

  useEffect(() => {
    console.log("[useCustomPaginatedManager] Effect triggered:", {
      hasBook: !!book,
      hasSavedProgress: !!options.savedProgress,
    });

    if (!book) return;

    const initializeManager = async () => {
      try {
        console.log(
          "[useCustomPaginatedManager] Initializing with book:",
          !!book
        );

        // Wait a bit to ensure DOM is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        const paginatedManager = new CustomPaginatedManager(
          book,
          rendition,
          options
        );

        // Set up event callbacks
        paginatedManager.onSectionChange((location) => {
          console.log(
            "[useCustomPaginatedManager] Location changed:",
            location
          );
          setCurrentLocation(location);
          setCurrentPage(location.globalPage + 1);
          setTotalPages(location.totalPages);
        });

        paginatedManager.onProgressChange((progress) => {
          console.log(
            "[useCustomPaginatedManager] Progress changed:",
            progress
          );
          setReadingProgress(progress);
        });

        // Set saved progress if available
        if (options.savedProgress) {
          paginatedManager.setSavedProgress(options.savedProgress);
        }

        await paginatedManager.init();

        setManager(paginatedManager);
        setIsInitialized(true);

        console.log(
          "[useCustomPaginatedManager] Manager initialized successfully"
        );
      } catch (error) {
        console.error(
          "[useCustomPaginatedManager] Failed to initialize:",
          error
        );
        setIsInitialized(false);
      }
    };

    initializeManager();

    // Cleanup function
    return () => {
      if (manager) {
        manager.destroy();
      }
      setManager(null);
      setIsInitialized(false);
      setCurrentLocation(null);
      setReadingProgress(0);
    };
  }, [book, rendition]);

  // Navigation functions
  const next = useCallback(() => {
    if (manager) {
      manager.next();
    }
  }, [manager]);

  const prev = useCallback(() => {
    if (manager) {
      manager.prev();
    }
  }, [manager]);

  const navigateToSection = useCallback(
    (index) => {
      if (manager) {
        manager.navigateToSection(index);
      }
    },
    [manager]
  );

  const navigateToHref = useCallback(
    (href) => {
      if (manager) {
        manager.navigateToHref(href);
      }
    },
    [manager]
  );

  const goToPage = useCallback(
    (pageIndex) => {
      if (manager) {
        manager.goToPage(pageIndex - 1); // Convert from 1-based to 0-based
      }
    },
    [manager]
  );

  // Theme and font functions
  const applyTheme = useCallback(
    (isDark) => {
      if (manager) {
        manager.applyTheme(isDark);
      }
    },
    [manager]
  );

  const applyFontSettings = useCallback(
    (fontSize, fontFamily) => {
      if (manager) {
        manager.applyFontSettings(fontSize, fontFamily);
      }
    },
    [manager]
  );

  // Progress functions
  const setSavedProgress = useCallback(
    (progress) => {
      if (manager) {
        manager.setSavedProgress(progress);
      }
    },
    [manager]
  );

  const restoreProgress = useCallback(() => {
    if (manager) {
      manager.restoreProgress();
    }
  }, [manager]);

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
