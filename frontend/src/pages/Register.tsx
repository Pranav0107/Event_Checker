import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'attendee'|'organizer'>('attendee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', { name, email, password, role });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-6 animate-float">
      <div className="glass-card p-8 rounded-3xl shadow-2xl border border-white/30">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-pink-500/20 animate-pulse">
            ✨
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Get Started</h2>
          <p className="text-gray-500 text-sm mt-1 text-center font-medium">Create your event check-in account</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-4 mb-6 rounded-2xl animate-pulse">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="border border-white/40 bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-sm shadow-inner" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="border border-white/40 bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-sm shadow-inner" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="border border-white/40 bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-sm shadow-inner" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Account Role</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value as any)} 
              className="border border-white/40 bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer shadow-inner"
            >
              <option value="attendee">Attendee (Check into events)</option>
              <option value="organizer">Organizer (Manage check-ins)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold p-4 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 duration-150 mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-pink-600 font-bold hover:underline transition-colors">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
