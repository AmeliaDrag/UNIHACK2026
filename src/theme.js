import { useEffect, useState } from 'react';

export const THEMES = ['dark', 'light', 'pink'];

export const THEME_LABELS = {
  dark:  'Dark',
  light: 'Light',
  pink:  'Pink',
};

export const THEME_EMOJI = {
  dark:  '🌙',
  light: '☀️',
  pink:  '🌸',
};

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('ladymap-theme', t);
}

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('ladymap-theme') || 'dark'
  );

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = (t) => { setThemeState(t); applyTheme(t); };

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
  };

  return { theme, setTheme, cycleTheme };
}
