import { create } from 'zustand';

export type ThemeName = 
  | 'matrix-green' 
  | 'cyber-blue' 
  | 'neon-purple' 
  | 'orange-sunset' 
  | 'red-hacker' 
  | 'white-minimal';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const getInitialTheme = (): ThemeName => {
  const saved = localStorage.getItem('typemaster-theme') as ThemeName;
  if (saved && [
    'matrix-green', 
    'cyber-blue', 
    'neon-purple', 
    'orange-sunset', 
    'red-hacker', 
    'white-minimal'
  ].includes(saved)) {
    return saved;
  }
  return 'matrix-green';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem('typemaster-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  }
}));

// Apply initial theme on load
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', getInitialTheme());
}
