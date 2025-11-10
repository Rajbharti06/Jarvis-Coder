/**
 * Keyboard shortcuts hook
 * Handles global keyboard shortcuts and command palette
 */

import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export const useKeyboard = () => {
  const { 
    settings, 
    setCommandPaletteOpen, 
    commandPaletteOpen,
    setSidebarCollapsed,
    sidebarCollapsed,
    editorTabs,
    closeEditorTab,
    activeTabId,
  } = useAppStore();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      action: () => setCommandPaletteOpen(!commandPaletteOpen),
      description: 'Open command palette',
      category: 'General',
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => setSidebarCollapsed(!sidebarCollapsed),
      description: 'Toggle sidebar',
      category: 'View',
    },
    {
      key: 'w',
      ctrlKey: true,
      action: () => {
        if (activeTabId) {
          closeEditorTab(activeTabId);
        }
      },
      description: 'Close current tab',
      category: 'Editor',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // TODO: Implement new file creation
        console.log('New file shortcut');
      },
      description: 'New file',
      category: 'File',
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        // TODO: Implement save file
        console.log('Save file shortcut');
      },
      description: 'Save file',
      category: 'File',
    },
    {
      key: '`',
      ctrlKey: true,
      action: () => {
        // TODO: Implement terminal toggle
        console.log('Toggle terminal shortcut');
      },
      description: 'Toggle terminal',
      category: 'View',
    },
    {
      key: 'Escape',
      action: () => {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        }
      },
      description: 'Close command palette',
      category: 'General',
    },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Only handle escape and command palette shortcut in input fields
      if (event.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
        return;
      }
      if (event.key === 'k' && event.ctrlKey) {
        event.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSidebarCollapsed,
    sidebarCollapsed,
    activeTabId,
    closeEditorTab,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getShortcutString = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.metaKey) parts.push('Cmd');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  };

  const getShortcutsByCategory = () => {
    const categories: Record<string, KeyboardShortcut[]> = {};
    
    shortcuts.forEach(shortcut => {
      const category = shortcut.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(shortcut);
    });
    
    return categories;
  };

  return {
    shortcuts,
    getShortcutString,
    getShortcutsByCategory,
  };
};