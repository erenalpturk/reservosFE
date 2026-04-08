import React from 'react';

const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-4 right-4 z-[120] flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white/90 backdrop-blur text-zinc-700 text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-zinc-400 transition-all dark:bg-zinc-900/90 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"
      aria-label={isDark ? 'Aydinlik temaya gec' : 'Koyu temaya gec'}
      title={isDark ? 'Aydinlik tema' : 'Koyu tema'}
    >
      <span className="text-sm leading-none" aria-hidden="true">{isDark ? '☀' : '☾'}</span>
      <span>{isDark ? 'Aydinlik' : 'Koyu'}</span>
    </button>
  );
};

export default ThemeToggle;
