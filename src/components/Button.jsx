import React from 'react';

const Button = ({ children, onClick, variant = 'primary', disabled, loading, type = 'button' }) => {
  const base = "w-full p-4 rounded-lg font-bold uppercase tracking-widest text-sm transition-all duration-200 active:scale-95";
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
    secondary: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
    outline: "border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-300 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Yükleniyor...
        </span>
      ) : children}
    </button>
  );
};

export default Button;
