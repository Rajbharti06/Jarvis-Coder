import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search as SearchIcon, RefreshCw, FileText } from 'lucide-react';
import { useStore } from '../../hooks/useStore';

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addOpenFile } = useStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/search/query', {
        query: query,
        n_results: 10
      });
      setResults(response.data);
    } catch (error: any) {
      console.error('Search error:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleReindex = async () => {
    try {
      await axios.post('http://localhost:8000/api/search/reindex');
      alert('Reindexing started in background.');
    } catch (error: any) {
      console.error('Reindex error:', error.message || error);
    }
  };

  const openFile = async (path: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/files/read?path=${encodeURIComponent(path)}`);
      addOpenFile({
        id: path,
        name: path.split('/').pop() || path,
        path: path,
        content: response.data.content,
        language: path.split('.').pop() || 'text'
      });
    } catch (error: any) {
      console.error('Error opening file:', error.message || error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#252526]">
      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center border-b border-[#3e3e42]">
        <span>Semantic Search</span>
        <button onClick={handleReindex} title="Reindex Codebase" className="hover:text-gray-200">
          <RefreshCw size={12} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative">
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code semantics..."
            className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 pl-8 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <SearchIcon size={14} className="absolute left-2 top-1.5 text-gray-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
        {loading ? (
          <div className="text-center p-4"><RefreshCw size={24} className="animate-spin mx-auto text-gray-600" /></div>
        ) : (
          <div className="space-y-2">
            {results.map((res) => (
              <div 
                key={res.id}
                onClick={() => openFile(res.path)}
                className="p-2 hover:bg-[#37373d] cursor-pointer rounded border border-transparent hover:border-[#3e3e42] transition-colors"
              >
                <div className="flex items-center text-blue-400 text-xs font-mono mb-1">
                  <FileText size={12} className="mr-1" />
                  <span className="truncate">{res.path}</span>
                </div>
                <div className="text-[10px] text-gray-500 line-clamp-2 italic">
                  {res.snippet}
                </div>
              </div>
            ))}
            {results.length === 0 && query && !loading && (
              <div className="text-center p-4 text-xs text-gray-500">No matches found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
