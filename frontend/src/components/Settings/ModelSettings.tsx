import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../../services/aiService';
import { KeyRound, Plus, Trash2, Edit3, Check, X } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  type: 'local' | 'api';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
}

interface ModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModelSettings: React.FC<ModelSettingsProps> = ({ isOpen, onClose }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [newModel, setNewModel] = useState<Partial<Model>>({});
  const [showAddForm, setShowAddForm] = useState(false);



  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const availableModels = await aiService.getModels();
      const modelConfigs = availableModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        type: model.type as 'local' | 'api',
        enabled: model.enabled || false,
        apiKey: model.apiKey,
        baseUrl: model.baseUrl
      }));
      setModels(modelConfigs);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleModel = async (modelId: string) => {
    setModels(prev => prev.map(model => 
      model.id === modelId ? { ...model, enabled: !model.enabled } : model
    ));
    
    try {
      await aiService.toggleModel(modelId);
    } catch (error) {
      console.error('Failed to toggle model:', error);
      // Revert on error
      setModels(prev => prev.map(model => 
        model.id === modelId ? { ...model, enabled: !model.enabled } : model
      ));
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await aiService.deleteModel(modelId);
      setModels(prev => prev.filter(model => model.id !== modelId));
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const handleAddModel = async () => {
    if (!newModel.name || !newModel.provider) return;

    try {
      const addedModel = await aiService.addModel(newModel);
      setModels(prev => [...prev, { ...newModel, id: addedModel.id } as Model]);
      setNewModel({});
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add model:', error);
    }
  };

  const handleUpdateModel = async (modelId: string, updates: Partial<Model>) => {
    try {
      await aiService.updateModel(modelId, updates);
      setModels(prev => prev.map(model => 
        model.id === modelId ? { ...model, ...updates } : model
      ));
      setEditingModel(null);
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">AI Model Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Local Models Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-400">Local Models (Offline)</h3>
                {models.filter(m => m.type === 'local').map(model => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isEditing={editingModel === model.id}
                    onToggle={() => handleToggleModel(model.id)}
                    onDelete={() => handleDeleteModel(model.id)}
                    onEdit={() => setEditingModel(model.id)}
                    onSave={(updates) => handleUpdateModel(model.id, updates)}
                    onCancel={() => setEditingModel(null)}
                  />
                ))}
              </div>

              {/* API Models Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-400">API Models (Online)</h3>
                {models.filter(m => m.type === 'api').map(model => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isEditing={editingModel === model.id}
                    onToggle={() => handleToggleModel(model.id)}
                    onDelete={() => handleDeleteModel(model.id)}
                    onEdit={() => setEditingModel(model.id)}
                    onSave={(updates) => handleUpdateModel(model.id, updates)}
                    onCancel={() => setEditingModel(null)}
                  />
                ))}
              </div>

              {/* Add New Model */}
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-lg p-4 space-y-3"
                >
                  <input
                    type="text"
                    placeholder="Model Name"
                    value={newModel.name || ''}
                    onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Provider (e.g., openai, anthropic)"
                    value={newModel.provider || ''}
                    onChange={(e) => setNewModel(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newModel.type || 'api'}
                    onChange={(e) => setNewModel(prev => ({ ...prev, type: e.target.value as 'local' | 'api' }))}
                    className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="api">API Model</option>
                    <option value="local">Local Model</option>
                  </select>
                  <input
                    type="text"
                    placeholder="API Key (optional)"
                    value={newModel.apiKey || ''}
                    onChange={(e) => setNewModel(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Base URL (optional)"
                    value={newModel.baseUrl || ''}
                    onChange={(e) => setNewModel(prev => ({ ...prev, baseUrl: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddModel}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Add Model
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewModel({});
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              <button
                onClick={() => setShowAddForm(true)}
                className="w-full glass-panel rounded-lg p-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-5 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add New Model
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ModelCardProps {
  model: Model;
  isEditing: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<Model>) => void;
  onCancel: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isEditing,
  onToggle,
  onDelete,
  onEdit,
  onSave,
  onCancel
}) => {
  const [editedModel, setEditedModel] = useState(model);

  const handleSave = () => {
    onSave(editedModel);
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-lg p-4 space-y-3"
      >
        <input
          type="text"
          value={editedModel.name}
          onChange={(e) => setEditedModel(prev => ({ ...prev, name: e.target.value }))}
          className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={editedModel.provider}
          onChange={(e) => setEditedModel(prev => ({ ...prev, provider: e.target.value }))}
          className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {editedModel.type === 'api' && (
          <input
            type="password"
            placeholder="API Key"
            value={editedModel.apiKey || ''}
            onChange={(e) => setEditedModel(prev => ({ ...prev, apiKey: e.target.value }))}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-lg p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${model.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
        <div>
          <h4 className="text-white font-medium">{model.name}</h4>
          <p className="text-gray-400 text-sm">{model.provider} • {model.type}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {model.type === 'api' && model.apiKey && (
          <KeyRound className="w-4 h-4 text-green-400" />
        )}
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            model.enabled 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
          }`}
        >
          {model.enabled ? 'Enabled' : 'Disabled'}
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ModelSettings;