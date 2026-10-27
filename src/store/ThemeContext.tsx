import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
type FontSize = 'normal' | 'large' | 'xlarge';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  toastsEnabled: boolean;
  setToastsEnabled: (enabled: boolean) => void;
  soundsEnabled: boolean;
  setSoundsEnabled: (enabled: boolean) => void;
  toastDuration: number;
  setToastDuration: (seconds: number) => void;
  visitorsColumns: number;
  setVisitorsColumns: (cols: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('theme_default_set', 'true');
      return 'dark';
    } catch {
      return 'dark';
    }
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('fontSize') as FontSize) || 'normal');
  const [toastsEnabled, setToastsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('toastsEnabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('soundsEnabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [toastDuration, setToastDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('toastDuration');
      return saved === null ? 3 : parseInt(saved, 10);
    } catch {
      return 3;
    }
  });
  const [visitorsColumns, setVisitorsColumns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('visitorsColumns');
      return saved === null ? 5 : parseInt(saved, 10);
    } catch {
      return 5;
    }
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-military', 'theme-emerald', 'theme-nordic', 'theme-amber');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('toastsEnabled', String(toastsEnabled));
  }, [toastsEnabled]);

  useEffect(() => {
    localStorage.setItem('soundsEnabled', String(soundsEnabled));
  }, [soundsEnabled]);

  useEffect(() => {
    localStorage.setItem('toastDuration', String(toastDuration));
  }, [toastDuration]);

  useEffect(() => {
    localStorage.setItem('visitorsColumns', String(visitorsColumns));
  }, [visitorsColumns]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    let size = '16px';
    if (fontSize === 'large') size = '18px';
    if (fontSize === 'xlarge') size = '20px';
    document.documentElement.style.fontSize = size;
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ 
      theme, setTheme, fontSize, setFontSize, 
      toastsEnabled, setToastsEnabled,
      soundsEnabled, setSoundsEnabled,
      toastDuration, setToastDuration,
      visitorsColumns, setVisitorsColumns
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
