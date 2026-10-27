import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

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
  activeUserPrefName?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to sanitize font size value
function normalizeFontSize(val: string | null | undefined): FontSize {
  if (val === 'small') return 'small';
  if (val === 'large') return 'large';
  if (val === 'medium') return 'medium';
  if (val === 'normal') return 'medium';
  if (val === 'xlarge') return 'large';
  return 'medium';
}

function normalizeTheme(val: string | null | undefined): Theme {
  if (val === 'light') return 'light';
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, updateAuthorizedUser } = useAuth();
  const currentUserIdRef = useRef<string | null>(currentUser?.id || null);

  // Active theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      // Check if active user has personal preference in localStorage
      const savedUser = localStorage.getItem('checkpoint_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const userPref = localStorage.getItem(`skud_pref_${parsed.id}`);
        if (userPref) {
          const prefObj = JSON.parse(userPref);
          if (prefObj.theme) return normalizeTheme(prefObj.theme);
        }
        if (parsed.theme) return normalizeTheme(parsed.theme);
      }
      const saved = localStorage.getItem('theme');
      return normalizeTheme(saved);
    } catch {
      return 'dark';
    }
  });

  // Active font size state
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const savedUser = localStorage.getItem('checkpoint_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const userPref = localStorage.getItem(`skud_pref_${parsed.id}`);
        if (userPref) {
          const prefObj = JSON.parse(userPref);
          if (prefObj.fontSize) return normalizeFontSize(prefObj.fontSize);
        }
        if (parsed.fontSize) return normalizeFontSize(parsed.fontSize);
      }
      const saved = localStorage.getItem('fontSize');
      return normalizeFontSize(saved);
    } catch {
      return 'medium';
    }
  });

  // UI helpers
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

  // Listen to currentUser change (login/logout/switch) to restore user's personal theme and fontSize
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;

    if (!currentUser) return;

    let targetTheme: Theme = 'dark';
    let targetFontSize: FontSize = 'medium';

    try {
      const userPrefRaw = localStorage.getItem(`skud_pref_${currentUser.id}`);
      if (userPrefRaw) {
        const prefObj = JSON.parse(userPrefRaw);
        if (prefObj.theme) targetTheme = normalizeTheme(prefObj.theme);
        if (prefObj.fontSize) targetFontSize = normalizeFontSize(prefObj.fontSize);
      } else {
        // Fallback to fields on currentUser if synced from server
        if (currentUser.theme) targetTheme = normalizeTheme(currentUser.theme);
        if (currentUser.fontSize) targetFontSize = normalizeFontSize(currentUser.fontSize);
      }
    } catch (e) {
      console.error('Failed reading user preference', e);
    }

    setThemeState(targetTheme);
    setFontSizeState(targetFontSize);
  }, [currentUser?.id]);

  // Apply theme to DOM
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-military', 'theme-emerald', 'theme-nordic', 'theme-amber');

    if (theme === 'dark') {
      root.classList.add('dark');
    }
    root.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply font size to DOM
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    let size = '16px';
    if (fontSize === 'small') size = '14px';
    else if (fontSize === 'medium') size = '16px';
    else if (fontSize === 'large') size = '18px';

    document.documentElement.style.fontSize = size;
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // General settings sync
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

  // Set theme with per-user persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      if (currentUser) {
        const storageKey = `skud_pref_${currentUser.id}`;
        const existingPref = (() => {
          try {
            return JSON.parse(localStorage.getItem(storageKey) || '{}');
          } catch {
            return {};
          }
        })();
        const updated = { ...existingPref, theme: newTheme };
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Persist to user record in AuthContext and remote server
        updateAuthorizedUser(currentUser.id, { theme: newTheme });
      }
    } catch (e) {
      console.error('Error saving user theme preference', e);
    }
  }, [currentUser, updateAuthorizedUser]);

  // Set font size with per-user persistence
  const setFontSize = useCallback((newSize: FontSize) => {
    setFontSizeState(newSize);
    try {
      localStorage.setItem('fontSize', newSize);
      if (currentUser) {
        const storageKey = `skud_pref_${currentUser.id}`;
        const existingPref = (() => {
          try {
            return JSON.parse(localStorage.getItem(storageKey) || '{}');
          } catch {
            return {};
          }
        })();
        const updated = { ...existingPref, fontSize: newSize };
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Persist to user record in AuthContext and remote server
        updateAuthorizedUser(currentUser.id, { fontSize: newSize });
      }
    } catch (e) {
      console.error('Error saving user font size preference', e);
    }
  }, [currentUser, updateAuthorizedUser]);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      fontSize,
      setFontSize,
      toastsEnabled,
      setToastsEnabled,
      soundsEnabled,
      setSoundsEnabled,
      toastDuration,
      setToastDuration,
      visitorsColumns,
      setVisitorsColumns,
      activeUserPrefName: currentUser?.name || currentUser?.email
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
