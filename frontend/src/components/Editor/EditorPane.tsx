import React from 'react';

export const EditorPane: React.FC = () => {
  return (
    <div className="flex-1 p-4 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-lg m-2">
      <h2 className="text-xl font-bold mb-4">Editor Pane</h2>
      <p>This is the code editor area.</p>
    </div>
  );
};