"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  Download,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthContext } from "../../context/AuthContext";

export const Settings = () => {
  const router = useRouter();
  const { user, logout, getUser } = useAuthContext();

  // User profile states
  const [userProfile, setUserProfile] = useState({
    name: "",
  });

  // App settings states
  const [fontSize, setFontSize] = useState("medium");
  const [theme, setTheme] = useState("light");
  const [showBookActivity, setShowBookActivity] = useState(true);

  // Modals
  const [isConfirmClearCacheOpen, setIsConfirmClearCacheOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Delete account confirmation
  const [deletePassword, setDeletePassword] = useState("");

  // Export/Import selection states
  const [exportSelection, setExportSelection] = useState({
    books: true,
    collections: true,
    highlights: true,
    progress: true,
    challenges: true,
    settings: true,
  });

  const [exportWithFiles, setExportWithFiles] = useState(true);

  const [importSelection, setImportSelection] = useState({
    books: true,
    collections: true,
    highlights: true,
    progress: true,
    challenges: true,
    settings: true,
  });

  const [importFile, setImportFile] = useState(null);

  // Initialize user profile data
  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.name || "",
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { bookStorageDB } = await import("../../utils/bookStorageDB");

      // Update user data in IndexedDB
      const updatedUser = {
        ...user,
        name: userProfile.name,
        updated_at: new Date().toISOString(),
      };

      await bookStorageDB.setUser(updatedUser);
      await getUser(); // Refresh user data
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);

    try {
      // Clear browser cache and temporary data
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }

      // Clear localStorage items except authentication
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      localStorage.clear();

      // Restore critical items
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", user);

      setIsClearing(false);
      setIsConfirmClearCacheOpen(false);
      toast.success("Cache cleared successfully");
    } catch (error) {
      console.error("Error clearing cache:", error);
      setIsClearing(false);
      setIsConfirmClearCacheOpen(false);
      toast.error("Failed to clear cache");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please confirm by typing 'DELETE' to delete your account");
      return;
    }

    if (deletePassword !== "DELETE") {
      toast.error("Please type 'DELETE' exactly to confirm account deletion");
      return;
    }

    setIsDeleting(true);

    try {
      // Clear all data from IndexedDB
      await logout();
      toast.success("Account deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Account deletion error:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      setIsDeleteAccountOpen(false);
      setDeletePassword("");
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);

    try {
      const JSZip = (await import("jszip")).default;
      const { bookStorageDB } = await import("../../utils/bookStorageDB");

      const zip = new JSZip();
      const exportData = {};

      // Export selected data types
      if (exportSelection.books) {
        const books = await bookStorageDB.getAllBooks();
        exportData.books = books;
        zip.file("books.json", JSON.stringify(books, null, 2));

        // Also export the actual book files if requested
        if (exportWithFiles) {
          const booksFolder = zip.folder("book_files");
          for (const book of books) {
            try {
              const bookFile = await bookStorageDB.getBookFile(book.isbn);
              if (bookFile) {
                // Add the actual file to the zip
                booksFolder.file(`${book.isbn}.epub`, bookFile);
              }
            } catch (error) {
              console.warn(
                `Could not export file for book ${book.isbn}:`,
                error
              );
            }
          }
        }
      }

      if (exportSelection.collections) {
        const collections = await bookStorageDB.getCollections();
        exportData.collections = collections;
        zip.file("collections.json", JSON.stringify(collections, null, 2));
      }

      if (exportSelection.highlights) {
        const highlights = await bookStorageDB.getHighlights();
        exportData.highlights = highlights;
        zip.file("highlights.json", JSON.stringify(highlights, null, 2));
      }

      if (exportSelection.progress) {
        const books = await bookStorageDB.getAllBooks();
        const progressData = [];
        for (const book of books) {
          const progress = await bookStorageDB.getReadingProgress(book.isbn);
          if (progress && progress.current_percentage > 0) {
            progressData.push({ isbn: book.isbn, ...progress });
          }
        }
        exportData.progress = progressData;
        zip.file(
          "reading_progress.json",
          JSON.stringify(progressData, null, 2)
        );
      }

      if (exportSelection.challenges) {
        const challenges = await bookStorageDB.getChallenges();
        exportData.challenges = challenges;
        zip.file("challenges.json", JSON.stringify(challenges, null, 2));
      }

      if (exportSelection.settings) {
        const settings = await bookStorageDB.getSettings();
        exportData.settings = settings;
        zip.file("settings.json", JSON.stringify(settings, null, 2));
      }

      // Add metadata
      const metadata = {
        exportDate: new Date().toISOString(),
        appVersion: "1.0.0",
        dataTypes: Object.keys(exportSelection).filter(
          (key) => exportSelection[key]
        ),
      };
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bibliopod-backup-${
        new Date().toISOString().split("T")[0]
      }.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    setIsImporting(true);

    try {
      const JSZip = (await import("jszip")).default;
      const { bookStorageDB } = await import("../../utils/bookStorageDB");

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(importFile);

      let importedCount = 0;

      // Import selected data types
      if (importSelection.books && zipContent.files["books.json"]) {
        const booksData = JSON.parse(
          await zipContent.files["books.json"].async("text")
        );
        for (const book of booksData) {
          try {
            // Always import/update the book (merge with existing or add new)
            const bookMetadata = { ...book };
            delete bookMetadata.file_data; // Remove any file data for import

            // Check if the book file exists in the zip
            const bookFilePath = `book_files/${book.isbn}.epub`;
            let bookFile = null;

            if (zipContent.files[bookFilePath]) {
              // Get the book file from the zip
              const fileBlob = await zipContent.files[bookFilePath].async(
                "blob"
              );
              bookFile = new File(
                [fileBlob],
                book.file_name || `${book.isbn}.epub`,
                {
                  type: book.file_type || "application/epub+zip",
                }
              );
            }

            if (bookFile) {
              // Use the addBook method which handles both metadata and file
              await bookStorageDB.addBook(bookMetadata, bookFile);
            } else {
              // If no file, just add metadata (for metadata-only imports)
              if (!bookStorageDB.db) await bookStorageDB.init();
              const transaction = bookStorageDB.db.transaction(
                ["books"],
                "readwrite"
              );
              const store = transaction.objectStore("books");
              await bookStorageDB.promisifyRequest(
                store.put({
                  ...bookMetadata,
                  created_at:
                    bookMetadata.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
              );
            }
            importedCount++;
          } catch (error) {
            console.warn(`Failed to import book ${book.isbn}:`, error);
          }
        }
      }

      if (importSelection.collections && zipContent.files["collections.json"]) {
        const collectionsData = JSON.parse(
          await zipContent.files["collections.json"].async("text")
        );
        for (const collection of collectionsData) {
          // Check if collection already exists
          const existingCollections = await bookStorageDB.getCollections();
          const exists = existingCollections.find(
            (c) => c.id === collection.id
          );

          if (exists) {
            // Update existing collection
            await bookStorageDB.updateCollection(collection.id, {
              collection_name: collection.collection_name,
              collection_description: collection.collection_description || "",
              books: collection.books || [],
            });
          } else {
            // Add new collection
            await bookStorageDB.addCollection({
              collection_name: collection.collection_name,
              collection_description: collection.collection_description || "",
              books: collection.books || [],
            });
          }
          importedCount++;
        }
      }

      if (importSelection.highlights && zipContent.files["highlights.json"]) {
        const highlightsData = JSON.parse(
          await zipContent.files["highlights.json"].async("text")
        );
        for (const highlight of highlightsData) {
          // Check if highlight already exists
          const existingHighlights = await bookStorageDB.getHighlights();
          const exists = existingHighlights.find((h) => h.id === highlight.id);
          if (!exists) {
            // Remove the id so a new one is generated
            const { id, ...highlightData } = highlight;
            await bookStorageDB.addHighlight(highlightData);
            importedCount++;
          }
        }
      }

      if (
        importSelection.progress &&
        zipContent.files["reading_progress.json"]
      ) {
        const progressData = JSON.parse(
          await zipContent.files["reading_progress.json"].async("text")
        );
        for (const progress of progressData) {
          await bookStorageDB.updateReadingProgress(
            progress.isbn,
            progress.current_percentage,
            progress.current_cfi,
            progress.lastRead
          );
          importedCount++;
        }
      }

      if (importSelection.challenges && zipContent.files["challenges.json"]) {
        const challengesData = JSON.parse(
          await zipContent.files["challenges.json"].async("text")
        );
        for (const challenge of challengesData) {
          // Check if challenge already exists
          const existingChallenges = await bookStorageDB.getChallenges();
          const exists = existingChallenges.find((c) => c.id === challenge.id);
          if (!exists) {
            // Remove the id so a new one is generated
            const { id, ...challengeData } = challenge;
            await bookStorageDB.addChallenge(challengeData);
            importedCount++;
          }
        }
      }

      if (importSelection.settings && zipContent.files["settings.json"]) {
        const settingsData = JSON.parse(
          await zipContent.files["settings.json"].async("text")
        );
        for (const [key, value] of Object.entries(settingsData)) {
          await bookStorageDB.updateSettings({ [key]: value });
          importedCount++;
        }
      }

      setIsImportModalOpen(false);
      setImportFile(null);

      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} new items!`);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.info("No new items to import - all data already exists!");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data. Please check the file format.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full lg:w-[96%] lg:ml-auto flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-0 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center mb-8 mt-8 responsive-margin-phone-ipad">
        <button
          onClick={() => router.push("/library")}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-playfair text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - User Profile */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">User Profile</h2>

            <form onSubmit={handleProfileUpdate}>
              <div className="flex flex-col md:flex-row gap-8 mb-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-3">
                    <img
                      src="/profile.jpg"
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  </div>
                  <p className="text-sm text-gray-500">Profile Picture</p>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userProfile.name}
                        onChange={(e) =>
                          setUserProfile({
                            ...userProfile,
                            name: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <User size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="!bg-amber-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-amber-600 transition-colors disabled:bg-amber-300"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Reading Preferences */}
          {/* <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">Reading Preferences</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Font Size
                </label>
                <div className="flex gap-3">
                  {["small", "medium", "large"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`px-4 py-2 rounded-full text-sm flex-1 ${
                        fontSize === size
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Theme
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${
                      theme === "light"
                        ? "border-amber-500 bg-amber-50 text-amber-500"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Sun size={18} />
                    <span>Light</span>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border ${
                      theme === "dark"
                        ? "border-amber-500 bg-amber-50 text-amber-500"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Moon size={18} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700">
                    Show Reading Activity
                  </label>
                  <p className="text-sm text-gray-500">
                    Display your reading progress on your profile
                  </p>
                </div>
                <button
                  onClick={() => setShowBookActivity(!showBookActivity)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    showBookActivity ? "bg-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      showBookActivity ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div> 
            </div>
          </div> */}
        </div>

        {/* Right column - Account & Data */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Backup & Restore</h2>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full flex items-center justify-between p-3 mb-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-full">
                  <Download size={18} className="text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-xs text-gray-500">
                    Download your books & data as backup
                  </div>
                </div>
              </div>
              <ArrowLeft
                size={16}
                className="transform rotate-180 text-gray-400"
              />
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-full">
                  <Upload size={18} className="text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Import Data</div>
                  <div className="text-xs text-gray-500">
                    Restore from a backup file
                  </div>
                </div>
              </div>
              <ArrowLeft
                size={16}
                className="transform rotate-180 text-gray-400"
              />
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Data Management</h2>

            <button
              onClick={() => setIsConfirmClearCacheOpen(true)}
              className="w-full flex items-center justify-between p-3 mb-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-full">
                  <RefreshCw size={18} className="text-amber-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Clear Cache</div>
                  <div className="text-xs text-gray-500">
                    Clear browser cache & temporary data
                  </div>
                </div>
              </div>
              <ArrowLeft
                size={16}
                className="transform rotate-180 text-gray-400"
              />
            </button>

            <button
              onClick={() => setIsDeleteAccountOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Delete Account</div>
                  <div className="text-xs text-gray-500">
                    Delete all books, collections & data
                  </div>
                </div>
              </div>
              <ArrowLeft
                size={16}
                className="transform rotate-180 text-gray-400"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Clear Cache Confirmation Modal */}
      {isConfirmClearCacheOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4">
              Clear Cache
            </h2>

            <p className="text-gray-600 mb-6">
              This will clear browser cache and temporary data to free up space
              and resolve potential issues. Your books, collections, and reading
              progress will remain safe.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmClearCacheOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                onClick={handleClearCache}
                className={`px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2`}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Clear Cache"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteAccountOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4 text-red-600">
              Delete Account
            </h2>

            <p className="text-gray-600 mb-4">
              <strong>⚠️ WARNING:</strong> This will permanently delete ALL your
              data including books, collections, reading progress, highlights,
              and challenges. This action cannot be undone!
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteAccountOpen(false);
                  setDeletePassword("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2`}
                disabled={isDeleting || !deletePassword}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Data Modal */}
      {isExportModalOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4 text-green-600">
              Export Data
            </h2>

            <p className="text-gray-600 mb-4">
              Select the data you want to export. A zip file will be downloaded
              containing your selected data.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                <strong>📚 Books:</strong> Includes both metadata and actual
                EPUB files for complete backup.
                <br />
                <strong>⚠️ Note:</strong> File size may be large depending on
                your library size.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {Object.entries(exportSelection).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setExportSelection({
                        ...exportSelection,
                        [key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key === "progress" ? "Reading Progress" : key}
                  </span>
                </label>
              ))}

              {exportSelection.books && (
                <div className="ml-6 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportWithFiles}
                      onChange={(e) => setExportWithFiles(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-600">
                      Include EPUB files (larger download)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                disabled={
                  isExporting || !Object.values(exportSelection).some(Boolean)
                }
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {isImportModalOpen && (
        <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative animate-fadeIn">
            <h2 className="font-playfair text-2xl font-bold mb-4 text-blue-600">
              Import Data
            </h2>

            <p className="text-gray-600 mb-4">
              Select a backup file to import and choose which data types to
              restore.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Backup File:
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Import Options:
              </p>
              {Object.entries(importSelection).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setImportSelection({
                        ...importSelection,
                        [key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key === "progress" ? "Reading Progress" : key}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                onClick={handleImportData}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                disabled={
                  isImporting ||
                  !importFile ||
                  !Object.values(importSelection).some(Boolean)
                }
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
