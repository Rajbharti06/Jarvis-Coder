import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatWindow } from './components/Chat/ChatWindow'; // Will create this next
import { EditorPane } from './components/Editor/EditorPane'; // Will create this next
import { Sidebar } from './components/Sidebar/Sidebar'; // Will create this next

function App() {
  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen bg-transparent text-white">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={10} maxSize={30}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-gray-600 transition-colors duration-200" />
          <Panel defaultSize={80}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={60}>
                <ChatWindow />
              </Panel>
              <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-gray-600 transition-colors duration-200" />
              <Panel defaultSize={40}>
                <EditorPane />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </ThemeProvider>
  );
}

export default App;
