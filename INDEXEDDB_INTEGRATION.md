# IndexedDB Integration Guide

## Quick Start

Since you have no existing books, you can simply replace the localStorage implementation with IndexedDB for much better storage capacity.

## Files Created

1. **`src/utils/bookStorageDB.js`** - IndexedDB storage implementation
2. **`src/components/homepage/hooks/useFileUploadImproved.js`** - Updated upload hook
3. **`src/components/StorageUsageIndicator.jsx`** - Storage monitoring component

## Integration Steps

### 1. Replace the Upload Hook

In your component that handles file uploads, replace the import:

```javascript
// Replace this:
import { useFileUpload } from "./hooks/useFileUpload";

// With this:
import { useFileUploadImproved } from "./hooks/useFileUploadImproved";
```

### 2. Update Book Fetching

Replace localStorage book fetching with IndexedDB:

```javascript
// Replace localStorage calls:
// const books = localStorageDB.getBooks();

// With IndexedDB calls:
import { bookStorageDB } from "../utils/bookStorageDB";
const books = await bookStorageDB.getAllBooks();
```

### 3. Add Storage Monitoring (Optional)

Add the storage usage indicator to your UI:

```javascript
import StorageUsageIndicator from "../components/StorageUsageIndicator";

// In your component:
<StorageUsageIndicator className="mb-4" />
```

### 4. Update Book Reading

When opening books for reading, use the new file retrieval method:

```javascript
// Replace base64 file access:
// const fileData = book.file_data;

// With IndexedDB file access:
const file = await bookStorageDB.getBookFile(book.isbn);
if (file) {
  // Use the File object directly with ePub.js
  const book = ePub(file);
}
```

## Key Benefits

- **10-100x more storage** (GB instead of MB)
- **No base64 conversion** (files stored as binary)
- **Better performance** with large files
- **No more quota exceeded errors**
- **Real-time storage monitoring**

## API Reference

### bookStorageDB Methods

```javascript
// Add a book with file
await bookStorageDB.addBook(bookMetadata, file);

// Get book metadata
const book = await bookStorageDB.getBook(isbn);

// Get book file for reading
const file = await bookStorageDB.getBookFile(isbn);

// Get all books
const books = await bookStorageDB.getAllBooks();

// Update book metadata
await bookStorageDB.updateBook(isbn, updates);

// Delete a book
await bookStorageDB.deleteBook(isbn);

// Get storage usage
const usage = await bookStorageDB.getStorageUsage();
```

### Storage Usage Object

```javascript
{
  used: "15.2 MB",           // Human readable used space
  available: "1.2 GB",       // Human readable total space
  percentage: 12,            // Usage percentage
  usedBytes: 15925248,       // Raw bytes used
  availableBytes: 1288490188 // Raw bytes available
}
```

## Error Handling

The new implementation includes better error handling:

- **Quota warnings** when storage is >90% full
- **Pre-upload checks** to prevent quota exceeded errors
- **Graceful fallbacks** for unsupported browsers
- **Clear error messages** with actionable suggestions

## Browser Support

IndexedDB is supported in all modern browsers:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

For older browsers, the system will fall back to localStorage with appropriate warnings.

## Testing

To test the implementation:

1. Upload a few large ePub files (>5MB each)
2. Verify they upload successfully without quota errors
3. Check the storage usage indicator
4. Open books to ensure they read correctly
5. Delete books and verify storage usage decreases

## Migration from localStorage

If you later need to migrate existing localStorage data, you can use the migration helper pattern, but since you have no existing books, this isn't necessary.