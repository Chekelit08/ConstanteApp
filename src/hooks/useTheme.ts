import { useEffect, useState } from 'react';
import { ThemeMode } from '../types/settings';

export function useTheme(userTheme: ThemeMode = 'system', accentColor: string = '#E11D48') {
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let isDark = false;
      if (userTheme === 'dark') {
        isDark = true;
      } else if (userTheme === 'light') {
        isDark = false;
      } else {
        // System
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
        setResolvedTheme('dark');
      } else {
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
    };

    applyTheme();

    // Listen for system changes if mode is 'system'
    if (userTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
          setResolvedTheme('dark');
        } else {
          root.classList.remove('dark');
          setResolvedTheme('light');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [userTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
  }, [accentColor]);

  return { resolvedTheme };
}
