import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '../Sidebar/Sidebar';
import { ChatWindow } from '../Chat/ChatWindow';
import { EditorPane } from '../Editor/EditorPane';
import { TerminalPane } from '../Terminal/TerminalPane';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../ui/ThemeToggle';

const IDE: React.FC = () => {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-80 flex-shrink-0 border-r border-white/20 bg-white/5 backdrop-blur-xl"
      >
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeProject={activeProject}
          onProjectSelect={setActiveProject}
          activeFile={activeFile}
          onFileSelect={setActiveFile}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          className="h-12 flex-shrink-0 border-b border-white/20 bg-white/5 backdrop-blur-xl flex items-center px-4 z-10"
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
          >
            {/* Hamburger Icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="ml-4 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Jarvis Coder
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setTerminalOpen(!isTerminalOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            >
                {/* Terminal Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {activeProject || 'No project'}
            </span>
            <ThemeToggle />
          </div>
        </motion.div>

        {/* Main work area */}
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel */}
                <div className="flex-1 border-r border-white/20">
                    <EditorPane
                    projectId={activeProject}
                    filePath={activeFile}
                    onFileChange={(content: string) => {
                        console.log('File content changed:', content);
                    }}
                    />
                </div>

                {/* Chat Panel */}
                <div className="w-96 flex-shrink-0">
                    <ChatWindow
                    projectId={activeProject}
                    onCodeGenerated={(code: string) => {
                        console.log('Generated code:', code);
                    }}
                    />
                </div>
            </div>
            {isTerminalOpen && (
                <motion.div 
                    className="flex-shrink-0 h-64 border-t border-white/20"
                    initial={{ height: 0 }}
                    animate={{ height: 256 }}
                    exit={{ height: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                >
                    <TerminalPane />
                </motion.div>
            )}
        </div>
      </div>
    </div>
  );
};

export default IDE;
