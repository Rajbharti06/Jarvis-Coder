import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  message?: string;
  showThinking?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  message, 
  showThinking = false 
}) => {
  const [thinkingText, setThinkingText] = useState('');
  const [dotCount, setDotCount] = useState(0);

  // Animate thinking text
  useEffect(() => {
    if (!showThinking) return;

    const thinkingPhrases = [
      'Thinking',
      'Processing',
      'Analyzing',
      'Generating response',
      'Considering options'
    ];

    const interval = setInterval(() => {
      const randomPhrase = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];
      setThinkingText(randomPhrase);
    }, 2000);

    return () => clearInterval(interval);
  }, [showThinking]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="flex items-start space-x-3 max-w-[80%]">
        {/* Bot Avatar with pulse animation */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center animate-pulse">
          <Bot className="w-4 h-4" />
        </div>

        {/* Typing Bubble */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          {/* Thinking indicator */}
          {showThinking && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              {thinkingText}{'·'.repeat(dotCount)}
            </div>
          )}

          {/* Typing dots */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-typing-dots"></div>
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-typing-dots"></div>
            <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-typing-dots"></div>
          </div>

          {/* Optional message */}
          {message && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 animate-fade-in">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;