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

export function setParsedLocalStorageValue<T>(key: string, value: T) {
  try {
    // Save to local storage
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
}

export function useLocalStorage<T>(key: string) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T | undefined>(() =>
    getParsedLocalStorageValue(key)
  );

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value: T) => {
    setParsedLocalStorageValue(key, value);
    setStoredValue(value);
  };

  return [storedValue, setValue] as const;
}
