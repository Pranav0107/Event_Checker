import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/client';
import { Link } from 'react-router-dom';

export default function Scan() {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'|'info'}>({msg: 'Point camera at a guest\'s ticket QR code...', type: 'info'});
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [syncing, setSyncing] = useState(false);

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
      scannerRef.current?.clear().catch(console.error);
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
       setTimeout(() => scannerRef.current?.resume(), 2500);
    }

    const payload = {
      qr_token: decodedText,
      client_timestamp: new Date().toISOString(),
      station_id: 'scanner-pwa'
    };

    if (navigator.onLine) {
      try {
        const res = await api.post('/checkin/scan', payload);
        setStatus({ msg: `✅ ${res.data.attendee} checked in successfully!`, type: 'success' });
      } catch (err: any) {
        setStatus({ msg: `❌ ${err.response?.data?.error || 'Check-in failed'}`, type: 'error' });
      }
    } else {
      setOfflineQueue(prev => [...prev, payload]);
      setStatus({ msg: `💾 Offline scan saved successfully to queue.`, type: 'info' });
    }
  };

  const onScanFailure = (error: any) => {
    // ignore scanner scan fails (expected when not looking at a QR)
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
    <div className="max-w-md mx-auto flex flex-col gap-6 mt-6">
      <div className="flex justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          📷 Scan QR Code
        </h2>
        <Link to="/dashboard" className="text-blue-600 font-semibold text-sm hover:underline transition-all">
          Exit Dashboard
        </Link>
      </div>

      {/* Online indicator */}
      <div className={`p-3.5 rounded-2xl text-center font-bold text-xs uppercase tracking-widest border transition-all duration-300 ${
        isOnline 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
      }`}>
        {isOnline ? '🟢 Connected / Online Mode' : '⚠️ Offline Mode (Caching Active)'}
      </div>

      {/* Scanner Wrapper */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-950">
            {/* Holographic scanner effect overlay */}
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-2xl pointer-events-none z-10"></div>
            <div id="reader" className="w-full relative z-0"></div>
          </div>

          {/* Status Message */}
          <div className={`mt-6 p-4 rounded-xl text-center font-semibold text-sm transition-all duration-300 border ${
            status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
            status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800 animate-shake' : 
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {status.msg}
          </div>
        </div>
      </div>

      {/* Offline Queue panel */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-50/80 backdrop-blur-sm p-5 rounded-3xl border border-amber-200 shadow-lg animate-fade-in">
          <h3 className="font-bold text-amber-800 mb-1 flex items-center gap-1.5 text-sm uppercase tracking-wider">
            💾 Queued Local Scans ({offlineQueue.length})
          </h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            Scanning offline. Scans are saved securely on this device and will sync automatically when you reconnect.
          </p>
          {isOnline && (
            <button 
              onClick={syncOfflineQueue} 
              disabled={syncing} 
              className="mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {syncing ? 'Syncing data...' : 'Force Sync Data'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
