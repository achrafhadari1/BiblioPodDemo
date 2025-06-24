"use client";

import { useState } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";

function ReaderComparison() {
  const [selectedBook, setSelectedBook] = useState("test-book");

  const books = [
    { id: "test-book", name: "Test Book" },
    { id: "test", name: "Test EPUB" },
    { id: "test2", name: "Test Book 2" },
    { id: "test3", name: "Test Book 3" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          EPUB Reader Comparison
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Select a Book to Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book.id)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedBook === book.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                {book.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Original epubjs Reader */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
              ❌ Original epubjs Reader
            </h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <span>Jumping issues in scrolled mode</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <span>Position adjustments during navigation</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <span>Inconsistent scroll behavior</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <span>Memory inefficient</span>
              </div>
            </div>
            <Link href={`/reader?book=${selectedBook}`}>
              <Button
                color="danger"
                variant="solid"
                className="w-full"
                size="lg"
              >
                Test Original Reader
              </Button>
            </Link>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Experience the jumping issues
            </p>
          </div>

          {/* Custom Scroll Manager Reader */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
              ✅ Custom Scroll Manager
            </h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>No jumping - smooth scrolling</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Stable chapter navigation</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Consistent behavior</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Memory efficient</span>
              </div>
            </div>
            <Link href={`/reader-custom?book=${selectedBook}`}>
              <Button
                color="success"
                variant="solid"
                className="w-full"
                size="lg"
              >
                Test Custom Reader
              </Button>
            </Link>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Smooth, jump-free experience
            </p>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            How to Test
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>Select a book above</li>
            <li>Open both readers in separate tabs</li>
            <li>Switch to scrolled mode in the original reader</li>
            <li>Navigate between chapters and scroll through content</li>
            <li>
              Notice the jumping behavior in the original vs smooth scrolling in
              the custom version
            </li>
            <li>
              Test font changes, theme switching, and mobile swipe gestures
            </li>
          </ol>
        </div>

        <div className="mt-8 bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Technical Details</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Original epubjs Issues:</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Automatic content loading/unloading</li>
                <li>• Scroll position corrections</li>
                <li>• Race conditions in event handling</li>
                <li>• Memory leaks with large books</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Custom Manager Solutions:</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Predictable section loading</li>
                <li>• No automatic position adjustments</li>
                <li>• Smooth section transitions</li>
                <li>• Efficient memory management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReaderComparison;
