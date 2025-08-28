import { useTheme } from '../../contexts/ThemeContext'; // Correcting the import path
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme(); // Using toggleTheme

  return (
    <button
      onClick={toggleTheme} // Using toggleTheme directly
      className="p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
