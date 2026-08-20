import React, { useState } from 'react';
import api from '../api/client';

export default function AiInsights({ eventId }: { eventId: string }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [rawData, setRawData] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;
    
    setLoading(true);
    setAnswer('');
    setRawData('');
    setIsFallback(false);

    try {
      const res = await api.post('/insights', { event_id: eventId, question });
      setAnswer(res.data.answer);
      setRawData(res.data.raw_data);
      if (res.data.fallback) setIsFallback(true);
    } catch (err: any) {
      setAnswer("Sorry, I encountered an error querying the AI processor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-purple-100 flex flex-col h-full transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl animate-pulse">✨</span>
        <h3 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
          AI Copilot Insights
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
        Ask natural language questions about registrations, attendance rates, and waitlists.
      </p>

      <form onSubmit={askQuestion} className="flex flex-col gap-2 mb-4">
        <input 
          type="text" 
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. How many waitlist spots are left?"
          className="border border-purple-100 bg-purple-50/20 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder:text-gray-400"
        />
        <button 
          type="submit" 
          disabled={loading || !question}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 duration-150"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Analyzing...
            </span>
          ) : 'Ask AI'}
        </button>
      </form>

      {answer && (
        <div className={`mt-2 p-4 rounded-xl text-sm transition-all duration-300 border ${
          isFallback 
            ? 'bg-amber-50/50 border-amber-100 text-amber-900' 
            : 'bg-purple-50/50 border-purple-100 text-purple-900'
        }`}>
          <p className="font-semibold mb-1 text-[11px] uppercase tracking-wider text-gray-400">Response</p>
          <p className="font-medium leading-relaxed whitespace-pre-wrap">{answer}</p>
          {isFallback && rawData && (
             <div className="mt-3">
               <p className="font-semibold text-[10px] uppercase tracking-wider text-amber-500 mb-1">Database Reference Table</p>
               <pre className="text-[11px] bg-white/80 p-2.5 rounded-lg border border-amber-100 text-gray-600 overflow-x-auto font-mono">{rawData}</pre>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
