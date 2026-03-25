import React, { useState } from 'react';
import { FileExplorer } from './FileExplorer';
import { ModelSelector } from './ModelSelector';
import { SearchPanel } from './SearchPanel';
import { Settings, User, Code, Search, FolderTree, GitBranch } from 'lucide-react';
import { GitPanel } from './GitPanel';

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'git'>('explorer');

  return (
    <div className="flex h-full bg-[#333333] border-r border-[#3e3e42]">
      {/* Activity Bar (Icons only) */}
      <div className="w-12 flex flex-col items-center py-4 space-y-4 border-r border-[#3e3e42] bg-[#333333]">
        <div 
          onClick={() => setActiveTab('explorer')}
          className={`p-2 cursor-pointer transition-colors ${activeTab === 'explorer' ? 'text-white border-l-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <FolderTree size={24} />
        </div>
        <div 
          onClick={() => setActiveTab('search')}
          className={`p-2 cursor-pointer transition-colors ${activeTab === 'search' ? 'text-white border-l-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Search size={24} />
        </div>
        <div 
          onClick={() => setActiveTab('git')}
          className={`p-2 cursor-pointer transition-colors ${activeTab === 'git' ? 'text-white border-l-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <GitBranch size={24} />
        </div>
        <div className="p-2 cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
          <Code size={24} />
        </div>
        <div className="mt-auto p-2 cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
          <User size={24} />
        </div>
        <div className="p-2 cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
          <Settings size={24} />
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="w-60 flex flex-col bg-[#252526] border-r border-[#3e3e42]">
        <ModelSelector />
        {activeTab === 'explorer' ? <FileExplorer /> : activeTab === 'search' ? <SearchPanel /> : <GitPanel />}
      </div>
    </div>
  );
};
