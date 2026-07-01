import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto md:max-w-3xl bg-white dark:bg-zinc-900 h-dvh overflow-hidden shadow-2xl flex flex-col md:flex-row">
      <div className="bg-zinc-900 text-white p-10 flex-1 flex flex-col justify-center items-center text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic mb-3">ReservOS</h1>
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Randevunuzu kolayca alın</p>
      </div>

      <div className="p-8 flex flex-col gap-4 bg-white dark:bg-zinc-900 md:justify-center md:w-72 md:flex-shrink-0">
        <button
          onClick={() => navigate('/book')}
          className="w-full py-5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-zinc-700 dark:hover:bg-white transition-colors"
        >
          Randevu Al
        </button>
        <button
          onClick={() => navigate('/appointments/query')}
          className="w-full py-4 border-2 border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
        >
          Randevu Sorgula
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-4 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest rounded-2xl hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          Personel Girişi
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
