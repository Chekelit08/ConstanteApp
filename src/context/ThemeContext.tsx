import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeMode } from '../types/settings';

interface ThemeContextType {
  themeMode: ThemeMode;
  accentColor: string;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(225, 29, 72, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ThemeProvider: React.FC<{
  initialTheme?: ThemeMode;
  initialAccent?: string;
  onPersist?: (theme: ThemeMode, accent: string) => void;
  children: React.ReactNode;
}> = ({ initialTheme, initialAccent, onPersist, children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (initialTheme) return initialTheme;
    const saved = localStorage.getItem('constante_theme_mode');
    return (saved as ThemeMode) || 'light';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (initialAccent) return initialAccent;
    const saved = localStorage.getItem('constante_accent_color');
    return saved || '#E11D48';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to prefers-color-scheme live in system mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = useMemo<'light' | 'dark'>(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return systemIsDark ? 'dark' : 'light';
  }, [themeMode, systemIsDark]);

  // Apply to DOM on state change
  useEffect(() => {
    const root = document.documentElement;

    // Apply data-theme attribute and dark class
    root.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Handle accent color
    const isInk =
      accentColor === 'ink' ||
      accentColor === '#171717' ||
      accentColor === '#121212' ||
      accentColor === '#141412';

    let actualAccent = accentColor;
    let accentContrast = '#FFFFFF';
    let accentSubtle = 'rgba(225, 29, 72, 0.12)';

    if (isInk) {
      if (effectiveTheme === 'dark') {
        actualAccent = '#F5F5F0'; // Blanco hueso contrastante sobre fondo oscuro
        accentContrast = '#121211';
        accentSubtle = 'rgba(245, 245, 240, 0.2)';
      } else {
        actualAccent = '#141412'; // Tinta negra pura sobre papel blanco hueso
        accentContrast = '#FFFFFF';
        accentSubtle = 'rgba(20, 20, 18, 0.14)';
      }
    } else {
      actualAccent = accentColor;
      accentContrast = '#FFFFFF';
      accentSubtle = hexToRgba(accentColor, effectiveTheme === 'dark' ? 0.22 : 0.12);
    }

    root.style.setProperty('--color-accent', actualAccent);
    root.style.setProperty('--color-accent-contrast', accentContrast);
    root.style.setProperty('--color-accent-subtle', accentSubtle);

    // Update meta theme-color tag dynamically for mobile browser header
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#121211' : '#F8F8F5');
    }

    // Persist to localStorage
    localStorage.setItem('constante_theme_mode', themeMode);
    localStorage.setItem('constante_accent_color', accentColor);
  }, [themeMode, accentColor, effectiveTheme]);

  // Sync if props change externally
  useEffect(() => {
    if (initialTheme && initialTheme !== themeMode) {
      setThemeModeState(initialTheme);
    }
  }, [initialTheme]);

  useEffect(() => {
    if (initialAccent && initialAccent !== accentColor) {
      setAccentColorState(initialAccent);
    }
  }, [initialAccent]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (onPersist) onPersist(mode, accentColor);
  };

  const setAccentColor = (accent: string) => {
    setAccentColorState(accent);
    if (onPersist) onPersist(themeMode, accent);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        accentColor,
        effectiveTheme,
        setThemeMode,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
