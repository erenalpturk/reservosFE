import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/LandingPage';
import ShopSelectPage from './pages/ShopSelectPage';
import CustomerPage from './pages/CustomerPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CancelPage from './pages/CancelPage';
import InstallPrompt from './components/InstallPrompt';
import ThemeToggle from './components/ThemeToggle';
import { useAuthStore } from './stores/authStore';
import useTheme from './hooks/useTheme';

// Sadece giriş yapmış berberler (owner veya employee)
const BarberRoute = ({ children }) => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

// Sadece adminler
const AdminRoute = ({ children }) => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <ToastProvider>
    <BrowserRouter>
      <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      <Routes>
        {/* Karşılama */}
        <Route path="/" element={<LandingPage />} />

        {/* Dükkan Seçimi */}
        <Route path="/book" element={<ShopSelectPage />} />

        {/* Rezervasyon */}
        <Route path="/book/:shopSlug" element={<CustomerPage />} />

        {/* Giriş */}
        <Route path="/login" element={<LoginPage />} />

        {/* Berber Paneli */}
        <Route
          path="/dashboard"
          element={
            <BarberRoute>
              <DashboardPage />
            </BarberRoute>
          }
        />

        {/* Admin Paneli */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        {/* Müşteri iptal linki */}
        <Route path="/cancel" element={<CancelPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    <InstallPrompt />
    </ToastProvider>
  );
}

export default App;
