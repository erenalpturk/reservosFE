import React from 'react';

const StepIndicator = ({ currentStep, totalSteps = 7 }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div 
            key={i} 
            className={`h-1 w-6 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
        Adım {currentStep}/{totalSteps}
      </span>
    </div>
  );
};

export default StepIndicator;
