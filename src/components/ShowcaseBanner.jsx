"use client";

import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { localStorageDB } from '../utils/localStorageDB';

const ShowcaseBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't seen it before
    if (!localStorageDB.hasSeenShowcase()) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorageDB.markShowcaseSeen();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Info className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              📚 <strong>Showcase Mode:</strong> This is a demo version of BiblioPod running without a backend server due to budget constraints. 
              All data is stored locally in your browser and will be lost when you clear your browser data.
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="ml-4 flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ShowcaseBanner;