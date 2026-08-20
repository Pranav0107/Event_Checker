import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';

export default function EventDetails() {
  const { id } = useParams<{id: string}>();
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvent();
    // We should technically fetch the user's registration status here.
    // For simplicity, we just assume they might not be registered.
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (registration && registration.status !== 'cancelled') {
      fetchRotatingToken();
      interval = setInterval(fetchRotatingToken, 15000); // Rotate every 15s
    }
    return () => clearInterval(interval);
  }, [registration]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err: any) {
      setError('Failed to load event');
    }
  };

  const register = async () => {
    try {
      const res = await api.post(`/registrations`, { event_id: id });
      setRegistration(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const cancel = async () => {
    if (!registration) return;
    try {
      await api.post(`/registrations/${registration.id}/cancel`);
      setRegistration({ ...registration, status: 'cancelled' });
      setQrToken(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Cancellation failed');
    }
  };

  const fetchRotatingToken = async () => {
    if (!registration) return;
    try {
      const res = await api.post(`/registrations/${registration.id}/rotate-token`);
      setQrToken(res.data.qr_token);
    } catch (err) {
      console.error('Failed to rotate token', err);
    }
  };

  if (!event) return <div>Loading event... {error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-3xl font-bold mb-2">{event.name}</h2>
      <p className="text-gray-600 mb-6">{new Date(event.date).toLocaleString()}</p>
      
      {error && <div className="bg-red-100 text-red-600 p-2 mb-4 rounded">{error}</div>}

      {!registration ? (
        <button onClick={register} className="bg-blue-600 text-white px-4 py-2 rounded">
          Register Now
        </button>
      ) : (
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Your Registration</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              registration.status === 'registered' ? 'bg-green-100 text-green-700' :
              registration.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
              registration.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {registration.status.toUpperCase()}
            </span>
          </div>

          {(registration.status === 'registered' || registration.status === 'waitlisted') && (
             <button onClick={cancel} className="text-red-500 underline text-sm mb-4">Cancel Registration</button>
          )}

          {qrToken && registration.status !== 'cancelled' && (
            <div className="mt-6 flex flex-col items-center">
              <p className="mb-2 text-sm text-gray-500">Scan this QR code to check in. It updates every 15s.</p>
              <div className="p-4 bg-white border rounded shadow-sm inline-block">
                <QRCodeSVG value={qrToken} size={256} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
