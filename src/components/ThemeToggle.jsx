import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      aria-pressed={isDark}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
