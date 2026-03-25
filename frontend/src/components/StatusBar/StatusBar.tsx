import React, { useEffect, useState } from 'react';
import { GitBranch, Wifi, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export const StatusBar: React.FC = () => {
  const [branch, setBranch] = useState<string>('master');
  const [dbStatus, setDbStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Fetch Git branch
    const fetchGitStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/git/status`);
        const statusLines = res.data.status.split('\n');
        const branchLine = statusLines.find((line: string) => line.startsWith('##'));
        if (branchLine) {
           setBranch(branchLine.replace('##', '').split('...')[0].trim());
        }
      } catch (e) {
        setBranch('Git: N/A');
      }
    };

    // Very basic check if backend is alive
    const checkBackend = async () => {
      try {
        await axios.get('http://127.0.0.1:8000/');
        setDbStatus('Connected');
      } catch (e) {
        setDbStatus('Disconnected');
      }
    };

    fetchGitStatus();
    checkBackend();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
        fetchGitStatus();
        checkBackend();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 py-0.5 rounded cursor-pointer transition-colors">
          <GitBranch size={12} />
          <span>{branch}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-300" />
          <span>Prettier App</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi size={12} className={dbStatus === 'Connected' ? 'text-green-300' : 'text-red-300'} />
          <span>{dbStatus}</span>
        </div>
      </div>
    </div>
  );
};
