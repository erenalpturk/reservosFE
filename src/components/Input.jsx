import React from 'react';

const Input = ({ label, placeholder, value, onChange, onBlur, type = 'text', maxLength, min, max, tracking = false, center = false }) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1 dark:text-zinc-500">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={maxLength}
        min={min}
        max={max}
        className={`
          w-full p-4 border-2 border-zinc-100 rounded-2xl bg-white
          focus:border-zinc-900 focus:outline-none transition-all duration-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-zinc-300
          ${tracking ? 'tracking-[1em] font-mono' : ''}
          ${center ? 'text-center' : ''}
        `}
      />
    </div>
  );
};

export default Input;
