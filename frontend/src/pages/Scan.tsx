import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/client';
import { Link } from 'react-router-dom';

export default function Scan() {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'|'info'}>({msg: 'Waiting for scan...', type: 'info'});
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load queue from localStorage
    const saved = localStorage.getItem('offlineQueue');
    if (saved) setOfflineQueue(JSON.parse(saved));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Init scanner
    scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    
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
    // Prevent double rapid scanning
    if (scannerRef.current) {
       scannerRef.current.pause();
       setTimeout(() => scannerRef.current?.resume(), 2000);
    }

    const payload = {
      qr_token: decodedText,
      client_timestamp: new Date().toISOString(),
      station_id: 'scanner-pwa'
    };

    if (navigator.onLine) {
      // Online Scan
      try {
        const res = await api.post('/checkin/scan', payload);
        setStatus({ msg: `${res.data.attendee} checked in!`, type: 'success' });
      } catch (err: any) {
        setStatus({ msg: err.response?.data?.error || 'Check-in failed', type: 'error' });
      }
    } else {
      // Offline Scan
      setOfflineQueue(prev => [...prev, payload]);
      setStatus({ msg: `Offline scan saved.`, type: 'info' });
    }
  };

  const onScanFailure = (error: any) => {
    // ignore
  };

  const syncOfflineQueue = async () => {
    if (syncing || offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      const res = await api.post('/sync', { scans: offlineQueue });
      // Clear queue if successful
      if (res.data.success) {
        setOfflineQueue([]);
        setStatus({ msg: `Synced ${res.data.results.length} offline scans!`, type: 'success' });
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
        <h2 className="text-xl font-bold">QR Scanner</h2>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      <div className={`p-3 rounded text-center font-bold text-white ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
        {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <div id="reader" className="w-full"></div>
        <div className={`mt-4 p-4 rounded text-center font-semibold ${
          status.type === 'success' ? 'bg-green-100 text-green-800' : 
          status.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {status.msg}
        </div>
      </div>

      {offlineQueue.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-2">Pending Offline Scans ({offlineQueue.length})</h3>
          <p className="text-sm text-yellow-700">These will automatically sync when you regain connection.</p>
          {isOnline && (
            <button onClick={syncOfflineQueue} disabled={syncing} className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">
              {syncing ? 'Syncing...' : 'Force Sync Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
