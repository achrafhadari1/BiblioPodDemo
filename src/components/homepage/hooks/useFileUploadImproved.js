import { useState } from "react";
import axios from "axios";
import ePub from "epubjs";
import { toast } from "sonner";
import { bookStorageDB } from "../../../utils/bookStorageDB";

export const useFileUploadImproved = (user, fetchBooks) => {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [bookGoogle, setbookGoogle] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);

  // Get storage usage information
  const updateStorageUsage = async () => {
    try {
      const usage = await bookStorageDB.getStorageUsage();
      setStorageUsage(usage);
      return usage;
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  };

  const storeBook = async (bookDetails, file) => {
    try {
      // Check storage before attempting upload
      const usage = await updateStorageUsage();
      if (usage && usage.percentage > 90) {
        toast("Storage almost full", {
          description: `Storage is ${usage.percentage}% full (${usage.used}/${usage.available}). Consider deleting some books.`,
        });
      }

      // Create book object for IndexedDB
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
        progress: 0
      };

      // Store book in IndexedDB (much more efficient than localStorage)
      const result = await bookStorageDB.addBook(bookData, file);

      if (result.success) {
        toast("Book uploaded successfully!", {
          description: `"${bookDetails.title}" has been added to your library.`,
        });

        // Update storage usage after successful upload
        await updateStorageUsage();

        return { success: true, data: result.data };
      } else {
        throw new Error('Failed to store book');
      }
    } catch (error) {
      console.error("Error storing book:", error);
      
      // Handle different types of errors
      if (error.message.includes('quota') || error.name === 'QuotaExceededError') {
        const usage = await updateStorageUsage();
        toast("Storage limit exceeded", {
          description: usage 
            ? `Storage is full (${usage.used}/${usage.available}). Please delete some books to make space.`
            : "Your browser's storage is full. Please delete some books to make space.",
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
        // Check available storage before processing files
        const usage = await updateStorageUsage();
        if (usage && usage.percentage > 95) {
          toast("Storage critically full", {
            description: `Storage is ${usage.percentage}% full. Please delete some books before uploading new ones.`,
          });
          setUploadLoading(false);
          return;
        }

        // Calculate approximate file sizes
        const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
        const estimatedSizeMB = (totalFileSize / (1024 * 1024)).toFixed(1);
        
        if (files.length > 1) {
          toast(`Processing ${files.length} books`, {
            description: `Total size: ~${estimatedSizeMB}MB. This may take a moment...`,
          });
        }

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

        // Refresh the book list
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

  // Function to get a book file for reading
  const getBookFile = async (isbn) => {
    try {
      return await bookStorageDB.getBookFile(isbn);
    } catch (error) {
      console.error('Error retrieving book file:', error);
      return null;
    }
  };

  // Function to delete a book
  const deleteBook = async (isbn) => {
    try {
      const success = await bookStorageDB.deleteBook(isbn);
      if (success) {
        toast("Book deleted", {
          description: "The book has been removed from your library.",
        });
        await updateStorageUsage();
        await fetchBooks();
      }
      return success;
    } catch (error) {
      console.error('Error deleting book:', error);
      toast("Delete failed", {
        description: "Failed to delete the book. Please try again.",
      });
      return false;
    }
  };

  return {
    uploadLoading,
    bookGoogle,
    storageUsage,
    handleFileChange,
    storeBook,
    parseEpub,
    fetchBookDetails,
    getBookFile,
    deleteBook,
    updateStorageUsage,
  };
};