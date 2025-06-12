// Migration utility to transfer localStorage data to IndexedDB
import { bookStorageDB } from "./bookStorageDB";
import { localStorageDB } from "./localStorageDB";

export const migrateLocalStorageToIndexedDB = async () => {
  try {
    console.log(
      "[MIGRATION] Starting migration from localStorage to IndexedDB..."
    );

    // Initialize IndexedDB
    await bookStorageDB.init();

    // Check if migration has already been done
    const migrationFlag = localStorage.getItem(
      "bibliopod_migrated_to_indexeddb"
    );
    if (migrationFlag === "true") {
      console.log("[MIGRATION] Migration already completed, skipping...");
      return;
    }

    // Migrate books
    const localBooks = localStorageDB.getBooks();
    console.log(`[MIGRATION] Found ${localBooks.length} books in localStorage`);

    for (const book of localBooks) {
      try {
        console.log(`[MIGRATION] Migrating book: ${book.title}`);
        await bookStorageDB.addBook(book);
      } catch (error) {
        console.error(`[MIGRATION] Error migrating book ${book.title}:`, error);
      }
    }

    // Migrate user
    const localUser = localStorageDB.getUser();
    console.log(`[MIGRATION] Found user in localStorage:`, localUser);

    if (localUser) {
      try {
        console.log(`[MIGRATION] Migrating user: ${localUser.name}`);
        await bookStorageDB.addUser(localUser);
      } catch (error) {
        console.error(
          `[MIGRATION] Error migrating user ${localUser.name}:`,
          error
        );
      }
    }

    // Migrate reading progress
    console.log("[MIGRATION] Migrating reading progress...");
    for (const book of localBooks) {
      try {
        const progress = localStorageDB.getReadingProgress(book.isbn);
        if (
          progress &&
          (progress.current_percentage > 0 || progress.current_cfi)
        ) {
          await bookStorageDB.updateReadingProgress(
            book.isbn,
            progress.current_percentage,
            progress.current_cfi
          );
          console.log(
            `[MIGRATION] Migrated progress for ${book.title}: ${progress.current_percentage}%`
          );
        }
      } catch (error) {
        console.error(
          `[MIGRATION] Error migrating progress for ${book.title}:`,
          error
        );
      }
    }

    // Migrate annotations/highlights
    console.log("[MIGRATION] Migrating annotations...");
    for (const book of localBooks) {
      try {
        const annotations = localStorageDB.getAnnotations(book.isbn);
        for (const annotation of annotations) {
          await bookStorageDB.addAnnotation(book.isbn, annotation);
        }
        console.log(
          `[MIGRATION] Migrated ${annotations.length} annotations for ${book.title}`
        );
      } catch (error) {
        console.error(
          `[MIGRATION] Error migrating annotations for ${book.title}:`,
          error
        );
      }
    }

    // Migrate collections
    const localCollections = localStorageDB.getCollections();
    console.log(
      `[MIGRATION] Found ${localCollections.length} collections in localStorage`
    );

    for (const collection of localCollections) {
      try {
        console.log(`[MIGRATION] Migrating collection: ${collection.name}`);
        await bookStorageDB.addCollection(collection);
      } catch (error) {
        console.error(
          `[MIGRATION] Error migrating collection ${collection.name}:`,
          error
        );
      }
    }

    // Migrate challenges
    const localChallenges = localStorageDB.getChallenges();
    console.log(
      `[MIGRATION] Found ${localChallenges.length} challenges in localStorage`
    );

    for (const challenge of localChallenges) {
      try {
        console.log(`[MIGRATION] Migrating challenge: ${challenge.name}`);
        await bookStorageDB.addChallenge(challenge);
      } catch (error) {
        console.error(
          `[MIGRATION] Error migrating challenge ${challenge.name}:`,
          error
        );
      }
    }

    // Mark migration as complete
    localStorage.setItem("bibliopod_migrated_to_indexeddb", "true");
    console.log("[MIGRATION] Migration completed successfully!");

    return true;
  } catch (error) {
    console.error("[MIGRATION] Migration failed:", error);
    return false;
  }
};

// Auto-run migration when this module is imported
if (typeof window !== "undefined") {
  // Run migration after a short delay to ensure everything is loaded
  setTimeout(() => {
    // Temporarily disabled auto-migration to prevent errors
    // migrateLocalStorageToIndexedDB().catch(console.error);
    console.log("[MIGRATION] Auto-migration temporarily disabled");
  }, 1000);
}
