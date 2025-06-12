import React, { useState, useEffect } from "react";
import { Tabs, Tab } from "@nextui-org/react";
export const FilterByCategory = ({
  bookGenres,
  handleCheckboxChange,
  sortOptions,
  sortOptionHome,
  handleSortChange,
  selectedTab,
  handleTabChange, // Add handleSortChange prop
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [uniqueGenres, setUniqueGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    if (bookGenres && bookGenres.length > 0) {
      const unique = [...new Set(bookGenres)];
      setUniqueGenres(unique.filter((genre) => genre.trim() !== ""));
    }
  }, [bookGenres]);

  const handleFilterToggle = () => {
    setFilterOpen(!filterOpen);
    setSortOpen(false);
  };

  const handleCheckboxChangeInternal = (event) => {
    const { value } = event.target;
    const currentIndex = selectedGenres.indexOf(value);
    const newSelectedGenres = [...selectedGenres];

    if (currentIndex === -1) {
      newSelectedGenres.push(value);
    } else {
      newSelectedGenres.splice(currentIndex, 1);
    }

    setSelectedGenres(newSelectedGenres);
    handleCheckboxChange(event);
  };

  return (
    <div className="filterbuttons flex m-auto w-4/5 h-16 justify-between items-center relative text-white">
      {/* Sort Button */}
      <div className="relative">
        <Tabs
          key={"underlined"}
          variant={"underlined"}
          aria-label="Tabs variants"
          onClick={(e) => handleTabChange(e.target.innerText)}
        >
          <Tab key="All" title="All" onClick={() => handleTabChange("All")} />
          <Tab
            key="Currently Reading"
            selectedTab="Currently Reading"
            title="Currently Reading"
            onClick={() => handleTabChange("Currently Reading")}
          />
          <Tab
            key="Completed"
            title="Completed"
            onClick={() => handleTabChange("Completed")}
          />
        </Tabs>

        {/* Sort Dropdown */}
        {sortOpen && (
          <div className="absolute z-10 w-56 p-3 bg-white text-black rounded-lg shadow top-full left-0">
            <ul className="space-y-2 text-sm" aria-labelledby="dropdownDefault">
              {sortOptions.map((option, index) => (
                <li
                  key={index}
                  className={`${
                    sortOptionHome === option.value
                      ? "bg-black text-white rounded-lg"
                      : ""
                  } cursor-pointer p-1 hover:text-white rounded-lg  hover:bg-black`}
                  onClick={() => handleSortChange(option.value)} // Update here
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Filter Button */}
      <div className="relative filterbycategorybutton">
        <button
          className="text-white bg-black font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center"
          onClick={handleFilterToggle}
        >
          Categories
          <svg
            className={`w-4 h-4 ml-2 transform ${
              filterOpen ? "rotate-180" : "rotate-0"
            }`}
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {/* Filter Dropdown */}
        {filterOpen && (
          <div className="absolute z-10 w-56 p-3 bg-white rounded-lg shadow top-full left-0">
            <h6 className="mb-3 text-sm font-medium text-gray-900">Category</h6>
            <ul className="space-y-2 text-sm" aria-labelledby="dropdownDefault">
              {uniqueGenres.length > 0 ? (
                uniqueGenres.map((genre, index) => (
                  <li key={index} className="flex items-center">
                    <input
                      id={genre}
                      type="checkbox"
                      value={genre}
                      className="w-4 h-4 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                      onChange={handleCheckboxChangeInternal}
                      checked={selectedGenres.includes(genre)}
                    />
                    <label
                      htmlFor={genre}
                      className="ml-2 text-sm font-medium text-gray-900"
                    >
                      {genre}
                    </label>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">No genres available</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
