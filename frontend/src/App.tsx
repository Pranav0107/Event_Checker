import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Event Check-In System</h1>
        {user && (
          <div className="flex gap-4">
            <span className="text-gray-600">Hello, {user.name}</span>
            <button onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.reload();
            }} className="text-red-500 hover:underline">Logout</button>
          </div>
        )}
      </nav>
      <main className="p-4 max-w-5xl mx-auto">
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
