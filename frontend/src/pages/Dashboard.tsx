import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AiInsights from '../components/AiInsights';
import { playBeep } from '../utils/sound';

export default function Dashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    start_time: '',
    end_time: '',
    venue: '',
    speaker_name: '',
    description: '',
    capacity: ''
  });

  useEffect(() => {
    fetchEvents();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const socketUrl = apiUrl.replace('/api', '');
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('check_in_update', (data) => {
      setRegistrations(prev => prev.map(r => 
        r.id === data.registration_id ? { ...r, status: data.status, checked_in_at: data.status === 'checked_in' ? new Date().toISOString() : null } : r
      ));
    });

    newSocket.on('waitlist_promoted', (data) => {
      setRegistrations(prev => prev.map(r => 
        r.id === data.registration_id ? { ...r, status: 'registered' } : r
      ));
    });

    return () => { newSocket.close(); };
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchRegistrations(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    const res = await api.get('/events');
    setEvents(res.data);
    if (res.data.length > 0) setSelectedEventId(res.data[0].id.toString());
  };

  const fetchRegistrations = async (eventId: string) => {
    setLoadingRegs(true);
    try {
      const res = await api.get(`/events/${eventId}/registrations`);
      setRegistrations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', { 
        ...newEvent, 
        capacity: parseInt(newEvent.capacity),
        date: new Date(newEvent.date).toISOString()
      });
      setShowEventModal(false);
      setNewEvent({ name: '', date: '', start_time: '', end_time: '', venue: '', speaker_name: '', description: '', capacity: '' });
      fetchEvents();
      playBeep('success');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create event');
    }
  };

  const handleManualCheckIn = async (regId: number) => {
    try {
      await api.post('/checkin/manual', { registration_id: regId, station_id: 'dashboard' });
      playBeep('success');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Manual checkin failed');
      playBeep('error');
    }
  };

  const handleUndo = async (regId: number) => {
    try {
      await api.post('/checkin/undo', { registration_id: regId, station_id: 'dashboard' });
      playBeep('error');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Undo failed');
    }
  };

  const exportCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Name', 'Email', 'Status', 'Checked In At'];
    const rows = registrations.map(r => [
      r.name, 
      r.email, 
      r.status, 
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `event_${selectedEventId}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRegistrations = registrations.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const checkedInCount = registrations.filter(r => r.status === 'checked_in').length;
  const registeredCount = registrations.filter(r => r.status === 'registered').length;
  const waitlistedCount = registrations.filter(r => r.status === 'waitlisted').length;

  // Compute stats for current event capacity
  const currentEvent = events.find(e => e.id.toString() === selectedEventId);
  const totalCapacity = currentEvent ? currentEvent.capacity : 1;
  const activeAttendeesCount = registrations.filter(r => r.status === 'registered' || r.status === 'checked_in').length;
  const capacityFilledPercent = Math.min(100, Math.round((activeAttendeesCount / totalCapacity) * 100));
  const attendanceRatePercent = activeAttendeesCount > 0 ? Math.min(100, Math.round((checkedInCount / activeAttendeesCount) * 100)) : 0;

  // SVG parameters for radial gauge
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffsetCapacity = circumference - (capacityFilledPercent / 100) * circumference;
  const strokeDashoffsetAttendance = circumference - (attendanceRatePercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 mt-6 transition-all duration-300">
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-3xl shadow-2xl border border-white/30">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Organizer Control Center</h2>
          <p className="text-sm text-gray-600 font-semibold">Real-time attendance metrics & guest management</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={exportCSV} 
            className="flex-1 md:flex-none border border-white/50 bg-white/40 hover:bg-white/60 text-gray-700 font-bold px-5 py-3.5 rounded-2xl transition-all shadow-md active:scale-95 text-xs duration-150 flex items-center justify-center gap-1.5 backdrop-blur-sm"
          >
            📥 Export CSV
          </button>
          <Link 
            to="/scan" 
            className="flex-1 md:flex-none bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 text-xs duration-150 flex items-center justify-center gap-1.5"
          >
            📷 Open QR Scanner
          </Link>
        </div>
      </div>

      {/* Select Event Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select 
          className="bg-white/60 border border-white/40 p-4 rounded-2xl flex-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-lg transition-all backdrop-blur-sm"
          value={selectedEventId || ''} 
          onChange={e => setSelectedEventId(e.target.value)}
        >
          {events.map(e => <option key={e.id} value={e.id}>{e.name} (Capacity Limit: {e.capacity})</option>)}
        </select>
        <button 
          onClick={() => setShowEventModal(true)} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-4 rounded-2xl text-sm transition-all shadow-md active:scale-95"
        >
          ➕ Create New Event
        </button>
      </div>

      {selectedEventId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Area */}
          <div className="lg:col-span-2 glass-card rounded-3xl shadow-2xl border border-white/30 overflow-hidden flex flex-col">
            
            {/* Real-time visual progress gauges */}
            <div className="p-6 bg-white/40 border-b border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              
              {/* Capacity Gauge */}
              <div className="flex items-center gap-4 bg-white/30 p-4 rounded-2xl border border-white/20">
                <div className="relative h-20 w-20 flex-shrink-0">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
                    <circle cx="40" cy="40" r={radius} stroke="#e73c7e" strokeWidth="6" fill="transparent" 
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffsetCapacity} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-800">
                    {capacityFilledPercent}%
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-800">Capacity Filled</h4>
                  <p className="text-xs text-gray-500 font-semibold">{activeAttendeesCount} of {totalCapacity} slots taken</p>
                </div>
              </div>

              {/* Attendance Check-in rate Gauge */}
              <div className="flex items-center gap-4 bg-white/30 p-4 rounded-2xl border border-white/20">
                <div className="relative h-20 w-20 flex-shrink-0">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
                    <circle cx="40" cy="40" r={radius} stroke="#23a6d5" strokeWidth="6" fill="transparent" 
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffsetAttendance} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-800">
                    {attendanceRatePercent}%
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-800">Check-in Progress</h4>
                  <p className="text-xs text-gray-500 font-semibold">{checkedInCount} of {activeAttendeesCount} checked in</p>
                </div>
              </div>

            </div>

            {/* Stats Sub-header badges */}
            <div className="bg-white/20 p-6 border-b border-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-black text-gray-800">
                Registrants List
              </h3>
              <div className="text-[10px] font-bold flex flex-wrap gap-2">
                 <span className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-3.5 py-2 rounded-full backdrop-blur-sm">
                   ✅ Checked In: {checkedInCount}
                 </span>
                 <span className="bg-blue-500/10 text-blue-800 border border-blue-500/20 px-3.5 py-2 rounded-full backdrop-blur-sm">
                   🎟️ Registered: {registeredCount}
                 </span>
                 <span className="bg-pink-500/10 text-pink-800 border border-pink-500/20 px-3.5 py-2 rounded-full backdrop-blur-sm animate-pulse">
                   ⏳ Waitlist: {waitlistedCount}
                 </span>
              </div>
            </div>

            {/* Table Search */}
            <div className="p-6 pb-2">
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border border-white/40 bg-white/40 p-4 rounded-2xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Table wrapper */}
            {loadingRegs ? (
              <div className="py-20 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/10 text-gray-600 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-sm text-gray-500 font-semibold">
                          No registrants found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg, idx) => (
                        <tr 
                          key={reg.id} 
                          className="hover:bg-white/20 transition-colors text-sm text-gray-700 font-medium animate-slide-up"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <td className="p-4 font-bold text-gray-900">{reg.name}</td>
                          <td className="p-4 text-gray-600">{reg.email}</td>
                          <td className="p-4">
                             <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider border ${
                                reg.status === 'checked_in' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                                reg.status === 'registered' ? 'bg-blue-500/10 text-blue-800 border-blue-500/20' :
                                'bg-pink-500/10 text-pink-800 border-pink-500/20'
                             }`}>
                               {reg.status}
                             </span>
                          </td>
                          <td className="p-4 text-right">
                            {reg.status === 'registered' && (
                              <button 
                                onClick={() => handleManualCheckIn(reg.id)} 
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                              >
                                Check In
                              </button>
                            )}
                            {reg.status === 'checked_in' && (
                              <button 
                                onClick={() => handleUndo(reg.id)} 
                                className="bg-gradient-to-r from-rose-500 to-red-600 hover:opacity-95 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all active:scale-95 shadow-md"
                              >
                                Undo Check-In
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Side panel */}
          <div className="lg:col-span-1 h-full">
            <AiInsights eventId={selectedEventId} />
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <h2 className="text-2xl font-bold">Create New Event</h2>
              <p className="text-indigo-100 text-sm">Fill in the details for your upcoming event.</p>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Event Name</label>
                <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} placeholder="e.g. Annual Tech Conference" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Date</label>
                <input required type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Capacity</label>
                <input required type="number" min="1" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} placeholder="100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Start Time</label>
                <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">End Time</label>
                <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Venue</label>
                <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} placeholder="e.g. Main Auditorium" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Speaker Name</label>
                <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={newEvent.speaker_name} onChange={e => setNewEvent({...newEvent, speaker_name: e.target.value})} placeholder="e.g. Jane Doe" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg active:scale-95">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
