"use client"; // Ensure this runs only on the client

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/local-storage';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Get from local storage then parse stored json or return initialValue
    // This part only runs on the client initially
    if (typeof window === 'undefined') {
      return initialValue;
    }
    const item = getLocalStorageItem<T>(key);
    return item !== null ? item : initialValue;
  });

   // Effect to update local storage when storedValue changes
   useEffect(() => {
     // Only run this effect on the client
     if (typeof window !== 'undefined') {
       setLocalStorageItem<T>(key, storedValue);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key, storedValue]); // Only re-run if key or storedValue changes


  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToStore);
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.error(error);
      }
    },
    [storedValue] // Include storedValue in dependency array
  );


  // Effect to listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === window.localStorage) {
        try {
           if (event.newValue) {
              setStoredValue(JSON.parse(event.newValue) as T);
           } else {
              // Handle case where item is removed or cleared
              setStoredValue(initialValue);
           }
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]); // Re-run if key or initialValue changes

  return [storedValue, setValue];
}

export default useLocalStorage;
