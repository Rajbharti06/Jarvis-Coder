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
  type Toast
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
}

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