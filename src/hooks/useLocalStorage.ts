import isBrowser from "../utils/isBrowser";
import { useState } from "react";

export const useLocalStorage = <Item>(
  key: string,
  initialValue?: Item
): {
  key: string;
  value?: Item | undefined;
  getValue: () => Item | undefined;
  removeItem: () => void;
  setValue: (value: Item) => void;
  error?: string;
} => {
  const [error, setError] = useState<string>();

  const [storedValue, setStoredValue] = useState<Item | undefined>(() => {
    if (!isBrowser()) {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.log(err);
      setError(err as string);
      return initialValue;
    }
  });

  const getValue = () => {
    if (!isBrowser()) {
      return undefined;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : undefined;
    } catch (err) {
      console.log(err);
      setError(err as string);
      return undefined;
    }
  };

  const setValue = (value: Item) => {
    if (!isBrowser()) {
      return;
    }

    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.log(err);
      setError(err as string);
    }
  };

  const removeItem = () => {
    if (!isBrowser()) {
      return;
    }

    try {
      setStoredValue(undefined);
      window.localStorage.removeItem(key);
    } catch (err) {
      console.log(err);
      setError(err as string);
    }
  };

  return {
    key,
    value: storedValue,
    getValue,
    removeItem,
    setValue,
    error,
  };
};

export default useLocalStorage;
