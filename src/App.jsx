import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/LandingPage';
import ShopSelectPage from './pages/ShopSelectPage';
import CustomerPage from './pages/CustomerPage';
import AppointmentLookupPage from './pages/AppointmentLookupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CancelPage from './pages/CancelPage';
import InstallPrompt from './components/InstallPrompt';
import FcmManager from './components/FcmManager';
import { useAuthStore } from './stores/authStore';
import useTheme from './hooks/useTheme';

// Sadece giriş yapmış staff (owner veya employee)
const StaffRoute = ({ children }) => {
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

// Giriş yapmışsa dashboard'a yönlendir
const HomeRoute = () => {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  if (token) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
};

// Login sayfası: zaten giriş yapmışsa dashboard'a yönlendir
const LoginRoute = () => {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  if (token) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
};

function App() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        {/* Karşılama */}
        <Route path="/" element={<HomeRoute />} />

        {/* Dükkan Seçimi */}
        <Route path="/book" element={<ShopSelectPage />} />

        {/* Rezervasyon */}
        <Route path="/book/:shopSlug" element={<CustomerPage />} />

        {/* Musteri randevu sorgulama */}
        <Route path="/appointments/query" element={<AppointmentLookupPage />} />

        {/* Giriş */}
        <Route path="/login" element={<LoginRoute />} />

        {/* Staff Paneli */}
        <Route
          path="/dashboard"
          element={
            <StaffRoute>
              <DashboardPage isDark={isDark} onToggleTheme={toggleTheme} />
            </StaffRoute>
          }
        />

        {/* Admin Paneli */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage isDark={isDark} onToggleTheme={toggleTheme} />
            </AdminRoute>
          }
        />

        {/* Müşteri iptal linki */}
        <Route path="/cancel" element={<CancelPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    <FcmManager />
    <InstallPrompt />
    </ToastProvider>
  );
}

export default App;
