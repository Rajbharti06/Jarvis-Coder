import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../../hooks/useStore';
import { Cpu, RefreshCw, Check } from 'lucide-react';

export const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel } = useStore();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/models/list');
      setModels(response.data);
    } catch (error: any) {
      console.error('Error fetching models:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSwitch = async (modelName: string) => {
    try {
      await axios.post('http://localhost:8000/api/models/switch', { name: modelName });
      setSelectedModel(modelName);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error switching model:', error.message || error);
    }
  };

  return (
    <div className="px-4 py-2 border-b border-[#3e3e42]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
          <Cpu size={12} className="mr-1" /> AI MODEL
        </span>
        <button onClick={fetchModels} className="text-gray-500 hover:text-gray-300">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-left flex justify-between items-center hover:border-blue-500 transition-colors"
        >
          <span className="truncate">{selectedModel || 'Select Model'}</span>
          <span className="text-gray-500">▼</span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg max-h-48 overflow-y-auto">
            {models.length === 0 ? (
              <div className="p-2 text-xs text-gray-500">No models found in Ollama</div>
            ) : (
              models.map((m) => (
                <div 
                  key={m.name}
                  onClick={() => handleSwitch(m.name)}
                  className="p-2 text-xs hover:bg-[#37373d] cursor-pointer flex justify-between items-center"
                >
                  <span className="truncate">{m.name}</span>
                  {selectedModel === m.name && <Check size={12} className="text-green-500" />}
                </div>
              ))
            )}
            <div className="p-2 border-t border-[#3e3e42]">
               <input 
                 type="text" 
                 placeholder="Pull new model..." 
                 className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-1 py-1 text-[10px] focus:outline-none"
                 onKeyDown={async (e) => {
                   if (e.key === 'Enter') {
                     const name = (e.target as HTMLInputElement).value;
                     if (name) {
                       await axios.post('http://localhost:8000/api/models/pull', { name });
                       (e.target as HTMLInputElement).value = '';
                       alert(`Started pulling ${name} in background.`);
                     }
                   }
                 }}
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
