import { useState } from "react";

export function getParsedLocalStorageValue<T>(key: string): T | undefined {
  try {
    // Get from local storage by key
    const item = window.localStorage.getItem(key);

    // Parse stored json or if none return initialValue
    if (item) return JSON.parse(item);
  } catch (error) {
    console.error(error);
  }
  return undefined;
}

export function useLocalStorage<T>(key: string) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T | undefined>(() =>
    getParsedLocalStorageValue(key)
  );

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
