import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AiInsights from '../components/AiInsights';

export default function Dashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loadingRegs, setLoadingRegs] = useState(false);

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

  const handleManualCheckIn = async (regId: number) => {
    try {
      await api.post('/checkin/manual', { registration_id: regId, station_id: 'dashboard' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Manual checkin failed');
    }
  };

  const handleUndo = async (regId: number) => {
    try {
      await api.post('/checkin/undo', { registration_id: regId, station_id: 'dashboard' });
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

  return (
    <div className="flex flex-col gap-6 mt-6 transition-all duration-300">
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Organizer Control Center</h2>
          <p className="text-sm text-gray-500 font-medium">Real-time attendance metrics & guest management</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={exportCSV} 
            className="flex-1 md:flex-none border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95 text-sm duration-150 flex items-center justify-center gap-1.5"
          >
            📥 Export CSV
          </button>
          <Link 
            to="/scan" 
            className="flex-1 md:flex-none bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 text-sm duration-150 flex items-center justify-center gap-1.5"
          >
            📷 Open QR Scanner
          </Link>
        </div>
      </div>

      {/* Select Event Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select 
          className="bg-white border border-gray-200 p-4 rounded-xl flex-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          value={selectedEventId || ''} 
          onChange={e => setSelectedEventId(e.target.value)}
        >
          {events.map(e => <option key={e.id} value={e.id}>{e.name} (Capacity Limit: {e.capacity})</option>)}
        </select>
        <button 
          onClick={() => {
            const name = prompt("Enter Event Name:");
            const capacity = prompt("Enter Capacity:");
            if (name && capacity) {
              api.post('/events', { name, date: new Date().toISOString(), capacity: parseInt(capacity) })
                .then(fetchEvents);
            }
          }} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-4 rounded-xl text-sm transition-all shadow-sm active:scale-95"
        >
          ➕ Create New Event
        </button>
      </div>

      {selectedEventId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Area */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Stats Sub-header banner */}
            <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">
                Registered Attendees ({registrations.length})
              </h3>
              <div className="text-xs font-bold flex flex-wrap gap-2">
                 <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full">
                   ✅ Checked In: {checkedInCount}
                 </span>
                 <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full">
                   🎟️ Registered: {registeredCount}
                 </span>
                 <span className="bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-full">
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
                className="border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Table wrapper */}
            {loadingRegs ? (
              <div className="py-20 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/30 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-sm text-gray-400 font-medium">
                          No registrants found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                          <td className="p-4 font-semibold text-gray-900">{reg.name}</td>
                          <td className="p-4 text-gray-500">{reg.email}</td>
                          <td className="p-4">
                             <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                                reg.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700' :
                                reg.status === 'registered' ? 'bg-blue-50 text-blue-700' :
                                'bg-amber-50 text-amber-700'
                             }`}>
                               {reg.status}
                             </span>
                          </td>
                          <td className="p-4 text-right">
                            {reg.status === 'registered' && (
                              <button 
                                onClick={() => handleManualCheckIn(reg.id)} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
                              >
                                Check In
                              </button>
                            )}
                            {reg.status === 'checked_in' && (
                              <button 
                                onClick={() => handleUndo(reg.id)} 
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-1.5 px-3 rounded-lg text-xs transition-all active:scale-95 border border-rose-150 inline-flex items-center gap-1"
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
    </div>
  );
}
