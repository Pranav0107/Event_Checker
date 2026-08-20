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
    const res = await api.get(`/events/${eventId}/registrations`);
    setRegistrations(res.data);
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Organizer Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700">
            Export CSV
          </button>
          <Link to="/scan" className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
            Open Scanner
          </Link>
        </div>
      </div>

      <div className="flex gap-4">
        <select 
          className="border p-2 rounded flex-1"
          value={selectedEventId || ''} 
          onChange={e => setSelectedEventId(e.target.value)}
        >
          {events.map(e => <option key={e.id} value={e.id}>{e.name} (Cap: {e.capacity})</option>)}
        </select>
        <button onClick={() => {
          const name = prompt("Event Name:");
          const capacity = prompt("Capacity:");
          if (name && capacity) {
            api.post('/events', { name, date: new Date().toISOString(), capacity: parseInt(capacity) })
              .then(fetchEvents);
          }
        }} className="bg-blue-600 text-white px-4 py-2 rounded">Create Event</button>
      </div>

      {selectedEventId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-4 rounded shadow-sm">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-semibold">Attendees ({registrations.length})</h3>
              <div className="text-sm font-semibold flex gap-2">
                 <span className="bg-blue-100 text-blue-800 px-2 rounded">Checked In: {checkedInCount}</span>
                 <span className="bg-green-100 text-green-800 px-2 rounded">Registered: {registeredCount}</span>
                 <span className="bg-yellow-100 text-yellow-800 px-2 rounded">Waitlist: {waitlistedCount}</span>
              </div>
            </div>

            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map(reg => (
                    <tr key={reg.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{reg.name}</td>
                      <td className="p-2">{reg.email}</td>
                      <td className="p-2">
                         <span className={`text-xs px-2 py-1 rounded-full ${
                            reg.status === 'checked_in' ? 'bg-blue-100' :
                            reg.status === 'registered' ? 'bg-green-100' :
                            'bg-gray-100'
                         }`}>
                           {reg.status}
                         </span>
                      </td>
                      <td className="p-2">
                        {reg.status === 'registered' && (
                          <button onClick={() => handleManualCheckIn(reg.id)} className="text-green-600 hover:underline text-sm mr-2">Check In</button>
                        )}
                        {reg.status === 'checked_in' && (
                          <button onClick={() => handleUndo(reg.id)} className="text-red-500 hover:underline text-sm">Undo</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <AiInsights eventId={selectedEventId} />
          </div>
        </div>
      )}
    </div>
  );
}
