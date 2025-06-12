import React, { useState, useEffect } from 'react';
import { bookStorageDB } from '../utils/bookStorageDB';

const StorageUsageIndicator = ({ className = "" }) => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    updateStorageInfo();
  }, []);

  const updateStorageInfo = async () => {
    try {
      setIsLoading(true);
      const info = await bookStorageDB.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStorageColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStorageTextColor = (percentage) => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 75) return 'text-yellow-600';
    if (percentage < 90) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading storage info...</span>
      </div>
    );
  }

  if (!storageInfo) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStorageColor(storageInfo.percentage)}`}
            style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
          ></div>
        </div>
        <span className={`text-xs font-medium ${getStorageTextColor(storageInfo.percentage)}`}>
          {storageInfo.percentage}%
        </span>
      </div>
      
      <div className="text-xs text-gray-600">
        <span className="font-medium">{storageInfo.used}</span>
        <span className="text-gray-400"> / </span>
        <span>{storageInfo.available}</span>
      </div>

      {storageInfo.percentage > 85 && (
        <div className="flex items-center">
          <svg className="w-4 h-4 text-orange-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-orange-600 font-medium">Storage Low</span>
        </div>
      )}
    </div>
  );
};

export default StorageUsageIndicator;