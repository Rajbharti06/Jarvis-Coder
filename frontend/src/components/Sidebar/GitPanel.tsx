import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Check, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/git';

interface GitStatus {
  status: string;
}

export const GitPanel: React.FC = () => {
  const [statusOutput, setStatusOutput] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<GitStatus>(`${API_BASE}/status`);
      setStatusOutput(res.data.status);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch git status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAddAll = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/add`, []);
      await fetchStatus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add files');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/commit?message=${encodeURIComponent(commitMessage)}`);
      setCommitMessage('');
      await fetchStatus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to commit files');
    } finally {
      setLoading(false);
    }
  };

  // Parse lines to display M, A, ?? files
  const statusLines = statusOutput.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('##'));
  const branchLine = statusOutput.split('\n').find(line => line.startsWith('##')) || '## branch info not found';

  return (
    <div className="flex flex-col h-full bg-[#252526] text-gray-300 w-full border-t border-[#3e3e42]">
      <div className="flex items-center justify-between px-4 py-2 text-sm uppercase tracking-wider text-gray-400">
        <span className="flex items-center gap-2">
            <GitBranch size={14} /> Source Control
        </span>
        <button onClick={fetchStatus} title="Refresh Status" className="hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}

        <div className="text-xs mb-2 truncate text-blue-400 font-mono p-1 bg-[#1e1e1e] rounded flex items-center gap-2">
           <GitBranch size={12}/> {branchLine.replace('##', '').trim()}
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message (Enter to commit)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommit();
            }}
            className="w-full bg-[#3c3c3c] text-white px-3 py-2 text-sm rounded border border-[#3e3e42] focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <div className="flex justify-between items-center gap-2">
            <button 
                onClick={handleCommit}
                disabled={loading || !commitMessage.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1.5 px-3 rounded text-xs font-semibold transition-colors"
            >
                <Check size={14} /> Commit
            </button>
             <button 
                onClick={handleAddAll}
                title="Stage All Changes"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[#3c3c3c] hover:bg-[#4a4a4d] disabled:opacity-50 text-gray-200 py-1.5 px-3 rounded text-xs transition-colors border border-[#4a4a4d]"
            >
                <Plus size={14} /> Stage All
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Changes</div>
          {statusLines.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4 italic">No pending changes</div>
          ) : (
            <ul className="space-y-1">
              {statusLines.map((line, idx) => {
                 const statusCode = line.substring(0, 2);
                 const filePath = line.substring(3);
                 return (
                    <li key={idx} className="flex items-center gap-2 text-xs py-1 px-2 hover:bg-[#2a2d2e] rounded cursor-pointer group">
                      <span className={`font-mono w-4 font-bold ${statusCode.includes('M') ? 'text-yellow-400' : statusCode.includes('A') ? 'text-green-400' : statusCode.includes('D') ? 'text-red-400' : 'text-gray-400'}`}>
                        {statusCode.trim()}
                      </span>
                      <span className="truncate flex-1 group-hover:text-white transition-colors">{filePath}</span>
                    </li>
                 );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
