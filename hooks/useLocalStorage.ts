// FIX: Add React default import to resolve 'React' namespace for types.
import React, { useState, useEffect } from 'react';

function getValue<T,>(key: string, initialValue: T | (() => T)): T {
  const savedValue = localStorage.getItem(key);
  if (savedValue !== null) {
    try {
      return JSON.parse(savedValue);
    } catch (e) {
      console.error(`Error parsing JSON from localStorage key "${key}":`, e);
      localStorage.removeItem(key);
    }
  }

  if (initialValue instanceof Function) {
    return initialValue();
  }
  return initialValue;
}

export function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => getValue(key, initialValue));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}