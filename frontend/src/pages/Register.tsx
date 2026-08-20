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
    <div className="max-w-md mx-auto mt-12 transition-all duration-500 ease-out transform hover:scale-[1.01]">
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center mb-2 animate-bounce">
            ✨
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Get Started</h2>
          <p className="text-gray-500 text-sm mt-1">Create your event check-in account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 mb-6 rounded-xl animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="border border-gray-200 bg-gray-50/50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 bg-gray-50/50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="border border-gray-200 bg-gray-50/50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm" 
              required 
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Account Role</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value as any)} 
              className="border border-gray-200 bg-gray-50/50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="attendee">Attendee (Check into events)</option>
              <option value="organizer">Organizer (Manage check-ins)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold p-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 duration-150 mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline transition-colors">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
