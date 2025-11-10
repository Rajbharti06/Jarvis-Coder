import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDownIcon, 
  CpuChipIcon, 
  CloudIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'local' | 'cloud';
  description: string;
}

interface AIModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  mode: 'local' | 'cloud';
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  mode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load available models
  useEffect(() => {
    // In a real implementation, this would fetch from an API
    const availableModels: AIModel[] = [
      // Local models
      {
        id: 'local-codellama',
        name: 'CodeLlama 7B',
        provider: 'Local',
        type: 'local',
        description: 'Fast local code generation with 7B parameters'
      },
      {
        id: 'local-starcoder',
        name: 'StarCoder 3B',
        provider: 'Local',
        type: 'local',
        description: 'Lightweight model for code completion'
      },
      {
        id: 'local-wizardcoder',
        name: 'WizardCoder 15B',
        provider: 'Local',
        type: 'local',
        description: 'Advanced local model for complex code tasks'
      },
      
      // Cloud models
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        type: 'cloud',
        description: 'Most capable model for complex tasks'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        type: 'cloud',
        description: 'Fast and efficient for most coding tasks'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        type: 'cloud',
        description: 'Google\'s advanced multimodal AI model'
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        provider: 'Perplexity AI',
        type: 'cloud',
        description: 'Specialized in code understanding and generation'
      }
    ];

    // Filter models based on current mode
    setModels(availableModels.filter(model => model.type === mode));
  }, [mode]);

  const selectedModelData = models.find(model => model.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    provider: mode === 'local' ? 'Local' : 'Cloud',
    type: mode,
    description: 'AI model for code assistance'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm"
      >
        {mode === 'local' ? (
          <CpuChipIcon className="w-4 h-4" />
        ) : (
          <CloudIcon className="w-4 h-4" />
        )}
        <span>{selectedModelData.name}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 rounded-md shadow-lg bg-gray-800 border border-gray-700">
          <div className="py-1">
            {models.map((model) => (
              <button
                key={model.id}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 ${
                  model.id === selectedModel ? 'bg-gray-700' : ''
                }`}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-gray-400">{model.provider} - {model.description}</span>
                </div>
                {model.id === selectedModel && (
                  <CheckIcon className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelSelector;