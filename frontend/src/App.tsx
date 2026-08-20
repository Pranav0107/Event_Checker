import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import EventDetails from './pages/EventDetails';

const PrivateRoute = ({ children, requireRole }: { children: React.ReactNode, requireRole?: string }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 flex flex-col pb-12">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 text-white font-bold h-9 w-9 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
            🎟️
          </div>
          <Link to="/" className="text-lg font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight hover:opacity-90">
            EventEntry
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
              👤 {user.name} ({user.role})
            </span>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
              }} 
              className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-xl transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="p-4 max-w-5xl w-full mx-auto flex-1 flex flex-col">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <PrivateRoute requireRole="organizer"><Dashboard /></PrivateRoute>
          } />
          <Route path="/scan" element={
            <PrivateRoute requireRole="organizer"><Scan /></PrivateRoute>
          } />
          <Route path="/events/:id" element={
            <PrivateRoute><EventDetails /></PrivateRoute>
          } />
          <Route path="/" element={<Navigate to={user?.role === 'organizer' ? '/dashboard' : '/login'} />} />
        </Routes>
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
