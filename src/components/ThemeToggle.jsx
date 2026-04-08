import React from 'react';

const ThemeToggle = ({ isDark, onToggle, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${className}`}
      aria-label={isDark ? 'Aydinlik temaya gec' : 'Koyu temaya gec'}
      title={isDark ? 'Aydinlik tema' : 'Koyu tema'}
      aria-pressed={isDark}
    >
      <span
        className={`absolute left-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
        aria-hidden="true"
      >
        <span className="text-[12px] leading-none">{isDark ? '☾' : '☀'}</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
