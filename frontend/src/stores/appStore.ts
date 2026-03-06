/**
 * Main application store using Zustand
 * Manages global app state, projects, chat, and UI state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../utils/api';
import { v4 as uuidv4 } from 'uuid';

// AI model types
export type AIMode = 'local' | 'cloud';
import {
  type AppState,
  type Project,
  type ChatMessage,
  type EditorTab,
  type AIModel,
  type APIKey,
  type Settings,
  type Theme,
  type FileNode,
  type Toast,
  type FilePatch,
  type PatchOperation,
} from '../types';

interface AppStore extends AppState {
  // Chat input and streaming state
  chatInput: string;
  isStreaming: boolean;
  setChatInput: (value: string) => void;
  sendMessage: (message: string) => Promise<void>;
  // Toasts
  toasts?: Toast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  // Additional state
  isSidebarOpen: boolean;
  currentFileTree: FileNode[];
  // AI patch proposal state (secure, confirmation-based edits)
  pendingPatches: FilePatch[] | null;
  patchRawResponse?: string;
  patchStatus: 'idle' | 'loading' | 'ready' | 'error';
  // Missing functions
  toggleSidebar: () => void;
  openFile: (file: FileNode) => void;
  updateTabContent: (tabId: string, content: string) => void;
  closeTab: (tabId: string) => void;
  addApiKey: (apiKey: APIKey) => void;
  removeApiKey: (keyId: string) => void;
  // Project actions
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearChatHistory: () => void;
  
  // Editor actions
  addEditorTab: (tab: EditorTab) => void;
  updateEditorTab: (tabId: string, updates: Partial<EditorTab>) => void;
  closeEditorTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // Model and API actions
  setSelectedModel: (model: AIModel) => void;
  addAPIKey: (apiKey: APIKey) => void;
  updateAPIKey: (keyId: string, updates: Partial<APIKey>) => void;
  deleteAPIKey: (keyId: string) => void;
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // UI actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setAIAssistantModalOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // File system actions
  updateFileContent: (fileId: string, content: string) => void;
  createFile: (parentId: string, name: string, type: 'file' | 'directory') => void;
  deleteFile: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  refreshFileTree: () => Promise<void>;
  // Patch-related actions
  requestPatches: (instruction: string, targetFiles?: string[]) => Promise<void>;
  clearPatches: () => void;
  applyPatches: () => Promise<void>;
}

// Apply a list of line-based patch operations to file content, defensively.
const applyFileOperations = (content: string, operations: PatchOperation[]): string => {
  if (!operations.length) return content;

  const lines = content.split('\n');

  // Work on a copy and apply from bottom to top so line numbers stay valid.
  const ops = [...operations].sort((a, b) => {
    const aStart = a.range?.start_line ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.range?.start_line ?? Number.MAX_SAFE_INTEGER;
    return bStart - aStart;
  });

  let currentLines = [...lines];

  for (const op of ops) {
    const range = op.range;
    if ((op.type === 'replace' || op.type === 'delete') && !range) {
      // Skip malformed operation
      continue;
    }

    if (op.type === 'replace' && range) {
      const startIdx = range.start_line - 1;
      const endIdx = range.end_line - 1;
      if (startIdx < 0 || endIdx >= currentLines.length || startIdx > endIdx) {
        // Out-of-bounds; skip this operation
        continue;
      }
      const newLines = (op.new_text ?? '').split('\n');
      currentLines = [
        ...currentLines.slice(0, startIdx),
        ...newLines,
        ...currentLines.slice(endIdx + 1),
      ];
    } else if (op.type === 'delete' && range) {
      const startIdx = range.start_line - 1;
      const endIdx = range.end_line - 1;
      if (startIdx < 0 || endIdx >= currentLines.length || startIdx > endIdx) {
        continue;
      }
      currentLines = [
        ...currentLines.slice(0, startIdx),
        ...currentLines.slice(endIdx + 1),
      ];
    } else if (op.type === 'insert') {
      // Insert before start_line if provided, otherwise append at end.
      const insertAt = (range?.start_line ?? currentLines.length + 1) - 1;
      const clampedIndex = Math.max(0, Math.min(insertAt, currentLines.length));
      const newLines = (op.new_text ?? '').split('\n');
      currentLines = [
        ...currentLines.slice(0, clampedIndex),
        ...newLines,
        ...currentLines.slice(clampedIndex),
      ];
    }
  }

  return currentLines.join('\n');
};

const defaultSettings: Settings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  autoFormat: true,
  defaultModel: 'gpt-4',
  shortcuts: {
    'command-palette': 'Ctrl+K',
    'new-file': 'Ctrl+N',
    'save-file': 'Ctrl+S',
    'close-tab': 'Ctrl+W',
    'toggle-sidebar': 'Ctrl+B',
    'toggle-terminal': 'Ctrl+`',
  },
};

const defaultTheme: Theme = {
  name: 'Dark',
  mode: 'dark',
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

const defaultModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'chat',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    isAvailable: true,
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    type: 'chat',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    isAvailable: true,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    type: 'chat',
    maxTokens: 32768,
    costPer1kTokens: 0.0005,
    isAvailable: true,
  },
];

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        currentProject: null,
        projects: [],
        chatMessages: [],
        chatInput: '',
        isStreaming: false,
        editorTabs: [],
        activeTabId: null,
        selectedModel: defaultModels[0],
        availableModels: defaultModels,
        apiKeys: [],
        settings: defaultSettings,
        theme: defaultTheme,
        isLoading: false,
        error: null,
        sidebarCollapsed: false,
        isSidebarOpen: true,
        commandPaletteOpen: false,
        aiAssistantModalOpen: false,
        toasts: [],
        currentFileTree: [],
        pendingPatches: null,
        patchRawResponse: undefined,
        patchStatus: 'idle',

        // Project actions
        setCurrentProject: (project) => set({ currentProject: project }),
        
        addProject: (project) => set((state) => ({
          projects: [...state.projects, project],
        })),
        
        updateProject: (projectId, updates) => set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, ...updates } : p
          ),
          currentProject: state.currentProject?.id === projectId 
            ? { ...state.currentProject, ...updates }
            : state.currentProject,
        })),
        
        deleteProject: (projectId) => set((state) => ({
          projects: state.projects.filter(p => p.id !== projectId),
          currentProject: state.currentProject?.id === projectId 
            ? null 
            : state.currentProject,
        })),

        // Chat actions
        addChatMessage: (message) => set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
        
        updateChatMessage: (messageId, updates) => set((state) => ({
          chatMessages: state.chatMessages.map(m =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        })),
        
        clearChatHistory: () => set({ chatMessages: [] }),

        // Chat input and sending
        setChatInput: (value) => set({ chatInput: value }),
        sendMessage: async (message) => {
          const state = get();
          const modelId = state.selectedModel?.id || 'gpt-4';
          const projectId = state.currentProject?.id;

          if (!message.trim() || state.isStreaming) return;

          // Add user message
          const userMessage: ChatMessage = {
            id: `${Date.now()}-user`,
            content: message,
            role: 'user',
            timestamp: new Date(),
          };
          set({ isStreaming: true });
          get().addChatMessage(userMessage);

          // Create assistant placeholder
          const assistantId = `${Date.now()}-assistant`;
          const assistantMessage: ChatMessage = {
            id: assistantId,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
          };
          get().addChatMessage(assistantMessage);

          try {
            await apiClient.streamChatMessage(
              message,
              modelId,
              projectId,
              (chunk) => {
                const current = get().chatMessages.find(m => m.id === assistantId);
                const nextContent = `${(current?.content || '')}${chunk}`;
                get().updateChatMessage(assistantId, { content: nextContent });
              }
            );
          } catch (error) {
            const errText = error instanceof Error ? error.message : 'Unknown error';
            get().updateChatMessage(assistantId, { content: `Error: ${errText}`, type: 'error' });
            get().addToast({ id: `${Date.now()}-toast`, type: 'error', title: 'Chat failed', message: errText, duration: 3000 });
          } finally {
            set({ isStreaming: false, chatInput: '' });
          }
        },

        // Editor actions
        addEditorTab: (tab) => set((state) => {
          const existingTab = state.editorTabs.find(t => t.fileId === tab.fileId);
          if (existingTab) {
            return {
              activeTabId: existingTab.id,
              editorTabs: state.editorTabs.map(t =>
                t.id === existingTab.id ? { ...t, isActive: true } : { ...t, isActive: false }
              ),
            };
          }
          
          return {
            editorTabs: [
              ...state.editorTabs.map(t => ({ ...t, isActive: false })),
              { ...tab, isActive: true }
            ],
            activeTabId: tab.id,
          };
        }),
        
        updateEditorTab: (tabId, updates) => set((state) => ({
          editorTabs: state.editorTabs.map(t =>
            t.id === tabId ? { ...t, ...updates } : t
          ),
        })),
        
        closeEditorTab: (tabId) => set((state) => {
          const tabs = state.editorTabs.filter(t => t.id !== tabId);
          const wasActive = state.activeTabId === tabId;
          
          if (wasActive && tabs.length > 0) {
            const newActiveTab = tabs[tabs.length - 1];
            return {
              editorTabs: tabs.map(t => 
                t.id === newActiveTab.id ? { ...t, isActive: true } : { ...t, isActive: false }
              ),
              activeTabId: newActiveTab.id,
            };
          }
          
          return {
            editorTabs: tabs,
            activeTabId: tabs.length > 0 ? state.activeTabId : null,
          };
        }),
        
        setActiveTab: (tabId) => set((state) => ({
          editorTabs: state.editorTabs.map(t =>
            t.id === tabId ? { ...t, isActive: true } : { ...t, isActive: false }
          ),
          activeTabId: tabId,
        })),
        
        reorderTabs: (fromIndex, toIndex) => set((state) => {
          const tabs = [...state.editorTabs];
          const [removed] = tabs.splice(fromIndex, 1);
          tabs.splice(toIndex, 0, removed);
          return { editorTabs: tabs };
        }),

        // Model and API actions
        setSelectedModel: (model) => set({ selectedModel: model }),
        
        addAPIKey: (apiKey) => set((state) => ({
          apiKeys: [...state.apiKeys, apiKey],
        })),
        
        updateAPIKey: (keyId, updates) => set((state) => ({
          apiKeys: state.apiKeys.map(k =>
            k.id === keyId ? { ...k, ...updates } : k
          ),
        })),
        
        deleteAPIKey: (keyId) => set((state) => ({
          apiKeys: state.apiKeys.filter(k => k.id !== keyId),
        })),

        // Settings actions
        updateSettings: (updates) => set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
        
        setTheme: (theme) => set((state) => ({
          settings: { ...state.settings, theme },
        })),

        // UI actions
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setAIAssistantModalOpen: (open) => set({ aiAssistantModalOpen: open }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),

        // File operations
        openFile: (file) => set((state) => {
          const existingTab = state.editorTabs.find(tab => tab.fileId === file.id);
          if (existingTab) {
            return { activeTabId: existingTab.id };
          }
          
          const newTab: EditorTab = {
            id: `tab-${Date.now()}`,
            fileId: file.id,
            filename: file.name,
            content: file.content || '',
            language: file.name.split('.').pop() || 'text',
            isModified: false,
          };
          
          return {
            editorTabs: [...state.editorTabs, newTab],
            activeTabId: newTab.id,
          };
        }),

        updateTabContent: (tabId, content) => set((state) => ({
          editorTabs: state.editorTabs.map(tab =>
            tab.id === tabId ? { ...tab, content, isModified: true } : tab
          ),
        })),

        closeTab: (tabId) => set((state) => {
          const newTabs = state.editorTabs.filter(tab => tab.id !== tabId);
          const newActiveTabId = state.activeTabId === tabId 
            ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
            : state.activeTabId;
          
          return {
            editorTabs: newTabs,
            activeTabId: newActiveTabId,
          };
        }),

        // API Key management
        addApiKey: (apiKey) => set((state) => ({
          apiKeys: [...state.apiKeys, apiKey],
        })),

        removeApiKey: (keyId) => set((state) => ({
          apiKeys: state.apiKeys.filter(key => key.id !== keyId),
        })),

        // Toast actions
        addToast: (toast) => set((state) => ({
          toasts: [...(state.toasts || []), toast],
        })),
        removeToast: (id) => set((state) => ({
          toasts: (state.toasts || []).filter(t => t.id !== id),
        })),

        // File system actions
        updateFileContent: (fileId, content) => set((state) => {
          const updateFileInTree = (files: FileNode[]): FileNode[] =>
            files.map(file => {
              if (file.id === fileId) {
                return { ...file, content, isModified: true };
              }
              if (file.children) {
                return { ...file, children: updateFileInTree(file.children) };
              }
              return file;
            });

          return {
            currentProject: state.currentProject ? {
              ...state.currentProject,
              files: updateFileInTree(state.currentProject.files),
            } : null,
            editorTabs: state.editorTabs.map(tab =>
              tab.fileId === fileId ? { ...tab, content, isModified: true } : tab
            ),
          };
        }),
        
        createFile: (parentId, name, type) => set((state) => {
          if (!state.currentProject) return state;
          
          const newFile: FileNode = {
            id: `${Date.now()}-${Math.random()}`,
            name,
            path: `${parentId}/${name}`,
            type,
            content: type === 'file' ? '' : undefined,
            children: type === 'directory' ? [] : undefined,
          };
          
          const addFileToTree = (files: FileNode[]): FileNode[] =>
            files.map(file => {
              if (file.id === parentId && file.type === 'directory') {
                return {
                  ...file,
                  children: [...(file.children || []), newFile],
                };
              }
              if (file.children) {
                return { ...file, children: addFileToTree(file.children) };
              }
              return file;
            });
          
          return {
            currentProject: {
              ...state.currentProject,
              files: addFileToTree(state.currentProject.files),
            },
          };
        }),
        
        deleteFile: (fileId) => set((state) => {
          if (!state.currentProject) return state;
          
          const removeFileFromTree = (files: FileNode[]): FileNode[] =>
            files.filter(file => {
              if (file.id === fileId) return false;
              if (file.children) {
                file.children = removeFileFromTree(file.children);
              }
              return true;
            });
          
          return {
            currentProject: {
              ...state.currentProject,
              files: removeFileFromTree(state.currentProject.files),
            },
            editorTabs: state.editorTabs.filter(tab => tab.fileId !== fileId),
          };
        }),
        
        renameFile: (fileId, newName) => set((state) => {
          if (!state.currentProject) return state;
          
          const renameFileInTree = (files: FileNode[]): FileNode[] =>
            files.map(file => {
              if (file.id === fileId) {
                const newPath = file.path.replace(/[^/]+$/, newName);
                return { ...file, name: newName, path: newPath };
              }
              if (file.children) {
                return { ...file, children: renameFileInTree(file.children) };
              }
              return file;
            });
          
          return {
            currentProject: {
              ...state.currentProject,
              files: renameFileInTree(state.currentProject.files),
            },
            editorTabs: state.editorTabs.map(tab =>
              tab.fileId === fileId ? { ...tab, filename: newName } : tab
            ),
          };
        }),

        refreshFileTree: async () => {
          const state = get();
          if (!state.currentProject) return;
          
          try {
            const fileTree = await apiClient.getProjectFiles(state.currentProject.id);
            set({ currentFileTree: fileTree });
          } catch (error) {
            console.error('Failed to refresh file tree:', error);
            set({ error: 'Failed to refresh file tree' });
          }
        },

        // Patch-related actions
        requestPatches: async (instruction, targetFiles) => {
          const state = get();
          const project = state.currentProject;
          if (!project) {
            state.addToast?.({
              id: `${Date.now()}-no-project`,
              type: 'error',
              title: 'No project open',
              message: 'Open or create a project before requesting AI patches.',
              duration: 3000,
            });
            return;
          }
          if (!instruction.trim()) return;

          set({ patchStatus: 'loading', pendingPatches: null, patchRawResponse: undefined });
          try {
            const res = await apiClient.proposePatches(instruction, {
              projectId: project.id,
              targetFiles,
              model: state.selectedModel?.id,
            });
            if (!res.success || !res.data) {
              throw new Error(res.error || 'Patch proposal failed');
            }
            set({
              pendingPatches: res.data.patches,
              patchRawResponse: res.data.raw_response,
              patchStatus: 'ready',
            });
            state.addToast?.({
              id: `${Date.now()}-patch-ready`,
              type: 'info',
              title: 'AI patch proposal ready',
              message: `Review and apply ${res.data.patches.length} patch group(s).`,
              duration: 4000,
            });
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            set({ patchStatus: 'error' });
            state.addToast?.({
              id: `${Date.now()}-patch-error`,
              type: 'error',
              title: 'Failed to propose patches',
              message: msg,
              duration: 4000,
            });
          }
        },

        clearPatches: () => {
          set({
            pendingPatches: null,
            patchRawResponse: undefined,
            patchStatus: 'idle',
          });
        },

        applyPatches: async () => {
          const state = get();
          const project = state.currentProject;
          const patches = state.pendingPatches;
          if (!project || !patches || patches.length === 0) {
            return;
          }

          set({ isLoading: true });
          const successes: string[] = [];
          const failures: string[] = [];

          try {
            for (const patch of patches) {
              try {
                const fileRes = await apiClient.getFileContent(project.id, patch.file_path);
                if (!fileRes.success || !fileRes.data) {
                  throw new Error(fileRes.error || 'Failed to read file');
                }
                const original = fileRes.data.content;
                const updated = applyFileOperations(original, patch.operations);
                if (updated === original) {
                  // No effective change, skip write but count as ok
                  successes.push(patch.file_path);
                  continue;
                }
                const saveRes = await apiClient.saveFileContent(
                  project.id,
                  patch.file_path,
                  updated
                );
                if (!saveRes.success) {
                  throw new Error(saveRes.error || 'Failed to save file');
                }
                successes.push(patch.file_path);
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                failures.push(`${patch.file_path}: ${msg}`);
              }
            }
          } finally {
            set({ isLoading: false });
          }

          if (successes.length > 0) {
            state.addToast?.({
              id: `${Date.now()}-patch-apply-ok`,
              type: 'success',
              title: 'Patches applied',
              message: `Applied changes to ${successes.length} file(s).`,
              duration: 4000,
            });
          }
          if (failures.length > 0) {
            state.addToast?.({
              id: `${Date.now()}-patch-apply-fail`,
              type: 'warning',
              title: 'Some patches failed',
              message: failures.slice(0, 3).join(' | '),
              duration: 6000,
            });
          }

          // Clear patch state after attempt
          set({
            pendingPatches: null,
            patchRawResponse: undefined,
            patchStatus: 'idle',
          });
        },
      }),
      {
        name: 'jarvis-coder-store',
        partialize: (state) => ({
          projects: state.projects,
          settings: state.settings,
          apiKeys: state.apiKeys,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: 'jarvis-coder' }
  )
);