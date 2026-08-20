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
      setAnswer("Sorry, couldn't fetch insights.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-sm flex flex-col h-full border border-purple-100">
      <h3 className="text-lg font-bold text-purple-700 mb-2 flex items-center gap-2">
        ✨ AI Insights
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Ask natural language questions about your event data.
      </p>

      <form onSubmit={askQuestion} className="flex flex-col gap-2 mb-4">
        <input 
          type="text" 
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. How many spots are left?"
          className="border border-purple-200 p-2 rounded text-sm focus:outline-none focus:border-purple-500"
        />
        <button 
          type="submit" 
          disabled={loading || !question}
          className="bg-purple-600 text-white p-2 rounded text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </form>

      {answer && (
        <div className={`mt-2 p-3 rounded text-sm ${isFallback ? 'bg-orange-50 border border-orange-200' : 'bg-purple-50 border border-purple-100'}`}>
          <p className="font-medium whitespace-pre-wrap">{answer}</p>
          {isFallback && rawData && (
             <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">{rawData}</pre>
          )}
        </div>
      )}
    </div>
  );
}
