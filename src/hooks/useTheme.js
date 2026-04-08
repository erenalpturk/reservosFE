import { useEffect, useState } from 'react';

const THEME_KEY = 'barberos-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return false;

  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    return false;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

const useTheme = () => {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);

    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // localStorage may be unavailable in some browsing contexts.
    }
  }, [isDark]);

  return {
    isDark,
    toggleTheme: () => setIsDark((prev) => !prev),
  };
};

export default useTheme;
