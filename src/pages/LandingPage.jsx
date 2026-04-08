import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl flex flex-col">
      <div className="bg-zinc-900 text-white p-10 flex-1 flex flex-col justify-center items-center text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter italic mb-3">BarberApp</h1>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Randevunuzu kolayca alın</p>
      </div>

      <div className="p-8 flex flex-col gap-4">
        <button
          onClick={() => navigate('/book')}
          className="w-full py-5 bg-zinc-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-zinc-700 transition-colors"
        >
          Randevu Al
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-4 border-2 border-zinc-200 text-zinc-500 font-bold text-xs uppercase tracking-widest rounded-2xl hover:border-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Berber Girişi
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
