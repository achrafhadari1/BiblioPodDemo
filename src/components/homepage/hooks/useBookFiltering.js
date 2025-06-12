import { useState, useMemo } from "react";

export const useBookFiltering = (fileDetails) => {
  const [sortOption, setSortOption] = useState("updated");
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenres, setSelectedGenres] = useState([]);

  const handleTabChange = (key) => {
    setSelectedTab(key);
  };

  const handleCheckboxChange = (event) => {
    const { value } = event.target;
    if (selectedGenres.includes(value)) {
      setSelectedGenres(selectedGenres.filter((genre) => genre !== value));
    } else {
      setSelectedGenres([...selectedGenres, value]);
    }
  };

  const sortedFilteredBooks = useMemo(() => {
    return fileDetails
      .filter((book) => {
        // Search filtering
        const searchMatch =
          searchTerm === "" ||
          book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.publisher?.toLowerCase().includes(searchTerm.toLowerCase());

        // Genre filtering
        const genreMatch =
          selectedGenres.length === 0 || selectedGenres.includes(book.genre);

        // Tab-based filtering
        let tabMatch = true;

        if (selectedTab === "Currently Reading") {
          tabMatch =
            book.progress != null && book.progress > 0 && book.progress < 100;
        } else if (selectedTab === "Completed") {
          tabMatch = book.progress != null && book.progress === 100;
        }
        return searchMatch && genreMatch && tabMatch;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case "last_uploaded":
            return new Date(b.created_at) - new Date(a.created_at);
          case "alphabetic":
            return a.title.localeCompare(b.title);
          case "older":
            return new Date(a.created_at) - new Date(b.created_at);
          default:
            return new Date(b.updated_at) - new Date(a.updated_at);
        }
      });
  }, [fileDetails, searchTerm, selectedGenres, selectedTab, sortOption]);

  const sortOptions = [
    { label: "Updated", value: "updated" },
    { label: "Last Uploaded", value: "last_uploaded" },
    { label: "Alphabetic", value: "alphabetic" },
    { label: "Older", value: "older" },
  ];

  return {
    sortOption,
    setSortOption,
    selectedTab,
    setSelectedTab,
    searchTerm,
    setSearchTerm,
    selectedGenres,
    setSelectedGenres,
    sortedFilteredBooks,
    sortOptions,
    handleTabChange,
    handleCheckboxChange,
  };
};
