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

    // Responsive pagination settings
    this.columnGap = options.columnGap || 40;
    this.padding = 20;
    this.isMobile = window.innerWidth <= 768;

    // Calculate responsive dimensions
    this.updateDimensions();

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

    // Update dimensions based on current viewport
    this.updateDimensions();

    // Set up responsive container styles
    this.container.style.cssText = `
      width: 100%;
      max-width: ${this.pageWidth}px;
      height: ${this.pageHeight}px;
      overflow: hidden;
      position: relative;
      margin: 0 auto;
      background: ${this.isDarkTheme ? "#000" : "#fff"};
      color: ${this.isDarkTheme ? "#fff" : "#000"};
      padding: ${this.padding}px;
      box-sizing: border-box;
    `;

    console.log("[CustomPaginatedManager] Container setup complete");
  }

  updateDimensions() {
    // Get actual viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Use most of the viewport, leaving minimal margin
    this.pageWidth = Math.min(viewportWidth - 20, 1400); // Max width for readability
    this.pageHeight = Math.max(viewportHeight - 80, 600); // Leave minimal space for header/footer, min 600px

    // Update mobile detection
    this.isMobile = viewportWidth <= 768;

    // Calculate available space
    const availableWidth = this.pageWidth - this.padding * 2;
    const availableHeight = this.pageHeight - this.padding * 2;

    if (this.isMobile) {
      this.columnsPerPage = 1;
      this.columnWidth = availableWidth;
    } else {
      this.columnsPerPage = 2;
      this.columnWidth = Math.floor((availableWidth - this.columnGap) / 2);
    }

    this.pageContentHeight = availableHeight;

    console.log(
      `[CustomPaginatedManager] Updated dimensions: ${this.pageWidth}x${this.pageHeight}, columns: ${this.columnsPerPage}`
    );
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

    // Apply base styles
    this.applyContentStyles(content);

    // Store spine item reference for later image processing
    content.dataset.spineItemHref = spineItem.href;

    return content;
  }

  processImage(img, spineItem) {
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

      // Try different methods to get the blob
      if (
        this.book.archive &&
        typeof this.book.archive.getBlob === "function"
      ) {
        blobPromise = this.book.archive.getBlob(archiveUrl);
      } else if (
        this.book.archive &&
        typeof this.book.archive.request === "function"
      ) {
        blobPromise = this.book.archive.request(archiveUrl);
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
            // Handle the promise immediately without placeholder
            blobPromise
              .then((blob) => {
                if (blob) {
                  const blobUrl = URL.createObjectURL(blob);
                  console.log(
                    "[CustomPaginatedManager] Created blob URL directly from archive:",
                    blobUrl
                  );

                  // Update all instances of this image in the current page
                  this.updateImageInCurrentPage(img, blobUrl);

                  // Store the blob URL for cleanup later
                  img.dataset.blobUrl = blobUrl;
                  return true;
                }
              })
              .catch(() => {
                // Silently fail and continue to next method
              });

            return true;
          }
        } catch (error) {
          // Silently fail and continue to next path
        }
      }
    }

    return false;
  }

  // Update image in the currently displayed page
  updateImageInCurrentPage(originalImg, blobUrl) {
    if (!this.container) return;

    // Get the original source to match against
    const originalSrc =
      originalImg.getAttribute("src") ||
      originalImg.getAttribute("xlink:href") ||
      originalImg.getAttribute("href");

    if (!originalSrc) return;

    // Update all matching images in the current page
    const currentImages = this.container.querySelectorAll("img, image");
    currentImages.forEach((img) => {
      const imgSrc =
        img.getAttribute("src") ||
        img.getAttribute("xlink:href") ||
        img.getAttribute("href");

      // Check if this is the same image by comparing original sources
      // Also check alt text or other attributes to ensure it's the same image
      const imgAlt = img.getAttribute("alt") || "";
      const originalAlt = originalImg.getAttribute("alt") || "";

      const isSameImage =
        imgSrc === originalSrc ||
        (imgAlt && originalAlt && imgAlt === originalAlt) ||
        img === originalImg;

      if (isSameImage) {
        if (img.tagName.toLowerCase() === "img") {
          img.src = blobUrl;
        } else {
          img.setAttribute("xlink:href", blobUrl);
          img.setAttribute("href", blobUrl);
        }

        img.dataset.blobUrl = blobUrl;
        console.log(
          "[CustomPaginatedManager] Updated image in current page with blob URL"
        );
      }
    });
  }

  // Fallback image resolution method
  fallbackImageResolution(img, originalSrc) {
    console.log(
      "[CustomPaginatedManager] Using fallback image resolution for:",
      originalSrc
    );

    // Set a placeholder image to prevent broken image icons
    if (img.tagName.toLowerCase() === "img") {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23ccc'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='10' text-anchor='middle' fill='%23999'%3EImage%3C/text%3E%3C/svg%3E";
    }
  }

  // Helper method to fetch an image as a blob and set it as the source
  fetchImageAsBlob(img, url) {
    // Check if the URL is already a blob URL
    if (url.startsWith("blob:")) {
      if (img.tagName.toLowerCase() === "img") {
        img.src = url;
      } else {
        img.setAttribute("xlink:href", url);
        img.setAttribute("href", url);
      }
      return;
    }

    // Try to fetch the image and convert it to a blob URL
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        console.log(
          "[CustomPaginatedManager] Created blob URL for image via fetch:",
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
      })
      .catch((error) => {
        console.error("[CustomPaginatedManager] Error fetching image:", error);
        this.fallbackImageResolution(img, originalSrc);
      });
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
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
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

    // Process all child nodes (both elements and text nodes)
    const childNodes = Array.from(container.childNodes);

    for (const node of childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // It's an element - check if it has meaningful content
        if (node.textContent.trim()) {
          elements.push(node.cloneNode(true));
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        // It's a text node - wrap it in a div if it has content
        const textContent = node.textContent.trim();
        if (textContent) {
          const textDiv = document.createElement("div");
          textDiv.textContent = textContent;
          // Apply the same styling as other elements
          textDiv.style.marginBottom = "1em";
          textDiv.style.textAlign = "justify";
          elements.push(textDiv);
        }
      }
    }

    return elements;
  }

  splitElementsIntoPages(elements, measureContainer) {
    const pages = [];
    let currentPageElements = [];
    let leftColumnHeight = 0;
    let rightColumnHeight = 0;
    // Use more of the available height - be less conservative
    const maxColumnHeight = this.pageContentHeight - 10;

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

      if (this.isMobile) {
        // Mobile: single column, simple height check
        if (
          leftColumnHeight + elementHeight > maxColumnHeight &&
          currentPageElements.length > 0
        ) {
          pages.push([...currentPageElements]);
          currentPageElements = [{ element, column: "left" }];
          leftColumnHeight = elementHeight;
        } else {
          currentPageElements.push({ element, column: "left" });
          leftColumnHeight += elementHeight;
        }
      } else {
        // Desktop: two columns - STRICT left-to-right flow to preserve reading order
        if (leftColumnHeight + elementHeight <= maxColumnHeight) {
          // Fits in left column - always fill left first
          currentPageElements.push({ element, column: "left" });
          leftColumnHeight += elementHeight;
        } else if (rightColumnHeight + elementHeight <= maxColumnHeight) {
          // Left column full, try right column
          currentPageElements.push({ element, column: "right" });
          rightColumnHeight += elementHeight;
        } else {
          // Both columns full, start new page
          if (currentPageElements.length > 0) {
            pages.push([...currentPageElements]);
          }
          currentPageElements = [{ element, column: "left" }];
          leftColumnHeight = elementHeight;
          rightColumnHeight = 0;
        }
      }
    }

    // Add the last page if it has content
    if (currentPageElements.length > 0) {
      pages.push(currentPageElements);
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
      align-items: flex-start;
      justify-content: ${this.isMobile ? "flex-start" : "space-between"};
    `;

    // Handle different page formats consistently
    const pageElements = Array.isArray(page) ? page : page.elements || [];

    if (this.isMobile) {
      // Mobile: single column layout
      const elements = pageElements.map((item) => item.element || item);
      const column = this.createColumn(elements);
      pageContainer.appendChild(column);
    } else {
      // Desktop: two column layout with strict left-to-right flow
      const leftElements = [];
      const rightElements = [];

      pageElements.forEach((item) => {
        const element = item.element || item;
        const column = item.column || "left";

        if (column === "left") {
          leftElements.push(element);
        } else {
          rightElements.push(element);
        }
      });

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
      min-height: ${this.pageContentHeight}px;
      max-height: ${this.pageContentHeight}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      flex: 1;
    `;

    elements.forEach((element) => {
      const clonedElement = element.cloneNode(true);
      // Ensure elements don't have excessive margins that could cause overflow
      if (clonedElement.style) {
        clonedElement.style.marginTop = clonedElement.style.marginTop || "0";
        clonedElement.style.marginBottom =
          clonedElement.style.marginBottom || "0.8em";
      }

      // Process images in this element when it's displayed
      const images = clonedElement.querySelectorAll("img, image");
      if (images.length > 0) {
        // Find the spine item for this content
        const spineItem = this.findSpineItemForElement(element);
        if (spineItem) {
          images.forEach((img) => {
            // Process image asynchronously to avoid blocking rendering
            setTimeout(() => this.processImage(img, spineItem), 0);
          });
        }
      }

      column.appendChild(clonedElement);
    });

    return column;
  }

  // Helper method to find the spine item for an element
  findSpineItemForElement(element) {
    // Try to find the spine item from the current section
    const currentSection = this.sections[this.currentSectionIndex];
    if (currentSection && currentSection.loaded) {
      return this.book.spine.spineItems[currentSection.index];
    }

    // Fallback: return the first spine item
    return this.book.spine.spineItems[0];
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

    // Window resize handling
    const handleResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        console.log("[CustomPaginatedManager] Window resized, updating layout");
        this.handleResize();
      }, 250);
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    // Store references for cleanup
    this.keydownHandler = handleKeyDown;
    this.resizeHandler = handleResize;
  }

  async handleResize() {
    const oldPageWidth = this.pageWidth;
    const oldPageHeight = this.pageHeight;
    const oldColumnsPerPage = this.columnsPerPage;

    // Update dimensions
    this.updateDimensions();

    // Check if significant changes occurred
    const dimensionsChanged =
      Math.abs(oldPageWidth - this.pageWidth) > 50 ||
      Math.abs(oldPageHeight - this.pageHeight) > 50 ||
      oldColumnsPerPage !== this.columnsPerPage;

    if (dimensionsChanged) {
      // Update container
      this.setupContainer();

      // Re-paginate all content with new dimensions
      await this.repaginate();
    }
  }

  async repaginate() {
    console.log("[CustomPaginatedManager] Re-paginating with new dimensions");

    // Store current position
    const currentGlobalPage = this.currentGlobalPageIndex;

    // Clear existing pagination
    this.sections.forEach((section) => {
      section.pages = null;
    });

    // Re-paginate all sections
    for (let i = 0; i < this.sections.length; i++) {
      if (this.sections[i].loaded) {
        const pages = await this.paginateSection(this.sections[i].content, i);
        this.sections[i].pages = pages;
      }
    }

    // Update total pages
    this.updateTotalPages();

    // Try to maintain current position (or go to closest page)
    const targetPage = Math.min(currentGlobalPage, this.totalPages - 1);
    this.goToPage(targetPage);

    console.log(
      `[CustomPaginatedManager] Re-pagination complete. New total pages: ${this.totalPages}`
    );
  }

  destroy() {
    try {
      // Clean up blob URLs to prevent memory leaks
      if (this.container) {
        const images = this.container.querySelectorAll("img[data-blob-url]");
        if (images && images.length > 0) {
          images.forEach((img) => {
            if (img && img.dataset && img.dataset.blobUrl) {
              try {
                URL.revokeObjectURL(img.dataset.blobUrl);
              } catch (e) {
                console.error("Error revoking blob URL:", e);
              }
            }
          });
        }
      }

      // Clean up event listeners
      if (this.keydownHandler) {
        document.removeEventListener("keydown", this.keydownHandler);
      }

      if (this.resizeHandler) {
        window.removeEventListener("resize", this.resizeHandler);
      }

      // Clear resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      if (this.container) {
        this.container.innerHTML = "";
      }
    } catch (error) {
      console.error("[CustomPaginatedManager] Error during cleanup:", error);
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
