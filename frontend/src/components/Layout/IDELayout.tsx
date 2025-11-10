/**
 * Main IDE Layout Component
 * Provides the core layout structure with glassmorphic design
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppStore } from '../../stores/appStore';
import { useTheme } from '../../hooks/useTheme';
import { useKeyboard } from '../../hooks/useKeyboard';
import { animations } from '../../utils/theme';

// Import components (we'll create these next)
import { Sidebar } from '../Sidebar/Sidebar';
import WarpChatWindow from '../Chat/WarpChatWindow';
import { EditorPane } from '../Editor/EditorPane';
import CommandPalette from '../CommandPalette/CommandPalette';
import Toast from '../ui/Toast';
import { AIAssistantModal } from '../AIAssistant/AIAssistantModal';

const IDELayout: React.FC = () => {
  const { sidebarCollapsed, commandPaletteOpen, aiAssistantModalOpen, setAIAssistantModalOpen } = useAppStore();
  const { isDark } = useTheme();
  useKeyboard(); // Initialize keyboard shortcuts

  // Apply theme classes to body
  useEffect(() => {
    document.body.className = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-text">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
      
      {/* Main layout */}
      <div className="relative h-full flex">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-shrink-0 h-full"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex-1 h-full">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Chat/Terminal Panel */}
            <Panel defaultSize={50} minSize={30}>
              <motion.div
                {...animations.fadeIn}
                className="h-full p-4"
              >
                <div className="h-full glass-panel">
                  <WarpChatWindow />
                </div>
              </motion.div>
            </Panel>

            {/* Resize handle */}
            <PanelResizeHandle className="w-2 bg-transparent hover:bg-primary/20 transition-colors duration-200 relative group">
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-border group-hover:bg-primary transition-colors duration-200 transform -translate-x-1/2" />
            </PanelResizeHandle>

            {/* Editor Panel */}
            <Panel defaultSize={50} minSize={30}>
              <motion.div
                {...animations.fadeIn}
                className="h-full p-4"
              >
                <div className="h-full glass-panel">
                  <EditorPane />
                </div>
              </motion.div>
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {/* Command Palette Overlay */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-100 glass-overlay flex items-start justify-center pt-32"
            onClick={() => useAppStore.getState().setCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl mx-4"
            >
              <CommandPalette />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={aiAssistantModalOpen}
        onClose={() => setAIAssistantModalOpen(false)}
      />

      {/* Toast notifications */}
      <Toast />
    </div>
  );
};

export default IDELayout;