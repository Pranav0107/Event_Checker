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
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    fetchEvent();
    fetchRegistrationStatus();
  }, [id]);

  useEffect(() => {
    let interval: any;
    let countdownInterval: any;
    if (registration && (registration.status === 'registered' || registration.status === 'checked_in')) {
      fetchRotatingToken();
      
      interval = setInterval(() => {
        fetchRotatingToken();
        setCountdown(15);
      }, 15000); // Rotate every 15s

      countdownInterval = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 15));
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [registration]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err: any) {
      setError('Failed to load event details.');
    }
  };

  const fetchRegistrationStatus = async () => {
    try {
      const res = await api.get(`/events/${id}/registrations`);
      // Filter for active logged in user's registration
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const myReg = res.data.find((r: any) => r.email === user.email);
        if (myReg) {
          setRegistration(myReg);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/registrations`, { event_id: id });
      setRegistration(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!registration) return;
    if (!confirm("Are you sure you want to cancel your registration?")) return;
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

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4 text-sm font-medium">Loading ticket details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 transition-all duration-300">
      {/* Ticket Design */}
      <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Top Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 relative">
          <div className="absolute right-4 top-4 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm uppercase tracking-wider">
            Ticket
          </div>
          <h2 className="text-2xl font-bold mb-1 tracking-tight mr-16">{event.name}</h2>
          <p className="text-indigo-100 text-xs font-medium flex items-center gap-1.5 mt-2">
            📅 {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-indigo-100 text-xs font-medium flex items-center gap-1.5 mt-1">
            ⏰ {new Date(event.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Ticket Tear Cutout design */}
        <div className="relative flex items-center justify-between px-4 bg-white">
          <div className="h-6 w-3 bg-gray-50 rounded-r-full -left-1 absolute border-r border-gray-100"></div>
          <div className="w-full border-t border-dashed border-gray-200"></div>
          <div className="h-6 w-3 bg-gray-50 rounded-l-full -right-1 absolute border-l border-gray-100"></div>
        </div>

        {/* Bottom Section */}
        <div className="p-6 bg-white flex flex-col items-center">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 mb-4 rounded-xl w-full text-center">
              ⚠️ {error}
            </div>
          )}

          {!registration ? (
            <div className="text-center w-full py-4">
              <p className="text-sm text-gray-500 mb-4">Secure your spot for this event. Capacity is limited.</p>
              <button 
                onClick={register} 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Now'}
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="flex justify-between items-center w-full mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  registration.status === 'registered' ? 'bg-green-50 text-green-700 border border-green-200' :
                  registration.status === 'waitlisted' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  registration.status === 'checked_in' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {registration.status}
                </span>
              </div>

              {qrToken && registration.status !== 'cancelled' && (
                <div className="flex flex-col items-center w-full mt-2">
                  <div className="relative p-5 bg-white border border-gray-100 rounded-2xl shadow-inner animate-glow inline-block">
                    <QRCodeSVG value={qrToken} size={200} />
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                    <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                      Rotating QR in <span className="text-indigo-600 font-bold">{countdown}s</span>
                    </p>
                  </div>
                </div>
              )}

              {registration.status === 'waitlisted' && (
                <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-4 text-center my-3 w-full">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ The event is currently full. You have been placed on the waitlist. You will be automatically registered if a spot opens up.
                  </p>
                </div>
              )}

              {registration.status === 'checked_in' && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center my-3 w-full">
                  <p className="text-xs text-blue-800 font-medium">
                    🎉 Welcome! You have checked into the event. Enjoy!
                  </p>
                </div>
              )}

              {(registration.status === 'registered' || registration.status === 'waitlisted') && (
                <button 
                  onClick={cancel} 
                  className="mt-6 text-xs text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider transition-colors hover:underline"
                >
                  Cancel Ticket
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
