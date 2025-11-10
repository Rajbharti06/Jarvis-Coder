/**
 * Theme management hook
 * Handles theme switching, system theme detection, and theme persistence
 */

import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { applyTheme, getThemeFromMode, getSystemTheme } from '../utils/theme';

export const useTheme = () => {
  const { settings, theme, updateSettings } = useAppStore();

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        const newTheme = getThemeFromMode('system');
        applyTheme(newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Update theme based on settings
  useEffect(() => {
    const newTheme = getThemeFromMode(settings.theme);
    if (newTheme.mode !== theme.mode) {
      applyTheme(newTheme);
    }
  }, [settings.theme, theme.mode]);

  const setTheme = useCallback((themeMode: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: themeMode });
    const newTheme = getThemeFromMode(themeMode);
    applyTheme(newTheme);
  }, [updateSettings]);

  const toggleTheme = useCallback(() => {
    const currentMode = settings.theme === 'system' ? getSystemTheme() : settings.theme;
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    setTheme(newMode);
  }, [settings.theme, setTheme]);

  const isDark = theme.mode === 'dark';
  const isSystem = settings.theme === 'system';

  return {
    theme,
    isDark,
    isSystem,
    currentMode: settings.theme,
    setTheme,
    toggleTheme,
  };
};