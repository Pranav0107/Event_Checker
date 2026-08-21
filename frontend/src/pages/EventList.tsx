import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function EventList() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events');
        setEvents(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mt-6 transition-all duration-300">
      <div className="flex flex-col gap-2 glass-card p-6 rounded-3xl shadow-xl border border-white/30">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Upcoming Events</h2>
        <p className="text-sm text-gray-600 font-semibold">Browse and register for events happening soon.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, idx) => (
          <Link 
            to={`/events/${event.id}`} 
            key={event.id}
            className="glass-card rounded-3xl shadow-lg border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6">
              <h3 className="text-xl font-bold mb-2 tracking-tight">{event.name}</h3>
              <div className="flex flex-col gap-1 text-sm font-medium text-indigo-100">
                <p>📅 {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                {(event.start_time || event.venue) && (
                  <p>
                    {event.start_time && `⏰ ${event.start_time}`} 
                    {event.venue && ` 📍 ${event.venue}`}
                  </p>
                )}
              </div>
            </div>
            <div className="p-5 bg-white/40">
              <span className="text-indigo-600 font-bold text-sm flex items-center justify-between">
                View Ticket & Register <span>→</span>
              </span>
            </div>
          </Link>
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-12 glass-card rounded-3xl border border-white/30">
            <p className="text-gray-500 font-semibold">No upcoming events found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
