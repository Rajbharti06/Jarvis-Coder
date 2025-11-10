import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CogIcon,
  KeyIcon,
  ComputerDesktopIcon,
  CloudIcon,
  PaintBrushIcon,
  CommandLineIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface APIKey {
  provider: string;
  masked_key: string;
  is_valid: boolean;
}

interface OllamaStatus {
  available: boolean;
  running: boolean;
  version?: string;
  models_count: number;
}

interface LocalModel {
  name: string;
  size: string;
  modified: string;
  status: 'available' | 'downloading' | 'error';
  progress?: number;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [newApiKey, setNewApiKey] = useState({ provider: '', key: '' });
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    autoSave: true,
    enableAI: true,
    defaultModel: 'gpt-4',
    maxTokens: 4096,
    temperature: 0.7,
    enableOfflineMode: false,
    preferredOfflineModel: 'llama2'
  });

  const providers = [
    'openai', 'anthropic', 'google', 'perplexity', 'groq', 'mistral'
  ];

  const themes = [
    { id: 'dark', name: 'Dark', preview: 'bg-gray-900' },
    { id: 'light', name: 'Light', preview: 'bg-white' },
    { id: 'blue', name: 'Ocean Blue', preview: 'bg-blue-900' },
    { id: 'purple', name: 'Purple Haze', preview: 'bg-purple-900' }
  ];

  const fontFamilies = [
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Monaco', 'Consolas'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchAPIKeys();
      fetchOllamaStatus();
      fetchLocalModels();
    }
  }, [isOpen]);

  const fetchAPIKeys = async () => {
    try {
      const response = await fetch('/api/security/keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchOllamaStatus = async () => {
    try {
      const response = await fetch('/api/offline/status');
      if (response.ok) {
        const data = await response.json();
        setOllamaStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch Ollama status:', error);
    }
  };

  const fetchLocalModels = async () => {
    try {
      const response = await fetch('/api/offline/models');
      if (response.ok) {
        const data = await response.json();
        setLocalModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch local models:', error);
    }
  };

  const addAPIKey = async () => {
    if (!newApiKey.provider || !newApiKey.key) return;

    try {
      const response = await fetch('/api/security/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApiKey)
      });

      if (response.ok) {
        setNewApiKey({ provider: '', key: '' });
        setIsAddingKey(false);
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Failed to add API key:', error);
    }
  };

  const removeAPIKey = async (provider: string) => {
    try {
      const response = await fetch(`/api/security/keys/${provider}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Failed to remove API key:', error);
    }
  };

  const installModel = async (modelName: string) => {
    try {
      const response = await fetch(`/api/offline/models/${modelName}/install`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchLocalModels();
      }
    } catch (error) {
      console.error('Failed to install model:', error);
    }
  };

  const removeModel = async (modelName: string) => {
    try {
      const response = await fetch(`/api/offline/models/${modelName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchLocalModels();
      }
    } catch (error) {
      console.error('Failed to remove model:', error);
    }
  };

  const startOllama = async () => {
    try {
      const response = await fetch('/api/offline/start', {
        method: 'POST'
      });

      if (response.ok) {
        fetchOllamaStatus();
      }
    } catch (error) {
      console.error('Failed to start Ollama:', error);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'ai', name: 'AI Models', icon: BoltIcon },
    { id: 'keys', name: 'API Keys', icon: KeyIcon },
    { id: 'offline', name: 'Offline Mode', icon: ComputerDesktopIcon },
    { id: 'terminal', name: 'Terminal', icon: CommandLineIcon }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Auto Save
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-400">
            Automatically save changes
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Enable AI Features
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enableAI}
            onChange={(e) => setSettings({ ...settings, enableAI: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-400">
            Enable AI-powered features
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          value={settings.maxTokens}
          onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          min="1"
          max="32000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Temperature
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Focused (0)</span>
          <span>{settings.temperature}</span>
          <span>Creative (2)</span>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Theme
        </label>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSettings({ ...settings, theme: theme.id })}
              className={`p-3 rounded-lg border-2 transition-all ${
                settings.theme === theme.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className={`w-full h-8 rounded mb-2 ${theme.preview}`} />
              <span className="text-sm text-gray-300">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Font Size
        </label>
        <input
          type="range"
          min="10"
          max="24"
          value={settings.fontSize}
          onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>10px</span>
          <span>{settings.fontSize}px</span>
          <span>24px</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Font Family
        </label>
        <select
          value={settings.fontFamily}
          onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          {fontFamilies.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Default Model
        </label>
        <select
          value={settings.defaultModel}
          onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="gemini-pro">Gemini Pro</option>
          <option value="llama2">Llama 2 (Local)</option>
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
          <InformationCircleIcon className="w-4 h-4 mr-2" />
          Model Capabilities
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div>• GPT-4: Best for complex reasoning and code generation</div>
          <div>• Claude 3: Excellent for analysis and long-form content</div>
          <div>• Gemini Pro: Great for multimodal tasks</div>
          <div>• Local models: Privacy-focused, offline capability</div>
        </div>
      </div>
    </div>
  );

  const renderAPIKeysSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">API Keys</h3>
        <button
          onClick={() => setIsAddingKey(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Add Key
        </button>
      </div>

      {isAddingKey && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <select
            value={newApiKey.provider}
            onChange={(e) => setNewApiKey({ ...newApiKey, provider: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Provider</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="password"
            placeholder="API Key"
            value={newApiKey.key}
            onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex space-x-2">
            <button
              onClick={addAPIKey}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingKey(false)}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apiKeys.map((key) => (
          <div key={key.provider} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${key.is_valid ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <div className="text-sm font-medium text-white capitalize">{key.provider}</div>
                <div className="text-xs text-gray-400">{key.masked_key}</div>
              </div>
            </div>
            <button
              onClick={() => removeAPIKey(key.provider)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <KeyIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No API keys configured</p>
          <p className="text-sm">Add your first API key to get started</p>
        </div>
      )}
    </div>
  );

  const renderOfflineSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Enable Offline Mode
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enableOfflineMode}
            onChange={(e) => setSettings({ ...settings, enableOfflineMode: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-400">
            Use local models when available
          </span>
        </label>
      </div>

      {ollamaStatus && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <ComputerDesktopIcon className="w-4 h-4 mr-2" />
            Ollama Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Available:</span>
              <div className="flex items-center">
                {ollamaStatus.available ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className="text-sm text-white">
                  {ollamaStatus.available ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Running:</span>
              <div className="flex items-center">
                {ollamaStatus.running ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-1" />
                )}
                <span className="text-sm text-white">
                  {ollamaStatus.running ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {ollamaStatus.version && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Version:</span>
                <span className="text-sm text-white">{ollamaStatus.version}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Models:</span>
              <span className="text-sm text-white">{ollamaStatus.models_count}</span>
            </div>
          </div>
          {!ollamaStatus.running && ollamaStatus.available && (
            <button
              onClick={startOllama}
              className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Start Ollama
            </button>
          )}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Local Models</h4>
        <div className="space-y-2">
          {localModels.map((model) => (
            <div key={model.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-white">{model.name}</div>
                <div className="text-xs text-gray-400">{model.size} • {model.modified}</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  model.status === 'available' ? 'bg-green-500' :
                  model.status === 'downloading' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <button
                  onClick={() => removeModel(model.name)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {localModels.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No local models installed</p>
            <p className="text-sm">Install Ollama to use offline models</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTerminalSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Terminal Font Size
        </label>
        <input
          type="range"
          min="10"
          max="24"
          value={settings.fontSize}
          onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>10px</span>
          <span>{settings.fontSize}px</span>
          <span>24px</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Terminal Font Family
        </label>
        <select
          value={settings.fontFamily}
          onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          {fontFamilies.map((font) => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
          <ShieldCheckIcon className="w-4 h-4 mr-2" />
          Security Settings
        </h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked={true}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-400">
              Block dangerous commands
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked={true}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-400">
              Confirm destructive operations
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked={false}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-400">
              Log all commands
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'ai': return renderAISettings();
      case 'keys': return renderAPIKeysSettings();
      case 'offline': return renderOfflineSettings();
      case 'terminal': return renderTerminalSettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="w-64 bg-gray-800/50 border-r border-gray-700 p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-2xl">
                <h3 className="text-xl font-semibold text-white mb-6 capitalize">
                  {activeTab} Settings
                </h3>
                {renderTabContent()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;