"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@nextui-org/react";

const SearchInBook = ({
  book,
  rendition,
  isVisible,
  onClose,
  onNavigateToResult,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // Focus search input when visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Search function
  const performSearch = async (query) => {
    if (!query.trim() || !book) return;

    setIsSearching(true);
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setTotalResults(0);

    try {
      const results = [];
      const spine = book.spine;

      // Search through each chapter
      for (let i = 0; i < spine.length; i++) {
        const item = spine.get(i);
        await item.load(book.load.bind(book));

        if (item.document) {
          const textContent = item.document.body.textContent || "";
          const regex = new RegExp(
            query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "gi"
          );
          let match;

          while ((match = regex.exec(textContent)) !== null) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(
              textContent.length,
              match.index + match[0].length + 50
            );
            const context = textContent.substring(start, end);

            // Try to get CFI for the match
            let cfi = null;
            try {
              // Create a range for the match
              const range = item.document.createRange();
              const walker = item.document.createTreeWalker(
                item.document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );

              let currentPos = 0;
              let node;

              while ((node = walker.nextNode())) {
                const nodeLength = node.textContent.length;
                if (currentPos + nodeLength > match.index) {
                  const offset = match.index - currentPos;
                  range.setStart(node, offset);
                  range.setEnd(node, offset + match[0].length);
                  cfi = item.cfiFromRange(range);
                  break;
                }
                currentPos += nodeLength;
              }
            } catch (error) {
              console.warn("Could not generate CFI for search result:", error);
            }

            results.push({
              id: `result-${i}-${match.index}`,
              text: match[0],
              context: context,
              cfi: cfi,
              spineIndex: i,
              chapterTitle: item.href,
              position: match.index,
            });
          }
        }
      }

      setSearchResults(results);
      setTotalResults(results.length);

      if (results.length > 0) {
        setCurrentResultIndex(0);
        toast.success(
          `Found ${results.length} result${results.length !== 1 ? "s" : ""}`
        );
      } else {
        toast.info("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Navigate to search result
  const navigateToResult = async (result, index) => {
    if (!result.cfi || !rendition) return;

    try {
      await rendition.display(result.cfi);
      setCurrentResultIndex(index);

      if (onNavigateToResult) {
        onNavigateToResult(result);
      }

      // Highlight the search term in the current view
      setTimeout(() => {
        highlightSearchTerm(searchQuery);
      }, 500);
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Failed to navigate to result");
    }
  };

  // Highlight search term in the current view
  const highlightSearchTerm = (term) => {
    try {
      const iframe = document.querySelector("#viewer iframe");
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        const walker = doc.createTreeWalker(
          doc.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
          textNodes.push(node);
        }

        textNodes.forEach((textNode) => {
          const text = textNode.textContent;
          const regex = new RegExp(
            `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
            "gi"
          );

          if (regex.test(text)) {
            const highlightedHTML = text.replace(
              regex,
              '<mark style="background-color: #fef08a; color: #000;">$1</mark>'
            );
            const wrapper = doc.createElement("span");
            wrapper.innerHTML = highlightedHTML;
            textNode.parentNode.replaceChild(wrapper, textNode);
          }
        });
      }
    } catch (error) {
      console.warn("Could not highlight search terms:", error);
    }
  };

  // Navigate to next/previous result
  const navigateToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    navigateToResult(searchResults[nextIndex], nextIndex);
  };

  const navigateToPreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex =
      currentResultIndex === 0
        ? searchResults.length - 1
        : currentResultIndex - 1;
    navigateToResult(searchResults[prevIndex], prevIndex);
  };

  // Handle search input
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && e.ctrlKey) {
      navigateToNextResult();
    } else if (e.key === "Enter" && e.shiftKey) {
      navigateToPreviousResult();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="absolute top-0 left-[45.5%] transform -translate-x-1/2 w-full max-w-2xl mx-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Search size={20} className="text-gray-400" />
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search in book... (Press Enter to search)"
                  className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500"
                />
              </form>

              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {currentResultIndex + 1} of {totalResults}
                  </span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={navigateToPreviousResult}
                    disabled={searchResults.length === 0}
                  >
                    <ChevronUp size={16} />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={navigateToNextResult}
                    disabled={searchResults.length === 0}
                  >
                    <ChevronDown size={16} />
                  </Button>
                </div>
              )}

              <Button isIconOnly variant="light" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {isSearching && (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="p-4 text-center text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      index === currentResultIndex
                        ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => navigateToResult(result, index)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin
                        size={16}
                        className="text-blue-600 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          <span
                            dangerouslySetInnerHTML={{
                              __html: result.context.replace(
                                new RegExp(
                                  `(${searchQuery.replace(
                                    /[.*+?^${}()|[\]\\]/g,
                                    "\\$&"
                                  )})`,
                                  "gi"
                                ),
                                '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                              ),
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Chapter: {result.chapterTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Tips */}
          {!searchQuery && (
            <div className="p-4 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1">
                <div>• Type your search term and press Enter</div>
                <div>• Use Ctrl+Enter to go to next result</div>
                <div>• Use Shift+Enter to go to previous result</div>
                <div>• Press Escape to close search</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInBook;
