import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Loader2, ChevronDown, ChevronRight, FileCode } from 'lucide-react';

interface DiffHunk {
  header: string;
  lines: string[];
}

interface Diff {
  file: string;
  hunks: DiffHunk[];
  raw: string;
}

interface AgentPanelProps {
  logs: string[];
  status: string;
  diffs: Diff[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ logs, status, diffs }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { setShowDiffViewer } = useStore();

  const handleDiffClick = (diff: Diff) => {
    // Basic conversion logic to feed into DiffViewer 
    // Usually diff.raw has the original/modified hunks, or backend sends it.
    // For MVP we just show a raw placeholder or what we have.
    setShowDiffViewer(true, { 
      path: diff.file, 
      original: diff.raw.split('=======')[0] || "Original content not captured", 
      modified: diff.raw.split('=======')[1] || "Modified content not captured" 
    });
  };

  return (
    <div className="flex flex-col bg-[#252526] border-t border-[#3e3e42] max-h-[400px]">
      <div 
        className="px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-[#2d2d2d]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
           {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
           <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agent Progress</span>
           <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === 'Thinking...' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
             {status}
           </span>
        </div>
        {status === 'Thinking...' && <Loader2 size={12} className="animate-spin text-blue-500" />}
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Logs */}
          <div className="space-y-1">
             {logs.map((log, i) => (
               <div key={i} className="text-[11px] font-mono text-gray-500 border-l border-[#3e3e42] pl-2 py-0.5">
                  {log}
               </div>
             ))}
          </div>

          {/* Diffs */}
          <div className="space-y-2">
            {diffs.map((diff, i) => (
              <div key={i} className="bg-[#1e1e1e] border border-[#3e3e42] rounded overflow-hidden">
                <div 
                  className="bg-[#2d2d2d] px-2 py-1 flex items-center justify-between border-b border-[#3e3e42] hover:bg-[#3e3e42] cursor-pointer"
                  onClick={() => handleDiffClick(diff)}
                >
                   <div className="flex items-center space-x-2">
                     <FileCode size={12} className="text-blue-400" />
                     <span className="text-[10px] font-mono text-gray-300">{diff.file}</span>
                   </div>
                   <span className="text-[10px] bg-blue-600 px-1 rounded text-white">View Diff</span>
                </div>
                <div className="p-2 text-[10px] font-mono max-h-40 overflow-y-auto">
                   {diff.hunks.map((hunk, hi) => (
                     <div key={hi}>
                        <div className="text-gray-500">{hunk.header}</div>
                        {hunk.lines.map((line, li) => (
                          <div 
                            key={li} 
                            className={line.startsWith('+') ? 'bg-green-900/20 text-green-400' : line.startsWith('-') ? 'bg-red-900/20 text-red-400' : 'text-gray-400'}
                          >
                            {line}
                          </div>
                        ))}
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
