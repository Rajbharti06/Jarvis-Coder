import React from 'react';
import { useStore } from '../../hooks/useStore';
import { X } from 'lucide-react';

export const TabBar: React.FC = () => {
  const { openFiles, activeFileId, setActiveFile, removeOpenFile } = useStore();

  return (
    <div className="flex bg-[#252526] overflow-x-auto border-b border-[#3e3e42] custom-scrollbar min-h-[35px]">
      {openFiles.map((file) => (
        <div 
          key={file.id}
          className={`flex items-center px-3 py-2 cursor-pointer border-r border-[#3e3e42] min-w-[120px] max-w-[200px] transition-colors ${
            activeFileId === file.id ? 'bg-[#1e1e1e] text-blue-400 border-t border-t-blue-500' : 'text-gray-500 hover:bg-[#2d2d2d] hover:text-gray-300'
          }`}
          onClick={() => setActiveFile(file.id)}
        >
          <span className="truncate flex-1 text-xs font-mono">{file.name}</span>
          <button 
            className="ml-2 hover:bg-[#3e3e42] rounded-sm p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              removeOpenFile(file.id);
            }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
};
