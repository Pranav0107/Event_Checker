import express, { Response } from 'express';
import pool from '../db';
import { authenticate, requireOrganizer, AuthRequest } from '../middleware/auth';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

router.post('/', authenticate, requireOrganizer, async (req: AuthRequest, res: Response): Promise<void> => {
  const { event_id, question } = req.body;

  if (!event_id || !question) {
    res.status(400).json({ error: 'event_id and question are required' });
    return;
  }

  try {
    // 1. Gather all real numbers from the database
    const eventResult = await pool.query('SELECT name, capacity FROM events WHERE id = $1', [event_id]);
    if (eventResult.rows.length === 0) {
       res.status(404).json({ error: 'Event not found' });
       return;
    }
    const eventName = eventResult.rows[0].name;
    const capacity = eventResult.rows[0].capacity;

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in_count,
        COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_count,
        COUNT(CASE WHEN status = 'waitlisted' THEN 1 END) as waitlisted_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM registrations 
      WHERE event_id = $1
    `, [event_id]);

    const stats = statsResult.rows[0];

    // Peak check-in time calculation
    const peakTimeResult = await pool.query(`
      SELECT date_trunc('hour', checked_in_at) as hour, COUNT(*) as count
      FROM registrations
      WHERE event_id = $1 AND status = 'checked_in' AND checked_in_at IS NOT NULL
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `, [event_id]);

    const peakTimeStr = peakTimeResult.rows.length > 0 ? 
      `Peak check-in hour was ${peakTimeResult.rows[0].hour} with ${peakTimeResult.rows[0].count} check-ins.` : 
      'Not enough check-ins to determine a peak time.';

    // Construct the context
    const contextStr = `
Event Name: ${eventName}
Capacity: ${capacity}
Total Registrations (including waitlist/cancelled): ${stats.total_registrations}
Currently Checked In: ${stats.checked_in_count}
Registered (not yet checked in, aka no-shows): ${stats.registered_count}
Waitlisted: ${stats.waitlisted_count}
Cancelled: ${stats.cancelled_count}
Spots Left: ${capacity - (parseInt(stats.checked_in_count) + parseInt(stats.registered_count))}
Peak check-in information: ${peakTimeStr}
    `;

    // 2. Call Gemini API
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `System: You are an AI assistant for an event organizer. Use ONLY the provided context to answer the organizer's question in plain English. Do not invent numbers. Be concise.

Here is the current data for the event:
${contextStr}

Question: ${question}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const answer = response.text || 'Could not parse AI response.';

      res.json({ answer, raw_data: contextStr });
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      // Graceful fallback
      res.json({ 
        answer: "I'm currently unable to process natural language questions, but here is the raw data:",
        raw_data: contextStr,
        fallback: true
      });
    }

  } catch (dbError) {
    console.error(dbError);
    res.status(500).json({ error: 'Server error retrieving data' });
  }
});

export default router;
