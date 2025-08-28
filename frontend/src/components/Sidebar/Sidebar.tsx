import React from 'react';
import FileTree from './FileTree';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeProject: string | null;
  onProjectSelect: (projectId: string | null) => void;
  activeFile: string | null;
  onFileSelect: (filePath: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeProject,
  onProjectSelect,
  activeFile,
  onFileSelect,
}) => {
  return (
    <div className="flex flex-col h-full p-4 bg-white/5 backdrop-blur-xl border-r border-white/20 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Jarvis Coder</h2>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {/* Close Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Model Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Models</h3>
        <select className="w-full p-2 rounded-lg bg-white/5 border border-white/20">
          <option>deepseek-coder-v2:latest</option>
          {/* Other models */}
        </select>
      </div>

      {/* Projects */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Projects</h3>
        <div className="space-y-1">
          <button
            onClick={() => onProjectSelect('project-1')}
            className={`w-full p-2 text-left rounded-lg transition-colors ${
              activeProject === 'project-1' ? 'bg-blue-600' : 'hover:bg-white/10'
            }`}
          >
            project-1
          </button>
          {/* Add other project buttons here */}
        </div>
      </div>

      {/* File Browser */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <h3 className="text-sm font-medium text-gray-400 mb-3 px-2">Files</h3>
        {activeProject ? (
          <FileTree 
            projectId={activeProject} 
            onFileSelect={onFileSelect} 
            activeFile={activeFile} 
          />
        ) : (
          <p className="text-sm text-gray-500 px-2">Select a project to see files</p>
        )}
      </div>

      {/* Settings */}
      <div className="pt-4 border-t border-white/20">
        <button className="w-full p-2 text-left text-gray-400 hover:bg-white/10 rounded-lg transition-colors">
          Settings
        </button>
      </div>
    </div>
  );
};
