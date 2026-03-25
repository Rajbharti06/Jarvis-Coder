import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatWindow } from './components/Chat/ChatWindow';
import { EditorPane } from './components/Editor/EditorPane';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Terminal } from './components/Terminal/Terminal';
import { StatusBar } from './components/StatusBar/StatusBar';

function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-white overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-row">
          <PanelGroup direction="horizontal">
            {/* Left Sidebar: File Explorer & Icons */}
            <Panel defaultSize={20} minSize={15} maxSize={30}>
              <Sidebar />
            </Panel>
            
            <PanelResizeHandle className="w-[1px] bg-[#3e3e42] hover:bg-blue-500 transition-colors" />
            
            {/* Main Editor & Terminal Area */}
            <Panel defaultSize={50} minSize={30}>
              <PanelGroup direction="vertical">
                <Panel defaultSize={70} minSize={20}>
                  <EditorPane />
                </Panel>
                <PanelResizeHandle className="h-[1px] bg-[#3e3e42] hover:bg-blue-500 transition-colors" />
                <Panel defaultSize={30} minSize={10}>
                  <Terminal />
                </Panel>
              </PanelGroup>
            </Panel>
            
            <PanelResizeHandle className="w-[1px] bg-[#3e3e42] hover:bg-blue-500 transition-colors" />
            
            {/* Right Sidebar: Chat */}
            <Panel defaultSize={30} minSize={20} maxSize={40}>
              <ChatWindow />
            </Panel>
          </PanelGroup>
        </div>
        <StatusBar />
      </div>
    </ThemeProvider>
  );
}

export default App;
