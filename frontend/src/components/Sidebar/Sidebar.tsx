import React from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Will create this next

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex flex-col h-full p-4 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-lg m-2">
      <h2 className="text-xl font-bold mb-4">Sidebar</h2>
      <p>Settings, API Key Management, Model Selector, Project Manager will go here.</p>
      <button
        onClick={toggleTheme}
        className="mt-auto p-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
      >
        Toggle Theme ({theme === 'dark' ? 'Light' : 'Dark'})
      </button>
    </div>
  );
};