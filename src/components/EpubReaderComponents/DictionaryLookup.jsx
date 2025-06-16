"use client";

import { useState, useEffect, useRef } from "react";
import { X, BookOpen, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DictionaryLookup = ({ selectedText, position, isVisible, onClose }) => {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pronunciation, setPronunciation] = useState(null);
  const containerRef = useRef(null);

  // Dictionary API lookup
  const lookupWord = async (word) => {
    if (!word || word.trim().length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Clean the word (remove punctuation, convert to lowercase)
      const cleanWord = word
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, "");

      // Try Free Dictionary API first
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const entry = data[0];
          setDefinition({
            word: entry.word,
            phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
            meanings: entry.meanings?.slice(0, 3) || [], // Limit to 3 meanings
            audio: entry.phonetics?.find((p) => p.audio)?.audio,
          });
          setPronunciation(entry.phonetics?.find((p) => p.audio)?.audio);
          return;
        }
      }

      // Fallback to a simple definition if API fails
      setDefinition({
        word: cleanWord,
        meanings: [
          {
            partOfSpeech: "word",
            definitions: [
              {
                definition:
                  "Definition not available. Try checking an online dictionary.",
              },
            ],
          },
        ],
      });
    } catch (err) {
      console.error("Dictionary lookup error:", err);
      setError(
        "Unable to fetch definition. Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  };

  // Lookup word when selectedText changes
  useEffect(() => {
    if (selectedText && isVisible) {
      lookupWord(selectedText);
    }
  }, [selectedText, isVisible]);

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

  // Play pronunciation
  const playPronunciation = () => {
    if (pronunciation) {
      const audio = new Audio(pronunciation);
      audio.play().catch((err) => {
        console.error("Audio playback failed:", err);
        toast.error("Audio not available");
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={containerRef}
        className="absolute z-[60] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translateX(-50%)",
        }}
      >
        <div className="relative p-4 rounded-lg bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm max-w-sm">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 rounded-full bg-gray-100 dark:bg-gray-700 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Close dictionary"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dictionary
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Looking up...</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 py-2">
              {error}
            </div>
          )}

          {definition && !loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {definition.word}
                </h3>
                {pronunciation && (
                  <button
                    onClick={playPronunciation}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Play pronunciation"
                  >
                    <Volume2 size={14} className="text-blue-600" />
                  </button>
                )}
              </div>

              {definition.phonetic && (
                <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {definition.phonetic}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {definition.meanings?.map((meaning, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-3">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                      {meaning.partOfSpeech}
                    </div>
                    {meaning.definitions?.slice(0, 2).map((def, defIndex) => (
                      <div
                        key={defIndex}
                        className="text-sm text-gray-700 dark:text-gray-300 mt-1"
                      >
                        {def.definition}
                        {def.example && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                            "{def.example}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryLookup;
