"use client"; // Ensure this runs only on the client

/**
 * Retrieves an item from local storage.
 * @param key The key of the item to retrieve.
 * @returns The parsed item, or null if not found or if running on the server.
 */
export function getLocalStorageItem<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    // Return null or a default value if on the server
    return null;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return null;
  }
}

/**
 * Stores an item in local storage.
 * @param key The key under which to store the item.
 * @param value The value to store. Must be JSON-serializable.
 * @returns True if the item was stored successfully, false otherwise.
 */
export function setLocalStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    // Cannot set item if on the server
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage key “${key}”:`, error);
    return false;
  }
}

/**
 * Removes an item from local storage.
 * @param key The key of the item to remove.
 * @returns True if the item was removed successfully, false otherwise.
 */
export function removeLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    // Cannot remove item if on the server
    return false;
  }
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key “${key}”:`, error);
    return false;
  }
}

/**
 * Clears all items from local storage.
 * @returns True if local storage was cleared successfully, false otherwise.
 */
export function clearLocalStorage(): boolean {
   if (typeof window === 'undefined') {
    // Cannot clear storage if on the server
     return false;
   }
   try {
     window.localStorage.clear();
     return true;
   } catch (error) {
     console.error(`Error clearing localStorage:`, error);
     return false;
   }
}
