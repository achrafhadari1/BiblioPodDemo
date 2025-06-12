import { useState } from "react";
import axios from "axios";
import ePub from "epubjs";
import { toast } from "sonner";
import { localStorageDB } from "../../../utils/localStorageDB";

export const useFileUpload = (user, fetchBooks) => {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [bookGoogle, setbookGoogle] = useState([]);

  const storeBook = async (bookDetails, file) => {
    try {
      // Convert file to base64 for localStorage storage
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Create book object for localStorage
      const bookData = {
        id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: bookDetails.title,
        author: bookDetails.author,
        isbn: bookDetails.isbn,
        thumbnail: bookDetails.thumbnail,
        description: bookDetails.description,
        genre: bookDetails.genre,
        publisher: bookDetails.publisher,
        language: bookDetails.language,
        file_data: fileBase64, // Store the actual file data
        file_name: file.name,
        file_size: file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress: 0
      };

      // Add book to localStorage
      localStorageDB.addBook(bookData);

      toast("Book uploaded successfully!", {
        description: `"${bookDetails.title}" has been added to your library.`,
      });

      return { success: true, data: bookData };
    } catch (error) {
      console.error("Error storing book:", error);
      
      // Handle file size limitations
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        toast("Storage limit exceeded", {
          description: "Your browser's storage is full. Please delete some books to make space.",
        });
      } else if (error.message.includes('Invalid file')) {
        toast("Invalid file format", {
          description: "Please select a valid ePub file.",
        });
      } else {
        toast("Upload failed", {
          description: "An error occurred while storing the book. Please try again.",
        });
      }

      return { success: false, error: error };
    }
  };

  const parseEpub = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const book = ePub(reader.result);
          await book.ready;

          const meta = book.package.metadata;

          const bookInfo = {
            title: meta.title || "Unknown Title",
            author: meta.creator || "Unknown Author",
            publisher: meta.publisher || "Unknown Publisher",
            language: meta.language || "en",
          };

          resolve(bookInfo);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const fetchBookDetails = async (title, author, language, userId) => {
    const urlApi = `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}&printType=books&langRestrict=en`;

    try {
      const response = await axios.get(urlApi);
      const item = response.data.items[0];
      const bookDetails = item?.volumeInfo;
      const bookId = item?.id;

      setbookGoogle(bookDetails);

      return {
        thumbnail: bookId
          ? `https://books.google.com/books/publisher/content/images/frontcover/${bookId}?fife=w400-h600&source=gbs_api`
          : "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/800px-No-Image-Placeholder.svg.png",
        description: bookDetails?.description || "No description available",
        isbn:
          bookDetails?.industryIdentifiers?.[0]?.identifier ||
          `unknown-${userId}-${Date.now()}`,
        genre: Array.isArray(bookDetails?.categories)
          ? bookDetails.categories[0]
          : "Unknown",
      };
    } catch (error) {
      console.error("Error fetching book details from Google API:", error);
      return {};
    }
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length > 0) {
      setUploadLoading(true);
      try {
        const updatedFileDetails = [];
        const updatedBookGoogleDetails = [];

        for (const file of files) {
          const bookInfo = await parseEpub(file);
          const additionalDetails = await fetchBookDetails(
            bookInfo.title,
            bookInfo.author,
            bookInfo.language,
            user.id
          );
          const combinedDetails = {
            title: bookInfo.title || "Unknown Title",
            author: bookInfo.author || "Unknown Author",
            language: bookInfo.language || "en",
            publisher: bookInfo.publisher || "Unknown Publisher",
            ...additionalDetails,
          };
          updatedFileDetails.push(combinedDetails);
          updatedBookGoogleDetails.push({ ...additionalDetails });
        }

        // Store books and track results
        const uploadResults = await Promise.allSettled(
          updatedFileDetails.map((bookDetails, index) => {
            const singleFile = files[index];
            return storeBook(bookDetails, singleFile);
          })
        );

        // Count successful and failed uploads
        const successfulUploads = uploadResults.filter(
          (result) => result.status === "fulfilled" && result.value.success
        ).length;
        const failedUploads = uploadResults.filter(
          (result) =>
            result.status === "rejected" ||
            (result.status === "fulfilled" && !result.value.success)
        ).length;

        // Show summary toast if multiple files were uploaded
        if (files.length > 1) {
          if (successfulUploads > 0 && failedUploads === 0) {
            toast("All books uploaded successfully!", {
              description: `${successfulUploads} book${
                successfulUploads > 1 ? "s" : ""
              } added to your library.`,
            });
          } else if (successfulUploads > 0 && failedUploads > 0) {
            toast("Partial upload completed", {
              description: `${successfulUploads} book${
                successfulUploads > 1 ? "s" : ""
              } uploaded successfully, ${failedUploads} failed.`,
            });
          } else if (failedUploads > 0 && successfulUploads === 0) {
            toast("Upload failed", {
              description:
                "None of the selected books could be uploaded. Please check the files and try again.",
            });
          }
        }

        // Refresh the book list from localStorage
        await fetchBooks();

        setbookGoogle(updatedBookGoogleDetails);
      } catch (error) {
        console.error("Error processing ePub files:", error);
        toast("Error processing files", {
          description:
            "There was an error processing your ePub files. Please try again.",
        });
      } finally {
        setUploadLoading(false);
        event.target.value = "";
      }
    }
  };

  return {
    uploadLoading,
    bookGoogle,
    handleFileChange,
    storeBook,
    parseEpub,
    fetchBookDetails,
  };
};
