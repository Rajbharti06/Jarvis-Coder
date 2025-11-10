import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { Command } from '../../types';
import { Command as CmdkCommand } from 'cmdk';

interface CommandPaletteProps {
  className?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ className = '' }) => {
  const {
    setCommandPaletteOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    editorTabs,
    setActiveTab,
    addToast,
    selectedModel,
    availableModels,
    setSelectedModel,
  } = useAppStore();

  const [query, setQuery] = useState('');

  const commands: Command[] = useMemo(() => [
    {
      id: 'toggle-sidebar',
      title: sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar',
      category: 'view',
      action: () => setSidebarCollapsed(!sidebarCollapsed),
      shortcut: 'Ctrl+B',
    },
    {
      id: 'save-file',
      title: 'Save Active File',
      category: 'file',
      action: () => {
        addToast({ id: Date.now().toString(), type: 'info', title: 'Save', message: 'Saving current file...', duration: 1500 });
      },
      shortcut: 'Ctrl+S',
    },
    {
      id: 'switch-model',
      title: `Switch AI Model (current: ${selectedModel?.name ?? 'None'})`,
      category: 'ai',
      action: () => {
        const next = availableModels[(availableModels.findIndex(m => m.id === selectedModel?.id) + 1) % availableModels.length];
        setSelectedModel(next);
        addToast({ id: Date.now().toString(), type: 'success', title: 'Model Switched', message: `Using ${next.name}`, duration: 1500 });
      },
    },
    {
      id: 'close-tab',
      title: 'Close Active Tab',
      category: 'view',
      action: () => {
        const active = editorTabs.find(t => t.isActive);
        if (!active) {
          addToast({ id: Date.now().toString(), type: 'info', title: 'No Active Tab', message: 'Open a file to use this', duration: 2000 });
          return;
        }
        useAppStore.getState().closeEditorTab(active.id);
      },
      shortcut: 'Ctrl+W',
    },
  ], [sidebarCollapsed, setSidebarCollapsed, editorTabs, addToast, selectedModel, availableModels, setSelectedModel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [commands, query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  return (
    <div className={`glass-card rounded-xl overflow-hidden ${className}`}>
      <CmdkCommand>
        <div className="p-3 border-b border-white/10">
          <CmdkCommand.Input
            autoFocus
            value={query}
            onValueChange={setQuery as any}
            placeholder="Type a command…"
            className="glass-input w-full"
          />
        </div>
        <CmdkCommand.List className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-white/60">No results. Try a different query.</div>
          ) : (
            filtered.map(cmd => (
              <CmdkCommand.Item
                key={cmd.id}
                onSelect={() => {
                  cmd.action();
                  setCommandPaletteOpen(false);
                }}
                className="px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white/90 text-sm">{cmd.title}</div>
                    <div className="text-white/50 text-xs">{cmd.category}</div>
                  </div>
                  {cmd.shortcut && (
                    <div className="text-white/40 text-xs font-mono">{cmd.shortcut}</div>
                  )}
                </div>
              </CmdkCommand.Item>
            ))
          )}
        </CmdkCommand.List>
      </CmdkCommand>
    </div>
  );
};

export default CommandPalette;