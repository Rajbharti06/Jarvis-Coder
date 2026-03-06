import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CogIcon,
  KeyIcon,
  CpuChipIcon,
  XMarkIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../stores/appStore';
import { useTheme } from '../../hooks/useTheme';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { FileOperationModal, type FileOperationType } from '../FileOperationModal/FileOperationModal';
import { apiClient } from '../../utils/api';
import type { FileNode, AIModel, APIKey } from '../../types';

interface SidebarProps {
  className?: string;
}

/**
 * Sidebar component with file tree, model selector, API key manager, and settings
 * Features:
 * - Collapsible file tree with project management
 * - AI model selection with provider support
 * - Secure API key management
 * - Theme and settings configuration
 * - Glassmorphic design with smooth animations
 */
export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const {
    currentProject,
    projects,
    currentFileTree: fileTree,
    selectedModel,
    apiKeys,
    settings,
     isSidebarOpen,  
    setCurrentProject,
    setSelectedModel,
     addApiKey,  
    removeApiKey,  
    updateSettings,
    toggleSidebar,
    openFile,
    addToast,
    refreshFileTree,
    setAIAssistantModalOpen
  } = useAppStore();

  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'files' | 'models' | 'keys' | 'settings' | 'ai' | 'git'>('files');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '', provider: 'openai' });
  const [showApiKeys, setShowApiKeys] = useState<Set<string>>(new Set());
  
  // Context menu and file operations state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetPath?: string;
    targetType?: 'file' | 'directory';
  }>({ isOpen: false, x: 0, y: 0 });
  
  const [fileOperationModal, setFileOperationModal] = useState<{
    isOpen: boolean;
    type: FileOperationType;
    targetPath?: string;
    targetName?: string;
  }>({ isOpen: false, type: 'create-file' });

  const [gitStatus, setGitStatus] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');

  const refreshGitStatus = async () => {
    if (!currentProject) return;
    try {
      const res = await apiClient.gitStatus(currentProject.id);
      if (res.success && res.data) {
        setGitStatus(res.data.output);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGitInit = async () => {
    if (!currentProject) return;
    try {
      const res = await apiClient.gitInit(currentProject.id);
      if (res.success) {
        addToast({ id: Date.now().toString(), type: 'success', message: 'Git repository initialized', duration: 2000 });
        refreshGitStatus();
      }
    } catch (e) {
      addToast({ id: Date.now().toString(), type: 'error', message: 'Failed to init Git', duration: 3000 });
    }
  };

  const handleGitCommit = async () => {
    if (!currentProject || !commitMessage) return;
    try {
      const res = await apiClient.gitCommit(currentProject.id, commitMessage);
      if (res.success) {
        addToast({ id: Date.now().toString(), type: 'success', message: 'Committed successfully', duration: 2000 });
        setCommitMessage('');
        refreshGitStatus();
      }
    } catch (e) {
      addToast({ id: Date.now().toString(), type: 'error', message: 'Commit failed', duration: 3000 });
    }
  };

  useEffect(() => {
    if (activeTab === 'git' && currentProject) {
      refreshGitStatus();
    }
  }, [activeTab, currentProject]);

  const renderGitTab = () => (
    <div className="flex-1 flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Source Control</h3>
        <button onClick={refreshGitStatus} className="p-1 hover:bg-white/10 rounded">
          <CommandLineIcon className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {!currentProject ? (
        <div className="text-center py-8 text-white/60 text-sm">Select a project</div>
      ) : (
        <>
          <div className="flex-1 overflow-auto bg-black/20 rounded p-2 mb-4 font-mono text-xs text-white/70 whitespace-pre-wrap">
            {gitStatus || 'No status available'}
          </div>

          <div className="space-y-2">
             {gitStatus.includes('Not a git repository') && (
                <button
                  onClick={handleGitInit}
                  className="w-full glass-button text-sm py-2 bg-blue-500/20 hover:bg-blue-500/30"
                >
                  Initialize Repository
                </button>
             )}
            
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full h-20 glass-input text-sm p-2 resize-none"
            />
            <button
              onClick={handleGitCommit}
              disabled={!commitMessage}
              className="w-full glass-button text-sm py-2 disabled:opacity-50"
            >
              Commit
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Handle file selection
  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      // Fetch content if not available
      if (!file.content && currentProject) {
        try {
          const response = await apiClient.getFileContent(currentProject.id, file.path);
          if (response.success && response.data) {
            openFile({ ...file, content: response.data.content });
          } else {
            addToast({
              id: Date.now().toString(),
              type: 'error',
              message: `Failed to load ${file.name}`,
              duration: 3000
            });
          }
        } catch (error) {
          console.error('Failed to load file content:', error);
          addToast({
            id: Date.now().toString(),
            type: 'error',
            message: `Error loading ${file.name}`,
            duration: 3000
          });
        }
      } else {
        openFile(file);
      }
    } else {
      toggleFolder(file.path);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: node.path,
      targetType: node.type,
    });
  };

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    const { targetPath, targetType } = contextMenu;
    
    setContextMenu({ isOpen: false, x: 0, y: 0 });
    
    if (!targetPath) return;
    
    switch (action) {
      case 'create-file':
        setFileOperationModal({
          isOpen: true,
          type: 'create-file',
          targetPath: targetType === 'directory' ? targetPath : targetPath.split('/').slice(0, -1).join('/'),
        });
        break;
      case 'create-folder':
        setFileOperationModal({
          isOpen: true,
          type: 'create-folder',
          targetPath: targetType === 'directory' ? targetPath : targetPath.split('/').slice(0, -1).join('/'),
        });
        break;
      case 'rename':
        setFileOperationModal({
          isOpen: true,
          type: 'rename',
          targetPath,
          targetName: targetPath.split('/').pop() || '',
        });
        break;
      case 'delete':
        setFileOperationModal({
          isOpen: true,
          type: 'delete',
          targetPath,
          targetName: targetPath.split('/').pop() || '',
        });
        break;
    }
  };

  // Handle file operations
  const handleFileOperation = async (name: string) => {
    const { type, targetPath } = fileOperationModal;
    
    if (!currentProject) {
      addToast('No project selected', 'error');
      setFileOperationModal({ isOpen: false, type: 'create-file' });
      return;
    }

    try {
      switch (type) {
        case 'create-file':
          await apiClient.createFile(currentProject.id, targetPath ? `${targetPath}/${name}` : name, '');
          addToast(`File "${name}" created successfully`, 'success');
          break;
        case 'create-folder':
          await apiClient.createFolder(currentProject.id, targetPath ? `${targetPath}/${name}` : name);
          addToast(`Folder "${name}" created successfully`, 'success');
          break;
        case 'rename':
          // Note: Rename functionality would need to be implemented in the backend
          addToast('Rename functionality coming soon', 'info');
          break;
        case 'delete':
          if (fileOperationModal.targetPath) {
            const isDirectory = contextMenu.targetType === 'directory';
            if (isDirectory) {
              await apiClient.deleteFolder(currentProject.id, fileOperationModal.targetPath);
            } else {
              await apiClient.deleteFile(currentProject.id, fileOperationModal.targetPath);
            }
            addToast(`${isDirectory ? 'Folder' : 'File'} deleted successfully`, 'success');
          }
          break;
      }
      
      // Refresh file tree after successful operation
      await refreshFileTree();
      
    } catch (error) {
      console.error('File operation failed:', error);
      addToast(`Failed to ${type.replace('-', ' ')}`, 'error');
    }
    
    setFileOperationModal({ isOpen: false, type: 'create-file' });
  };

  // Render file tree recursively
  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.path}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
              flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer
              hover:bg-white/10 transition-colors
              ${depth > 0 ? 'ml-' + (depth * 4) : ''}
            `}
            onClick={() => handleFileSelect(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
          >
            {node.type === 'directory' ? (
              <>
                {hasChildren && (
                  isExpanded ? 
                    <ChevronDownIcon className="w-4 h-4 text-white/60" /> :
                    <ChevronRightIcon className="w-4 h-4 text-white/60" />
                )}
                {isExpanded ? 
                  <FolderOpenIcon className="w-4 h-4 text-blue-400" /> :
                  <FolderIcon className="w-4 h-4 text-blue-400" />
                }
              </>
            ) : (
              <DocumentIcon className="w-4 h-4 text-white/60 ml-4" />
            )}
            <span className="text-sm text-white/80 truncate">{node.name}</span>
          </motion.div>
          
          <AnimatePresence>
            {node.type === 'directory' && isExpanded && hasChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {renderFileTree(node.children!, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  // Handle API key save
  const handleSaveApiKey = () => {
    if (!newApiKey.name || !newApiKey.key) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: 'Please fill in all fields',
        duration: 3000
      });
      return;
    }

    addApiKey({
      id: Date.now().toString(),
      name: newApiKey.name,
      key: newApiKey.key,
      provider: newApiKey.provider as any,
      createdAt: new Date()
    });

    setNewApiKey({ name: '', key: '', provider: 'openai' });
    setShowApiKeyForm(false);
    
    addToast({
      id: Date.now().toString(),
      type: 'success',
      message: 'API key saved successfully',
      duration: 2000
    });
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (keyId: string) => {
    const newVisible = new Set(showApiKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setShowApiKeys(newVisible);
  };

  // Tab content components
  const renderFilesTab = () => (
    <div className="flex-1 flex flex-col">
      {/* Project Selector */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Projects</h3>
          <button
            onClick={() => {
              addToast({
                id: Date.now().toString(),
                type: 'info',
                message: 'Project creation coming soon!',
                duration: 2000
              });
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="New project"
          >
            <PlusIcon className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <select
          value={currentProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === e.target.value);
            setCurrentProject(project || null);
          }}
          className="glass-input w-full text-sm"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white/80">Files</h3>
        </div>
        {currentProject && fileTree.length > 0 ? (
          <div className="space-y-1">
            {renderFileTree(fileTree)}
          </div>
        ) : (
          <div className="text-center py-8">
            <FolderIcon className="w-12 h-12 text-white/40 mx-auto mb-2" />
            <p className="text-sm text-white/60">
              {currentProject ? 'No files found' : 'Select a project to view files'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderModelsTab = () => (
    <div className="flex-1 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white/80 mb-3">AI Models</h3>
        <div className="space-y-2">
          {[
            { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'Most capable model' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and efficient' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Excellent for coding' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Balanced performance' },
            { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Google\'s latest model' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek', description: 'Specialized for coding' },
            { id: 'codellama', name: 'Code Llama', provider: 'Meta', description: 'Open source coding model' }
          ].map((model) => (
            <motion.div
              key={model.id}
              whileHover={{ scale: 1.02 }}
              className={`
                p-3 rounded-lg cursor-pointer transition-all
                ${selectedModel?.id === model.id 
                  ? 'glass-card bg-blue-500/20 border-blue-400/50' 
                  : 'glass-card hover:bg-white/10'
                }
              `}
              onClick={() => setSelectedModel({ id: model.id, name: model.name, provider: model.provider as any })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white/90">{model.name}</h4>
                  <p className="text-xs text-white/60">{model.provider}</p>
                </div>
                <CpuChipIcon className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-xs text-white/70 mt-1">{model.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderKeysTab = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/80">API Keys</h3>
        <button
          onClick={() => setShowApiKeyForm(!showApiKeyForm)}
          className="glass-button p-2"
          title="Add API key"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Add API Key Form */}
      <AnimatePresence>
        {showApiKeyForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 mb-4 space-y-3"
          >
            <input
              type="text"
              placeholder="Key name"
              value={newApiKey.name}
              onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
              className="glass-input w-full text-sm"
            />
            <select
              value={newApiKey.provider}
              onChange={(e) => setNewApiKey({ ...newApiKey, provider: e.target.value })}
              className="glass-input w-full text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="deepseek">DeepSeek</option>
              <option value="groq">Groq</option>
              <option value="together">Together AI</option>
            </select>
            <input
              type="password"
              placeholder="API key"
              value={newApiKey.key}
              onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
              className="glass-input w-full text-sm"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveApiKey}
                className="glass-button flex-1 py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30"
              >
                Save
              </button>
              <button
                onClick={() => setShowApiKeyForm(false)}
                className="glass-button flex-1 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <KeyIcon className="w-12 h-12 text-white/40 mx-auto mb-2" />
            <p className="text-sm text-white/60">No API keys configured</p>
          </div>
        ) : (
          apiKeys.map((key) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white/90">{key.name}</h4>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleApiKeyVisibility(key.id)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    {showApiKeys.has(key.id) ? (
                      <EyeSlashIcon className="w-4 h-4 text-white/60" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-white/60" />
                    )}
                  </button>
                  <button
                    onClick={() => removeApiKey(key.id)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/60 mb-1">{key.provider}</p>
              <p className="text-xs font-mono text-white/70">
                {showApiKeys.has(key.id) 
                  ? key.key 
                  : '•'.repeat(Math.min(key.key.length, 20))
                }
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="flex-1 flex flex-col space-y-4">
      <h3 className="text-sm font-medium text-white/80">Settings</h3>
      
      {/* Theme Settings */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-medium text-white/90">Appearance</h4>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Theme</span>
          <button
            onClick={toggleTheme}
            className="glass-button px-3 py-1 text-sm"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Font Size</span>
          <select
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
            className="glass-input text-sm w-20"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
          </select>
        </div>
      </div>

      {/* Editor Settings */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-medium text-white/90">Editor</h4>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Auto Save</span>
          <button
            onClick={() => updateSettings({ autoSave: !settings.autoSave })}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${settings.autoSave ? 'bg-blue-500' : 'bg-white/20'}
            `}
          >
            <div className={`
              w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
              ${settings.autoSave ? 'translate-x-5' : 'translate-x-1'}
            `} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Word Wrap</span>
          <button
            onClick={() => updateSettings({ wordWrap: !settings.wordWrap })}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${settings.wordWrap ? 'bg-blue-500' : 'bg-white/20'}
            `}
          >
            <div className={`
              w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
              ${settings.wordWrap ? 'translate-x-5' : 'translate-x-1'}
            `} />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium text-white/90 mb-2">About</h4>
        <p className="text-xs text-white/60">
          Jarvis Coder v1.0.0
        </p>
        <p className="text-xs text-white/60 mt-1">
          A modern AI-powered IDE
        </p>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="flex-1 flex flex-col">
      <div className="glass-card p-4 mb-4">
        <h4 className="text-sm font-medium text-white/90 mb-2">Trae Cursor Blackbox</h4>
        <p className="text-xs text-white/60 mb-3">
          AI-powered coding assistant with self-improving capabilities
        </p>
        <button
          onClick={() => {
            setAIAssistantModalOpen(true);
            addToast({
              id: Date.now().toString(),
              type: 'info',
              message: 'Opening AI Assistant...',
              duration: 2000
            });
          }}
          className="w-full glass-button text-sm py-2"
        >
          Open AI Assistant
        </button>
      </div>

      <div className="glass-card p-4 mb-4">
        <h4 className="text-sm font-medium text-white/90 mb-2">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full text-left text-xs text-white/70 hover:text-white/90 py-1">
            💬 Start New Chat
          </button>
          <button className="w-full text-left text-xs text-white/70 hover:text-white/90 py-1">
            🔄 Switch Provider
          </button>
          <button className="w-full text-left text-xs text-white/70 hover:text-white/90 py-1">
            📊 View Analytics
          </button>
          <button className="w-full text-left text-xs text-white/70 hover:text-white/90 py-1">
            ⚡ Trigger Upgrade
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-medium text-white/90 mb-2">System Status</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Status:</span>
            <span className="text-green-400">Online</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Mode:</span>
            <span className="text-blue-400">Adaptive</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Provider:</span>
            <span className="text-purple-400">Auto</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: isSidebarOpen ? 0 : -300 }}
      className={`flex flex-col h-full glass-panel border-r border-white/20 ${className}`}
      style={{ width: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white/90 font-mono">
          Jarvis Coder
        </h2>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'files', icon: FolderIcon, label: 'Files' },
          { id: 'git', icon: CommandLineIcon, label: 'Git' },
          { id: 'ai', icon: ChatBubbleLeftRightIcon, label: 'AI' },
          { id: 'models', icon: CpuChipIcon, label: 'Models' },
          { id: 'keys', icon: KeyIcon, label: 'Keys' },
          { id: 'settings', icon: CogIcon, label: 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 flex items-center justify-center space-x-1 py-3 text-xs
              transition-colors border-b-2
              ${activeTab === tab.id 
                ? 'text-white border-blue-400 bg-white/5' 
                : 'text-white/60 border-transparent hover:text-white/80 hover:bg-white/5'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full"
          >
            {activeTab === 'files' && renderFilesTab()}
            {activeTab === 'git' && renderGitTab()}
            {activeTab === 'ai' && renderAITab()}
            {activeTab === 'models' && renderModelsTab()}
            {activeTab === 'keys' && renderKeysTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0 })}
        onAction={handleContextMenuAction}
        items={[
          { id: 'create-file', label: 'New File', icon: 'document' },
          { id: 'create-folder', label: 'New Folder', icon: 'folder' },
          { id: 'separator' },
          { id: 'rename', label: 'Rename', icon: 'pencil' },
          { id: 'delete', label: 'Delete', icon: 'trash', destructive: true },
        ]}
      />

      {/* File Operation Modal */}
      <FileOperationModal
        isOpen={fileOperationModal.isOpen}
        type={fileOperationModal.type}
        currentPath={fileOperationModal.targetPath}
        currentName={fileOperationModal.targetName}
        onConfirm={handleFileOperation}
        onCancel={() => setFileOperationModal({ isOpen: false, type: 'create-file' })}
      />
    </motion.div>
  );
};
