import React from 'react';

const Card = ({ children, onClick, active, disabled, className = "" }) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full text-left p-4 border rounded-2xl transition-all duration-200
        ${active ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-100 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default Card;
