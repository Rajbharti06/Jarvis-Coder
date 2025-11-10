import React from 'react';
import { XMarkIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface CodeSuggestionPanelProps {
  suggestions: string[];
  onClose: () => void;
  onSelectSuggestion: (suggestion: string) => void;
}

export const CodeSuggestionPanel: React.FC<CodeSuggestionPanelProps> = ({
  suggestions,
  onClose,
  onSelectSuggestion
}) => {
  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-gray-800 border-l border-gray-700 shadow-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-medium text-white">AI Suggestions</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-700"
        >
          <XMarkIcon className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto p-2">
        {suggestions.length > 0 ? (
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="w-full text-left p-3 rounded-md bg-gray-700 hover:bg-gray-600 text-sm text-white"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <p>No suggestions available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeSuggestionPanel;