import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useStore } from '../../hooks/useStore';
import { X } from 'lucide-react';

export const DiffViewer: React.FC = () => {
  const { showDiffViewer, activeDiff, setShowDiffViewer } = useStore();

  if (!showDiffViewer || !activeDiff) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#1e1e1e] border border-[#3e3e42]">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <div className="flex items-center space-x-4">
          <span className="text-gray-200 font-mono text-sm">Review Changes: {activeDiff.path}</span>
          <div className="flex space-x-2 text-xs">
            <span className="text-red-400">Original</span>
            <span className="text-gray-500">vs</span>
            <span className="text-green-400">Proposed</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* Note: Approve/Reject will be wired up to the agent panel / backend later. */}
          <button 
            onClick={() => setShowDiffViewer(false)}
            className="flex items-center px-3 py-1 bg-[#3e3e42] hover:bg-[#4a4a4d] text-gray-200 rounded text-xs ml-4"
          >
            <X size={14} className="mr-1" /> Close
          </button>
        </div>
      </div>
      
      {/* Diff Editor Body */}
      <div className="flex-1 relative">
        <DiffEditor
          height="100%"
          language="typescript" // Should ideally be dynamic based on file extension
          theme="vs-dark"
          original={activeDiff.original}
          modified={activeDiff.modified}
          options={{
            renderSideBySide: true,
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  );
};
