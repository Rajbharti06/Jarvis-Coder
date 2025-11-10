import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '../Sidebar/Sidebar';
import { ChatWindow } from '../Chat/ChatWindow';
import { BaselineChat } from '../Chat/BaselineChat';
import { WarpEditor } from '../Editor/WarpEditor';
import { TerminalPane } from '../Terminal/TerminalPane';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  Panel,  
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

const IDE: React.FC = () => {
  const { theme } = useTheme();
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [isBaselineChatOpen, setBaselineChatOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900 text-white">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15} collapsible={true} collapsedSize={0}>
            <Sidebar
                activeProject={activeProject}
                onProjectSelect={setActiveProject}
                activeFile={activeFile}
                onFileSelect={setActiveFile}
            />
        </Panel>
        <PanelResizeHandle className="w-1 bg-white/10 hover:bg-blue-500 transition-colors" />
        <Panel>
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Top Bar */}
                <motion.div
                initial={{ y: -60 }}
                animate={{ y: 0 }}
                className="h-12 flex-shrink-0 border-b border-white/20 bg-white/5 backdrop-blur-xl flex items-center px-4 z-10"
                >
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold">
                        Jarvis Coder
                        </h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button 
                        onClick={() => setTerminalOpen(!isTerminalOpen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={isTerminalOpen ? "Close Terminal" : "Open Terminal"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        </button>
                        <button 
                        onClick={() => setBaselineChatOpen(!isBaselineChatOpen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Baseline Safety Assistant"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </button>
                        <span className="text-sm text-gray-400">
                        {activeProject || 'No project'}
                        </span>
                        <ThemeToggle />
                    </div>
                </motion.div>

                {/* Main work area */}
                <PanelGroup direction="vertical">
                    <Panel>
                        <PanelGroup direction="horizontal">
                            <Panel>
                                <WarpEditor
                                    projectId={activeProject}
                                    filePath={activeFile}
                                    onFileChange={(content: string) => {
                                        console.log('File content changed:', content);
                                    }}
                                />
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-white/10 hover:bg-blue-500 transition-colors" />
                            <Panel defaultSize={30} minSize={20}>
                                <ChatWindow
                                    projectId={activeProject}
                                    onCodeGenerated={(code: string) => {
                                        console.log('Generated code:', code);
                                    }}
                                />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    {isTerminalOpen && (
                        <>
                            <PanelResizeHandle className="h-1 bg-white/10 hover:bg-blue-500 transition-colors" />
                            <Panel defaultSize={30} minSize={10}>
                                <TerminalPane />
                            </Panel>
                        </>
                    )}
                </PanelGroup>
            </div>
        </Panel>
      </PanelGroup>
      
      {/* Baseline Chat Modal */}
      {isBaselineChatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-3/4 h-3/4 max-w-4xl">
            <BaselineChat onClose={() => setBaselineChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default IDE;
