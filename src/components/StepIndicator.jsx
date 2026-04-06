import React from 'react';

const StepIndicator = ({ currentStep, totalSteps = 7 }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-b border-zinc-100">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div 
            key={i} 
            className={`h-1 w-6 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-zinc-900' : 'bg-zinc-200'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
        Adım {currentStep}/{totalSteps}
      </span>
    </div>
  );
};

export default StepIndicator;
