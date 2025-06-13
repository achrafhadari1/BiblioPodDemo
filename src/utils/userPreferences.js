/**
 * User Preferences Storage using IndexedDB
 * Stores user settings like theme, font preferences, etc.
 */

const DB_NAME = "BiblioPodUserPreferences";
const DB_VERSION = 1;
const STORE_NAME = "preferences";

class UserPreferencesDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open user preferences database");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create preferences store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });

          // Add default preferences
          const defaultPrefs = [
            { key: "theme", value: "light" },
            { key: "fontSize", value: 0.7 },
            { key: "fontFamily", value: "Lora" },
          ];

          store.transaction.oncomplete = () => {
            const prefStore = db
              .transaction([STORE_NAME], "readwrite")
              .objectStore(STORE_NAME);
            defaultPrefs.forEach((pref) => prefStore.add(pref));
          };
        }
      };
    });
  }

  async getPreference(key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  async setPreference(key, value) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllPreferences() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const preferences = {};
        request.result.forEach((item) => {
          preferences[item.key] = item.value;
        });
        resolve(preferences);
      };
    });
  }

  // Specific preference getters/setters for convenience
  async getTheme() {
    return (await this.getPreference("theme")) || "light";
  }

  async setTheme(theme) {
    return await this.setPreference("theme", theme);
  }

  async getFontSize() {
    return (await this.getPreference("fontSize")) || 0.7;
  }

  async setFontSize(fontSize) {
    return await this.setPreference("fontSize", fontSize);
  }

  async getFontFamily() {
    return (await this.getPreference("fontFamily")) || "Lora";
  }

  async setFontFamily(fontFamily) {
    return await this.setPreference("fontFamily", fontFamily);
  }
}

// Export singleton instance
export const userPreferencesDB = new UserPreferencesDB();
