import React, { useState } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';
import Input from '../components/Input';
import { useToast } from '../components/Toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token, refreshToken } = response.data;
      setAuth(user, token, refreshToken);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 animate-fadeIn transition-colors">
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-md border border-zinc-100 dark:border-zinc-800">
        <h1 className="text-4xl font-black mb-10 text-center text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter italic">BarberApp</h1>
        <form onSubmit={handleLogin} className="space-y-2">
          <Input 
            label="E-posta"
            type="email" 
            placeholder="usta@berber.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input 
            label="Şifre"
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="pt-4">
            <Button 
              type="submit" 
              loading={loading}
            >
              Giriş Yap
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
