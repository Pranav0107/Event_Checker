import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import EventDetails from './pages/EventDetails';
import EventList from './pages/EventList';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmail from './pages/VerifyEmail';

const PrivateRoute = ({ children, requireRole }: { children: React.ReactNode, requireRole?: string }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" />;
  return <>{children}</>;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.98, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className="w-full h-full flex flex-col justify-center"
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <div className="min-h-screen text-gray-900 flex flex-col pb-12">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30 animate-pulse">
            🎟️
          </div>
          <Link to="/" className="text-xl font-black bg-gradient-to-r from-gray-900 via-rose-700 to-indigo-900 bg-clip-text text-transparent tracking-tight hover:opacity-85 transition-opacity">
            EventEntry
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-rose-700 bg-rose-50/80 border border-rose-100 px-3.5 py-2 rounded-xl backdrop-blur-sm shadow-sm">
              👤 {user.name} ({user.role})
            </span>
            <button 
              onClick={() => logout()} 
              className="text-xs font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-red-500/10"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="p-4 max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/verify/:token" element={<PageTransition><VerifyEmail /></PageTransition>} />
            <Route path="/dashboard" element={
              <PrivateRoute requireRole="organizer"><PageTransition><Dashboard /></PageTransition></PrivateRoute>
            } />
            <Route path="/scan" element={
              <PrivateRoute requireRole="organizer"><PageTransition><Scan /></PageTransition></PrivateRoute>
            } />
            <Route path="/events" element={
              <PrivateRoute><PageTransition><EventList /></PageTransition></PrivateRoute>
            } />
            <Route path="/events/:id" element={
              <PrivateRoute><PageTransition><EventDetails /></PageTransition></PrivateRoute>
            } />
            <Route path="/" element={<Navigate to={user?.role === 'organizer' ? '/dashboard' : '/events'} />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
