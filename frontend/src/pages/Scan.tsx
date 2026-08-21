import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { playBeep } from '../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';

export default function Scan() {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'|'info'}>({msg: 'Point camera at a guest\'s ticket QR code...', type: 'info'});
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successName, setSuccessName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) setOfflineQueue(JSON.parse(saved));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Init scanner
    scannerRef.current = new Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 } 
    }, false);
    
    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [offlineQueue, isOnline]);

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
       scannerRef.current.pause();
    }

    const payload = {
      qr_token: decodedText,
      client_timestamp: new Date().toISOString(),
      station_id: 'scanner-pwa'
    };

    if (navigator.onLine) {
      try {
        const res = await api.post('/checkin/scan', payload);
        setStatus({ msg: `✅ Checked in confirmed! (${res.data.attendee})`, type: 'success' });
        setSuccessName(res.data.attendee);
        setShowSuccessOverlay(true);
        playBeep('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err: any) {
        setStatus({ msg: `❌ ${err.response?.data?.error || 'Check-in failed'}`, type: 'error' });
        playBeep('error');
        setTimeout(() => scannerRef.current?.resume(), 2000);
      }
    } else {
      setOfflineQueue(prev => [...prev, payload]);
      setStatus({ msg: `💾 Offline scan saved successfully to queue.`, type: 'info' });
      playBeep('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  const onScanFailure = (_error: any) => {
    // ignore
  };

  const syncOfflineQueue = async () => {
    if (syncing || offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      const res = await api.post('/sync', { scans: offlineQueue });
      if (res.data.success) {
        setOfflineQueue([]);
        setStatus({ msg: `🔄 Synced ${res.data.results.length} offline scans to server!`, type: 'success' });
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto flex flex-col gap-6 mt-6 animate-float relative">
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-emerald-400 shadow-2xl"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 mb-4"
            >
              <span className="text-5xl text-white">✓</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black text-emerald-800 tracking-tight"
            >
              Checked In!
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-bold text-emerald-600 mt-1"
            >
              {successName}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center glass-card p-5 rounded-3xl shadow-2xl border border-white/30">
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
          📷 Scan QR Code
        </h2>
        <Link to="/dashboard" className="text-pink-600 font-extrabold text-sm hover:underline transition-all">
          Exit Dashboard
        </Link>
      </div>

      {/* Online indicator */}
      <div className={`p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-widest border transition-all duration-300 backdrop-blur-sm ${
        isOnline 
          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' 
          : 'bg-rose-500/10 text-rose-800 border-rose-500/20 animate-pulse'
      }`}>
        {isOnline ? '🟢 Connected / Online Mode' : '⚠️ Offline Mode (Caching Active)'}
      </div>

      {/* Scanner Wrapper */}
      <div className="glass-card rounded-3xl shadow-2xl border border-white/30 overflow-hidden relative">
        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 bg-gray-950">
            {/* Holographic scanner effect overlay */}
            <div className="absolute inset-0 border-4 border-pink-500/30 rounded-2xl pointer-events-none z-10 animate-pulse"></div>
            <div className="scanner-laser"></div>
            <div id="reader" className="w-full relative z-0"></div>
          </div>

          {/* Status Message */}
          <div className={`mt-6 p-4.5 rounded-2xl text-center font-bold text-sm transition-all duration-300 border ${
            status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' : 
            status.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 animate-bounce' : 
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-800'
          }`}>
            {status.msg}
          </div>
        </div>
      </div>

      {/* Offline Queue panel */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500/10 backdrop-blur-sm p-6 rounded-3xl border border-amber-500/20 shadow-xl">
          <h3 className="font-extrabold text-amber-800 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-widest">
            💾 Queued Local Scans ({offlineQueue.length})
          </h3>
          <p className="text-xs text-amber-700 leading-relaxed font-semibold">
            Scanning offline. Scans are saved securely on this device and will sync automatically when you reconnect.
          </p>
          {isOnline && (
            <button 
              onClick={syncOfflineQueue} 
              disabled={syncing} 
              className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-bold py-3 px-5 rounded-2xl text-xs transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {syncing ? 'Syncing data...' : 'Force Sync Data'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
