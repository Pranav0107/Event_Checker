import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    api.post('/auth/verify', { token })
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link might be expired or invalid.');
      });
  }, [token]);

  return (
    <div className="max-w-md w-full mx-auto mt-12 animate-float">
      <div className="glass-card p-8 rounded-3xl shadow-2xl border border-white/30 text-center flex flex-col items-center">
        
        {status === 'verifying' && (
          <>
            <div className="h-16 w-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-6"></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Verifying...</h2>
            <p className="text-gray-500 font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-lg shadow-green-500/20">
              ✅
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Email Verified!</h2>
            <p className="text-gray-500 font-medium mb-8">{message}</p>
            <Link to="/login" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-95 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 text-center inline-block">
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-lg shadow-rose-500/20">
              ❌
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Verification Failed</h2>
            <p className="text-gray-500 font-medium mb-8">{message}</p>
            <Link to="/register" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all shadow-sm active:scale-95 text-center inline-block">
              Try Registering Again
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
