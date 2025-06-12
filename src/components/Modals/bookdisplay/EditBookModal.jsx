import React, { useState, useEffect } from "react";
import { MdUploadFile } from "react-icons/md";
import { toast } from "sonner";
import { bookStorageDB } from "../../../utils/bookStorageDB";

export const EditBookModal = ({
  isOpen,
  closeModal,
  identifier,
  userId,
  updateBookData,
}) => {
  const [bookData, setBookData] = useState({});
  const [updateErrorMessage, setUpdateErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Define formData as local state
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    genre: "",
    language: "",
    description: "",
    thumbnail: "", // Initialize thumbnail as empty
  });

  useEffect(() => {
    const fetchBook = async () => {
      try {
        console.log("Fetching book from IndexedDB:", identifier);

        // Get book from IndexedDB
        const bookInfo = await bookStorageDB.getBook(identifier.toString());

        if (bookInfo) {
          setBookData(bookInfo);
          setFormData({
            title: bookInfo.title || "",
            author: bookInfo.author || "",
            genre: bookInfo.genre || "",
            language: bookInfo.language || "",
            description: bookInfo.description || "",
            thumbnail: bookInfo.thumbnail || "",
          });
        } else {
          console.error("Book not found in IndexedDB");
          toast.error("Book not found");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book data:", error);
        setLoading(false);
      }
    };
    fetchBook();
  }, [identifier, userId]); // Include identifier and userId in the dependency array

  // Function to check if there are changes
  const checkForChanges = (newFormData) => {
    const fieldsToCheck = [
      "title",
      "author",
      "genre",
      "language",
      "description",
      "thumbnail",
    ];
    const hasFieldChanges = fieldsToCheck.some(
      (field) => newFormData[field] !== bookData[field]
    );
    setHasChanges(hasFieldChanges);
  };

  const handleChange = (e) => {
    const { id, value, files } = e.target;

    if (id === "file-input" && files[0]) {
      const file = files[0];

      // Check if file exceeds 2MB
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large", {
          description: "Please upload an image smaller than 2MB.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newFormData = {
          ...formData,
          thumbnail: reader.result, // Update with base64
        };
        setFormData(newFormData);
        checkForChanges(newFormData);
      };
      reader.readAsDataURL(file);
    } else {
      const newFormData = {
        ...formData,
        [id]: value,
      };
      setFormData(newFormData);
      checkForChanges(newFormData);
    }
  };

  const handleUpdate = async () => {
    try {
      // Validation and preparation of data
      const requiredFields = ["title", "author"];
      for (const field of requiredFields) {
        if (!formData[field]) {
          setUpdateErrorMessage(`${field} is required`);
          return;
        }
      }

      const updatedFormData = { ...formData };

      // Include thumbnail in the update data - IndexedDB can handle base64 strings
      // No need to delete the thumbnail field as IndexedDB can store it directly

      // Update book in IndexedDB
      const success = await bookStorageDB.updateBook(
        identifier.toString(),
        updatedFormData
      );

      if (success) {
        // Call the updateBookData with the updated data including the isbn
        updateBookData({ ...updatedFormData, isbn: identifier.toString() });
        closeModal();
        toast("This book has been Edited", {
          description: "The selected book has been successfully Edited.",
        });
      } else {
        throw new Error("Failed to update book in IndexedDB");
      }
    } catch (error) {
      console.error("Error Editing book:", error);
      toast("Error Editing book", {
        description: "There was an issue Editing the book. Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mx-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-gray-600 text-sm sm:text-base">
              Loading book details...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="p-4 sm:p-6">
          {/* Modal Header */}
          <h2 className="font-playfair text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            Edit Book Details
          </h2>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Form Section */}
            <div className="flex-1 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter book title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  id="author"
                  type="text"
                  placeholder="Enter book author"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                <input
                  id="genre"
                  type="text"
                  placeholder="Enter book genre"
                  value={formData.genre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <input
                  id="language"
                  type="text"
                  placeholder="Enter book language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows="4"
                  placeholder="Write your thoughts here..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Image Section */}
            <div className="w-full lg:w-64 lg:flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Cover
              </label>
              <div className="relative">
                <div className="w-full h-48 sm:h-64 lg:h-80 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  {formData.thumbnail ? (
                    <div className="relative w-full h-full">
                      <img
                        className="w-full h-full object-cover rounded-lg"
                        src={formData.thumbnail}
                        alt="Book Cover"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=687&auto=format&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                        <label htmlFor="file-input" className="cursor-pointer">
                          <MdUploadFile className="w-8 h-8 text-white" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="file-input"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <MdUploadFile className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        Upload cover image
                      </span>
                    </label>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-4 sm:mt-6 pt-4 border-t">
            <button
              onClick={closeModal}
              type="button"
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              type="button"
              disabled={!hasChanges}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors order-1 sm:order-2 ${
                hasChanges
                  ? "!bg-amber-600 text-white hover:bg-amber-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {hasChanges ? "Save Changes" : "No Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
