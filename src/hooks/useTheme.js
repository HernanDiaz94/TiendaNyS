import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  nextTheme,
  readTheme,
  THEME_STORAGE_KEY,
} from '../lib/theme.js';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(() => readTheme(getStorage()));

  useEffect(() => {
    applyTheme(document, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const value = nextTheme(current);
      try {
        getStorage()?.setItem(THEME_STORAGE_KEY, value);
      } catch {
        /* el cambio sigue funcionando aunque no se pueda persistir */
      }
      return value;
    });
  }, []);

  return { theme, toggleTheme };
}
