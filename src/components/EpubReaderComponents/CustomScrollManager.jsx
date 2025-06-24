/**
 * Custom Scroll Manager for EPUB Reader
 *
 * This replaces the problematic epubjs continuous manager with a more stable
 * scrolling implementation that avoids the jumping issues caused by automatic
 * content loading/unloading and scroll position adjustments.
 */

import { useState, useEffect, useRef, useCallback } from "react";

class CustomScrollManager {
  constructor(book, rendition, options = {}) {
    this.book = book;
    this.rendition = rendition; // Keep for compatibility but won't use for rendering
    this.container = null;
    this.sections = [];
    this.currentSectionIndex = 0;
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
      preloadCount: 2, // Number of sections to preload ahead/behind
      sectionGap: 20, // Gap between sections in pixels
      smoothScrolling: true,
      ...options,
    };

    // Scroll state
    this.scrollPosition = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // Event handlers
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  async init() {
    try {
      // Wait for book to be ready
      if (this.book && this.book.ready) {
        await this.book.ready;
      } else {
        console.warn("[CustomScrollManager] Book not ready, waiting...");
        // Wait a bit and try again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!this.book || !this.book.spine) {
          throw new Error("Book not properly loaded");
        }
      }

      // Get all sections from spine
      this.sections = this.book.spine.spineItems.map((item, index) => ({
        index,
        href: item.href,
        id: item.id,
        item,
        element: null,
        height: 0,
        loaded: false,
        content: null,
      }));

      console.log(
        "[CustomScrollManager] Initialized with",
        this.sections.length,
        "sections"
      );
      console.log(
        "[CustomScrollManager] Section hrefs:",
        this.sections.map((s) => s.href)
      );

      // Set up container and wait for it to be ready
      await this.setupContainer();

      // Load initial sections
      await this.loadInitialSections();
    } catch (error) {
      console.error("[CustomScrollManager] Initialization failed:", error);
      throw error;
    }
  }

  setupContainer() {
    return new Promise((resolve, reject) => {
      // Find the main container with retries
      let retries = 0;
      const maxRetries = 5; // Reduced retries - render as soon as available

      const findContainer = () => {
        // Try to get container from ref first, then fallback to getElementById
        const refContainer =
          this.options.viewerRef && this.options.viewerRef.current;
        const idContainer = document.getElementById("viewer");

        console.log(
          `[CustomScrollManager] Looking for container - ref: ${!!refContainer}, id: ${!!idContainer}`
        );

        this.container = refContainer || idContainer;
        if (!this.container && retries < maxRetries) {
          retries++;
          console.log(
            `[CustomScrollManager] Viewer container not found, retry ${retries}/${maxRetries}`
          );
          setTimeout(findContainer, 50); // Reduced delay for faster rendering
          return;
        }

        if (!this.container) {
          console.warn(
            "[CustomScrollManager] Viewer container not found, creating fallback"
          );
          // Create a fallback container
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
          console.log(
            "[CustomScrollManager] Created fallback viewer container"
          );
        }

        console.log("[CustomScrollManager] Found viewer container");

        // Clear existing content
        this.container.innerHTML = "";

        // Set up container styles - use main page scroll, full width
        this.container.style.cssText = `
           width: 100vw;
           min-height: 100vh;
           overflow: visible;
           position: relative;
           background: #ffffff;
           margin: 0;
           padding: 0;
         `;

        // Ensure body can scroll
        document.body.style.overflow = "auto";

        // Create sections container
        this.sectionsContainer = document.createElement("div");
        this.sectionsContainer.style.cssText = `
           width: 100%;
           min-height: 100vh;
           position: relative;
           display: flex;
           flex-direction: column;
         `;
        this.container.appendChild(this.sectionsContainer);

        // Add event listeners - use window scroll instead of container scroll
        window.addEventListener("scroll", this.onScroll, { passive: true });
        window.addEventListener("resize", this.onResize);

        console.log("[CustomScrollManager] Container setup complete");
        resolve();
      };

      findContainer();
    });
  }

  async loadInitialSections() {
    // Only load the first section initially for better performance
    if (this.sections.length > 0) {
      await this.loadSection(0);
      this.currentSectionIndex = 0;
    }

    this.updateLayout();
  }

  async loadSection(index) {
    if (index < 0 || index >= this.sections.length) return;

    const section = this.sections[index];
    if (section.loaded) {
      console.log(
        "[CustomScrollManager] Section",
        index,
        "already loaded, skipping"
      );
      return;
    }

    // Check if section is already being loaded to prevent double loading
    if (section.loading) {
      console.log(
        "[CustomScrollManager] Section",
        index,
        "already loading, skipping"
      );
      return;
    }

    // Mark as loading
    section.loading = true;

    try {
      console.log("[CustomScrollManager] Loading section", index, section.href);

      // Load the section content
      await section.item.load(this.book.load.bind(this.book));

      // Check if we have valid content
      if (!section.item.document || !section.item.document.body) {
        console.warn("[CustomScrollManager] Section has no content:", index);
        return;
      }

      // Create section element
      const sectionElement = document.createElement("div");
      sectionElement.className = "epub-section";

      // Responsive padding based on screen size - full width
      const isMobile = window.innerWidth <= 768;
      const padding = isMobile ? "40px 5vw" : "60px 15vw";
      const backgroundColor = this.isDarkTheme ? "#1a1a1a" : "#ffffff";

      sectionElement.style.cssText = `
         width: 100vw;
         margin: 0;
         padding: ${padding};
         background: ${backgroundColor};
         min-height: 100vh;
         box-sizing: border-box;
         position: relative;
       `;

      // Clone the section content
      const content = section.item.document.body.cloneNode(true);

      // Process the content (handle images, links, etc.)
      this.processContent(content, section);

      // Add content to section element
      sectionElement.appendChild(content);

      // Insert section in correct order
      if (this.sectionsContainer) {
        this.insertSectionInOrder(sectionElement, index);
      } else {
        console.error("[CustomScrollManager] Sections container not found");
        return;
      }

      // Update section data
      section.element = sectionElement;
      section.content = content;
      section.loaded = true;
      section.loading = false; // Clear loading flag

      // Cache the loaded section
      this.loadedSections.set(index, section);

      // Calculate height after content is added
      setTimeout(() => {
        if (sectionElement.offsetHeight > 0) {
          section.height = sectionElement.offsetHeight;
          this.updateLayout();
        }
      }, 100);
    } catch (error) {
      console.error(
        "[CustomScrollManager] Failed to load section",
        index,
        error
      );
      section.loading = false; // Clear loading flag on error
    }
  }

  insertSectionInOrder(sectionElement, index) {
    // Set a data attribute to track the section index
    sectionElement.setAttribute("data-section-index", index);

    // Check if section with this index already exists
    const existingSections = Array.from(this.sectionsContainer.children);
    const duplicateSection = existingSections.find(
      (el) => parseInt(el.getAttribute("data-section-index")) === index
    );

    if (duplicateSection) {
      console.warn(
        "[CustomScrollManager] Section",
        index,
        "already exists in DOM, removing duplicate"
      );
      duplicateSection.remove();
    }

    // Find the correct position to insert this section
    // Get fresh list after potential duplicate removal
    const currentSections = Array.from(this.sectionsContainer.children);
    let insertPosition = null;

    for (let i = 0; i < currentSections.length; i++) {
      const existingIndex = parseInt(
        currentSections[i].getAttribute("data-section-index")
      );
      if (existingIndex > index) {
        insertPosition = currentSections[i];
        break;
      }
    }

    if (insertPosition) {
      this.sectionsContainer.insertBefore(sectionElement, insertPosition);
    } else {
      this.sectionsContainer.appendChild(sectionElement);
    }

    console.log(
      "[CustomScrollManager] Inserted section",
      index,
      "in correct order"
    );
  }

  processContent(content, section) {
    // Use user preferences for font settings
    const baseFontSize = window.innerWidth <= 768 ? 16 : 18; // Base size in px
    const fontSize = `${baseFontSize * this.userFontSize}px`;
    const fontFamily = this.userFontFamily;
    const textColor = this.isDarkTheme ? "#e0e0e0" : "#2c3e50";

    // Apply clean typography styles to the content
    content.style.cssText = `
       font-family: ${fontFamily};
       line-height: 1.7;
       color: ${textColor};
       font-size: ${fontSize};
       text-align: justify;
       hyphens: auto;
       word-spacing: 0.1em;
     `;

    // Style paragraphs
    const paragraphs = content.querySelectorAll("p");
    paragraphs.forEach((p) => {
      p.style.cssText = `
         margin: 0 0 1.5em 0;
         text-indent: 1.5em;
         line-height: 1.7;
       `;
    });

    // Style headings with epubjs-inspired styling
    const headings = content.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((heading) => {
      heading.style.cssText = `
         font-family: ${this.userFontFamily || "Georgia, serif"};
         font-weight: normal;
         margin: 0;
         line-height: 1.2;
         color: ${this.isDarkTheme ? "#ffffff" : "#1a1a1a"};
         text-indent: 0;
         text-align: center;
         letter-spacing: 0.02em;
       `;
    });

    // Style h1 specifically (Chapter titles)
    const h1s = content.querySelectorAll("h1");
    h1s.forEach((h1) => {
      h1.style.cssText += `
         font-size: 2.5em;
         font-weight: 300;
         margin: 3em 0 2.5em 0;
         padding: 0 2em;
         text-transform: uppercase;
         letter-spacing: 0.1em;
         border-bottom: 1px solid ${this.isDarkTheme ? "#444" : "#e0e0e0"};
         padding-bottom: 0.5em;
         page-break-before: always;
       `;
    });

    // Style h2 (Section titles)
    const h2s = content.querySelectorAll("h2");
    h2s.forEach((h2) => {
      h2.style.cssText += `
         font-size: 1.8em;
         font-weight: 400;
         margin: 2.5em 0 1.5em 0;
         text-transform: capitalize;
         letter-spacing: 0.05em;
       `;
    });

    // Style h3 (Subsection titles)
    const h3s = content.querySelectorAll("h3");
    h3s.forEach((h3) => {
      h3.style.cssText += `
         font-size: 1.4em;
         font-weight: 500;
         margin: 2em 0 1em 0;
         text-align: left;
       `;
    });

    // Handle images and SVGs
    const images = content.querySelectorAll("img, image");
    images.forEach((img) => {
      img.style.cssText = `
         max-width: 100%;
         height: auto;
         display: block;
         margin: 2em auto;
         border-radius: 4px;
         box-shadow: 0 4px 12px rgba(0,0,0,0.1);
       `;

      // Get the source URL - handle both img src and SVG image xlink:href
      const originalSrc =
        img.getAttribute("src") ||
        img.getAttribute("xlink:href") ||
        img.getAttribute("href");

      // Handle relative URLs - convert to blob URLs like epubjs does
      if (
        originalSrc &&
        !originalSrc.startsWith("http") &&
        !originalSrc.startsWith("data:") &&
        !originalSrc.startsWith("blob:")
      ) {
        try {
          console.log("[CustomScrollManager] Processing image:", originalSrc);

          // Try to get the image as a blob using epubjs archive methods
          let blobPromise = null;

          // Ensure the URL starts with a slash for epubjs archive
          let archiveUrl = originalSrc;
          if (!archiveUrl.startsWith("/")) {
            archiveUrl = "/" + archiveUrl;
          }

          console.log(
            "[CustomScrollManager] Trying to get blob for:",
            archiveUrl
          );

          if (typeof this.book.archive.getBlob === "function") {
            blobPromise = this.book.archive.getBlob(archiveUrl);
          } else if (typeof this.book.archive.request === "function") {
            blobPromise = this.book.archive.request(archiveUrl, "blob");
          }

          if (blobPromise) {
            blobPromise
              .then((blob) => {
                if (blob) {
                  const blobUrl = URL.createObjectURL(blob);
                  console.log(
                    "[CustomScrollManager] Created blob URL for image:",
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
                    "[CustomScrollManager] getBlob returned null/undefined for:",
                    archiveUrl
                  );
                  this.fallbackImageResolution(img, originalSrc);
                }
              })
              .catch((error) => {
                console.error(
                  "[CustomScrollManager] Error creating blob URL for image:",
                  error
                );
                this.fallbackImageResolution(img, originalSrc);
              });
          } else {
            console.warn(
              "[CustomScrollManager] No suitable blob method found, using resolve fallback"
            );
            this.fallbackImageResolution(img, originalSrc);
          }
        } catch (error) {
          console.error("[CustomScrollManager] Error processing image:", error);
        }
      }
    });

    // Handle blockquotes
    const blockquotes = content.querySelectorAll("blockquote");
    blockquotes.forEach((bq) => {
      bq.style.cssText = `
         margin: 2em 0;
         padding: 1em 2em;
         border-left: 4px solid #e0e0e0;
         background: #f9f9f9;
         font-style: italic;
         text-indent: 0;
       `;
    });

    // Handle emphasis and strong
    const emphasis = content.querySelectorAll("em, i");
    emphasis.forEach((em) => {
      em.style.fontStyle = "italic";
    });

    const strong = content.querySelectorAll("strong, b");
    strong.forEach((str) => {
      str.style.fontWeight = "600";
    });

    // Handle links
    const links = content.querySelectorAll("a");
    links.forEach((link) => {
      link.style.cssText = `
         color: #3498db;
         text-decoration: none;
         border-bottom: 1px solid #3498db;
       `;

      // Prevent default link behavior and handle internally
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          // Internal link within section
          this.scrollToAnchor(href.substring(1), section);
        } else if (href) {
          // Link to another section
          this.navigateToHref(href);
        }
      });
    });

    // Handle lists
    const lists = content.querySelectorAll("ul, ol");
    lists.forEach((list) => {
      list.style.cssText = `
         margin: 1.5em 0;
         padding-left: 2em;
       `;
    });

    const listItems = content.querySelectorAll("li");
    listItems.forEach((li) => {
      li.style.cssText = `
         margin: 0.5em 0;
         line-height: 1.6;
       `;
    });

    // Handle styles
    const styles = content.querySelectorAll("style");
    styles.forEach((style) => {
      // Keep styles but scope them to prevent conflicts
      style.textContent = this.scopeCSS(style.textContent, section.index);
    });
  }

  scopeCSS(css, sectionIndex) {
    // Simple CSS scoping to prevent conflicts between sections
    return css.replace(/([^{}]+){/g, (match, selector) => {
      const scopedSelector = selector
        .split(",")
        .map((s) => `.epub-section:nth-child(${sectionIndex + 1}) ${s.trim()}`)
        .join(", ");
      return `${scopedSelector} {`;
    });
  }

  updateLayout() {
    // Recalculate positions and update any necessary layout
    let totalHeight = 0;
    this.sections.forEach((section) => {
      if (section.loaded && section.element) {
        section.offsetTop = totalHeight;
        totalHeight += section.height + this.options.sectionGap;
      }
    });
  }

  onScroll() {
    if (this.isScrolling) return;

    this.scrollPosition =
      window.pageYOffset || document.documentElement.scrollTop;

    // Debounce scroll handling
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.handleScroll();
    }, 16); // ~60fps
  }

  handleScroll() {
    // Determine current section based on scroll position
    const currentSection = this.getCurrentSection();
    if (currentSection !== this.currentSectionIndex) {
      this.currentSectionIndex = currentSection;
      this.onSectionChange(currentSection);
    }

    // Load nearby sections if needed
    this.loadNearbySection();

    // Unload distant sections to save memory
    this.unloadDistantSections();
  }

  getCurrentSection() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const viewportCenter = scrollTop + viewportHeight / 2;

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.loaded && section.element) {
        const rect = section.element.getBoundingClientRect();
        const sectionTop = rect.top + scrollTop;
        const sectionBottom = sectionTop + section.height;

        if (viewportCenter >= sectionTop && viewportCenter <= sectionBottom) {
          return i;
        }
      }
    }

    return this.currentSectionIndex;
  }

  async loadNearbySection() {
    const { preloadCount } = this.options;

    // Load sections ahead
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = this.currentSectionIndex + i;
      if (
        nextIndex < this.sections.length &&
        !this.sections[nextIndex].loaded
      ) {
        await this.loadSection(nextIndex);
      }
    }

    // Load sections behind
    for (let i = 1; i <= preloadCount; i++) {
      const prevIndex = this.currentSectionIndex - i;
      if (prevIndex >= 0 && !this.sections[prevIndex].loaded) {
        await this.loadSection(prevIndex);
      }
    }
  }

  unloadDistantSections() {
    const { preloadCount } = this.options;
    const maxDistance = preloadCount + 2; // Keep a bit more than preload

    this.sections.forEach((section, index) => {
      const distance = Math.abs(index - this.currentSectionIndex);
      if (distance > maxDistance && section.loaded) {
        this.unloadSection(index);
      }
    });
  }

  unloadSection(index) {
    const section = this.sections[index];
    if (!section.loaded) return;

    console.log("[CustomScrollManager] Unloading section", index);

    if (section.element && section.element.parentNode) {
      section.element.parentNode.removeChild(section.element);
    }

    section.element = null;
    section.content = null;
    section.loaded = false;
    section.height = 0;

    this.loadedSections.delete(index);
  }

  onSectionChange(sectionIndex) {
    console.log("[CustomScrollManager] Section changed to", sectionIndex);

    // Emit section change event
    if (this.onSectionChangeCallback) {
      const section = this.sections[sectionIndex];
      this.onSectionChangeCallback({
        index: sectionIndex,
        href: section.href,
        id: section.id,
      });
    }
  }

  onResize() {
    // Recalculate layout on resize
    setTimeout(() => {
      this.sections.forEach((section) => {
        if (section.loaded && section.element) {
          section.height = section.element.offsetHeight;
        }
      });
      this.updateLayout();
    }, 100);
  }

  // Public API methods

  async navigateToSection(index) {
    if (index < 0 || index >= this.sections.length) return;

    // Load the target section if not loaded
    if (!this.sections[index].loaded) {
      await this.loadSection(index);
    }

    const section = this.sections[index];
    if (section.element) {
      this.isScrolling = true;
      section.element.scrollIntoView({ behavior: "smooth", block: "start" });

      setTimeout(() => {
        this.isScrolling = false;
      }, 1000);
    }
  }

  async navigateToHref(href) {
    console.log("[CustomScrollManager] Navigating to href:", href);

    // Clean the href - remove any hash fragments for section matching
    const cleanHref = href.split("#")[0];

    // Find section by href (try exact match first, then partial match)
    let sectionIndex = this.sections.findIndex((s) => s.href === href);

    if (sectionIndex < 0) {
      // Try matching without hash
      sectionIndex = this.sections.findIndex((s) => s.href === cleanHref);
    }

    if (sectionIndex < 0) {
      // Try partial matching (in case of different base paths)
      sectionIndex = this.sections.findIndex(
        (s) => s.href.endsWith(cleanHref) || cleanHref.endsWith(s.href)
      );
    }

    if (sectionIndex >= 0) {
      console.log(
        "[CustomScrollManager] Found section at index:",
        sectionIndex
      );
      await this.navigateToSection(sectionIndex);

      // If there's a hash fragment, try to scroll to that anchor
      const hashFragment = href.split("#")[1];
      if (hashFragment) {
        setTimeout(() => {
          this.scrollToAnchor(hashFragment, this.sections[sectionIndex]);
        }, 500); // Wait for section to load
      }
    } else {
      console.warn("[CustomScrollManager] Section not found for href:", href);
      console.log(
        "[CustomScrollManager] Available sections:",
        this.sections.map((s) => s.href)
      );
    }
  }

  scrollToAnchor(anchorId, section) {
    if (!section.element) return;

    try {
      // Escape special characters in CSS selectors
      const escapedId = CSS.escape(anchorId);
      const anchor = section.element.querySelector(
        `#${escapedId}, [name="${escapedId}"]`
      );

      if (anchor) {
        this.isScrolling = true;
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });

        setTimeout(() => {
          this.isScrolling = false;
        }, 1000);
      } else {
        console.warn("[CustomScrollManager] Anchor not found:", anchorId);
      }
    } catch (error) {
      console.warn(
        "[CustomScrollManager] Invalid anchor selector:",
        anchorId,
        error
      );
    }
  }

  next() {
    // Scroll down by viewport height
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
  }

  prev() {
    // Scroll up by viewport height
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
  }

  getCurrentLocation() {
    const section = this.sections[this.currentSectionIndex];
    if (!section) return null;

    return {
      index: this.currentSectionIndex,
      href: section.href,
      id: section.id,
      percentage: this.getReadingProgress(),
    };
  }

  getReadingProgress() {
    if (!this.sections.length) return 0;

    const totalSections = this.sections.length;
    const currentSection = this.currentSectionIndex;

    // Calculate progress within current section
    const section = this.sections[currentSection];
    let sectionProgress = 0;

    if (section.loaded && section.element) {
      const sectionTop = section.element.offsetTop;
      const sectionHeight = section.height;
      const scrollTop = this.container.scrollTop;
      const containerHeight = this.container.clientHeight;

      if (sectionHeight > 0) {
        const visibleTop = Math.max(scrollTop, sectionTop);
        const visibleBottom = Math.min(
          scrollTop + containerHeight,
          sectionTop + sectionHeight
        );
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        sectionProgress = visibleHeight / sectionHeight;
      }
    }

    // Overall progress
    const overallProgress = (currentSection + sectionProgress) / totalSections;
    return Math.min(1, Math.max(0, overallProgress));
  }

  applyTheme(isDark) {
    if (!this.sectionsContainer) return;

    // Update theme preference
    this.isDarkTheme = isDark;

    console.log("[CustomScrollManager] Applying theme:", {
      isDarkTheme: this.isDarkTheme,
    });

    const backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
    const containerBg = isDark ? "#0f0f0f" : "#ffffff";

    this.container.style.backgroundColor = containerBg;

    // Reprocess all loaded sections with new theme
    this.sections.forEach((section) => {
      if (section.loaded && section.element) {
        section.element.style.backgroundColor = backgroundColor;

        // Reprocess content to apply new text color
        if (section.content) {
          this.processContent(section.content, section);
        }
      }
    });
  }

  applyFontSettings(fontSize, fontFamily) {
    if (!this.sectionsContainer) return;

    // Update user preferences
    this.userFontSize = fontSize || this.userFontSize;
    this.userFontFamily = fontFamily || this.userFontFamily;

    console.log("[CustomScrollManager] Applying font settings:", {
      fontSize: this.userFontSize,
      fontFamily: this.userFontFamily,
    });

    // Reprocess all loaded sections with new font settings
    this.sections.forEach((section) => {
      if (section.loaded && section.element && section.content) {
        // Reprocess the content with new font settings
        this.processContent(section.content, section);
      }
    });

    // Recalculate heights after font change
    setTimeout(() => {
      this.sections.forEach((section) => {
        if (section.loaded && section.element) {
          section.height = section.element.offsetHeight;
        }
      });
      this.updateLayout();
    }, 100);
  }

  // Initialize with user preferences
  initializeWithPreferences(preferences) {
    console.log(
      "[CustomScrollManager] Initializing with preferences:",
      preferences
    );

    if (preferences.fontSize) {
      this.userFontSize = preferences.fontSize;
    }
    if (preferences.fontFamily) {
      this.userFontFamily = preferences.fontFamily;
    }
    if (preferences.isDarkTheme !== undefined) {
      this.isDarkTheme = preferences.isDarkTheme;
    }
  }

  // Fallback image resolution method
  fallbackImageResolution(img, originalSrc) {
    try {
      const resolvedUrl = this.book.archive.resolve(originalSrc);
      console.log(
        "[CustomScrollManager] Using fallback resolved URL:",
        resolvedUrl
      );

      if (img.tagName.toLowerCase() === "img") {
        img.src = resolvedUrl;
      } else {
        img.setAttribute("xlink:href", resolvedUrl);
        img.setAttribute("href", resolvedUrl);
      }
    } catch (fallbackError) {
      console.error(
        "[CustomScrollManager] All image resolution methods failed:",
        fallbackError
      );
      // Last resort: try relative to current section
      try {
        const sectionUrl = this.currentSection?.href || "";
        const baseUrl = sectionUrl.substring(
          0,
          sectionUrl.lastIndexOf("/") + 1
        );
        const finalUrl = baseUrl + originalSrc;
        console.log(
          "[CustomScrollManager] Trying section-relative URL:",
          finalUrl
        );

        if (img.tagName.toLowerCase() === "img") {
          img.src = finalUrl;
        } else {
          img.setAttribute("xlink:href", finalUrl);
          img.setAttribute("href", finalUrl);
        }
      } catch (lastResortError) {
        console.error(
          "[CustomScrollManager] Even section-relative resolution failed:",
          lastResortError
        );
      }
    }
  }

  setSavedProgress(progress) {
    this.savedProgress = progress;
    console.log("[CustomScrollManager] Saved progress set:", progress);
  }

  async restoreProgress() {
    if (!this.savedProgress || !this.savedProgress.location) {
      console.log("[CustomScrollManager] No saved progress to restore");
      return;
    }

    console.log(
      "[CustomScrollManager] Restoring progress to:",
      this.savedProgress.location
    );

    try {
      // Navigate to the saved location
      await this.navigateToHref(this.savedProgress.location.href);

      // If there's a specific scroll position, restore it after a delay
      if (this.savedProgress.scrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, this.savedProgress.scrollPosition);
        }, 500);
      }
    } catch (error) {
      console.error("[CustomScrollManager] Error restoring progress:", error);
    }
  }

  destroy() {
    // Clean up blob URLs to prevent memory leaks
    if (this.container) {
      const images = this.container.querySelectorAll("img[data-blob-url]");
      images.forEach((img) => {
        if (img.dataset.blobUrl) {
          URL.revokeObjectURL(img.dataset.blobUrl);
        }
      });
    }

    // Clean up event listeners
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);

    // Clear timeouts
    clearTimeout(this.scrollTimeout);

    // Clear loaded sections
    this.loadedSections.clear();

    // Reset state
    this.sections = [];
    this.container = null;
    this.sectionsContainer = null;
  }
}

// React hook for using the custom scroll manager
export function useCustomScrollManager(book, rendition, options = {}) {
  const [manager, setManager] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!book) return;

    const initializeManager = async () => {
      try {
        console.log("[useCustomScrollManager] Initializing with book:", !!book);

        // Wait a bit to ensure DOM is ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const scrollManager = new CustomScrollManager(book, rendition, options);

        // Set up callbacks
        scrollManager.onSectionChangeCallback = (location) => {
          setCurrentLocation(location);
          setReadingProgress(scrollManager.getReadingProgress());
        };

        // Wait for initialization to complete
        await scrollManager.init();

        setManager(scrollManager);
        setIsInitialized(true);

        console.log(
          "[useCustomScrollManager] Manager initialized successfully"
        );
      } catch (error) {
        console.error(
          "[useCustomScrollManager] Failed to initialize manager:",
          error
        );
        setIsInitialized(false);
      }
    };

    initializeManager();

    return () => {
      if (manager) {
        manager.destroy();
      }
      setManager(null);
      setIsInitialized(false);
    };
  }, [book, rendition]);

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

  const setSavedProgress = useCallback(
    (progress) => {
      if (manager) {
        manager.setSavedProgress(progress);
      }
    },
    [manager]
  );

  const restoreProgress = useCallback(async () => {
    if (manager) {
      await manager.restoreProgress();
    }
  }, [manager]);

  const initializeWithPreferences = useCallback(
    (preferences) => {
      if (manager) {
        manager.initializeWithPreferences(preferences);
      }
    },
    [manager]
  );

  return {
    manager,
    currentLocation,
    readingProgress,
    isInitialized,
    navigateToSection,
    navigateToHref,
    next,
    prev,
    applyTheme,
    applyFontSettings,
    setSavedProgress,
    restoreProgress,
    initializeWithPreferences,
  };
}

export default CustomScrollManager;
