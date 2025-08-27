import React from 'react';

export const ChatWindow: React.FC = () => {
  return (
    <div className="flex-1 p-4 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-lg m-2">
      <h2 className="text-xl font-bold mb-4">Chat Window</h2>
      <p>This is the chat area.</p>
    </div>
  );
};