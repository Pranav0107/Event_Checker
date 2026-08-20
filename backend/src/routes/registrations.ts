import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Rate limiting: 5 requests per 5 minutes per IP
const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts from this IP, please try again after 5 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  // Note: Using default memory store. This means rate limiting is per-process.
  // In a real multi-server deployment without sticky sessions, a Redis store should be used.
});

// Register for an event
router.post('/', authenticate, registrationLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const { event_id } = req.body;
  const attendee_id = req.user?.id;

  if (!event_id) {
    res.status(400).json({ error: 'event_id is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the event row to serialize registrations and check capacity accurately
    const eventResult = await client.query('SELECT capacity FROM events WHERE id = $1 FOR UPDATE', [event_id]);
    
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const capacity = eventResult.rows[0].capacity;

    // Check if user has a previous record (e.g. cancelled)
    const existingResult = await client.query(
      'SELECT id, status FROM registrations WHERE event_id = $1 AND attendee_id = $2 FOR UPDATE',
      [event_id, attendee_id]
    );

    if (existingResult.rows.length > 0) {
      const existingStatus = existingResult.rows[0].status;
      if (existingStatus === 'registered' || existingStatus === 'waitlisted') {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'You are already registered for this event' });
        return;
      }
    }

    // Check current registered count
    const countResult = await client.query(
      "SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'registered'",
      [event_id]
    );
    const registeredCount = parseInt(countResult.rows[0].count, 10);

    const status = registeredCount >= capacity ? 'waitlisted' : 'registered';
    const qrToken = uuidv4();

    let registrationRecord;

    if (existingResult.rows.length > 0) {
      // Update existing cancelled registration
      const updateResult = await client.query(
        'UPDATE registrations SET status = $1, qr_token = $2 WHERE id = $3 RETURNING *',
        [status, qrToken, existingResult.rows[0].id]
      );
      registrationRecord = updateResult.rows[0];
    } else {
      // Insert new registration
      const insertResult = await client.query(
        'INSERT INTO registrations (event_id, attendee_id, status, qr_token) VALUES ($1, $2, $3, $4) RETURNING *',
        [event_id, attendee_id, status, qrToken]
      );
      registrationRecord = insertResult.rows[0];
    }

    await client.query('COMMIT');
    res.status(201).json(registrationRecord);
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      res.status(409).json({ error: 'You are already registered for this event' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  } finally {
    client.release();
  }
});

// Rotate QR Token (called by frontend every X seconds to get a fresh rotating token)
router.post('/:id/rotate-token', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const registrationId = req.params.id;
  const attendeeId = req.user?.id;
  
  const newToken = uuidv4();
  try {
    // Only allow rotating if it's the attendee's own registration
    const result = await pool.query(
      'UPDATE registrations SET qr_token = $1 WHERE id = $2 AND attendee_id = $3 RETURNING qr_token',
      [newToken, registrationId, attendeeId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Registration not found or unauthorized' });
      return;
    }

    res.json({ qr_token: result.rows[0].qr_token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel registration (Waitlist Feature)
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const registrationId = req.params.id;
  const attendeeId = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the specific registration
    const regResult = await client.query(
      'SELECT * FROM registrations WHERE id = $1 AND attendee_id = $2 FOR UPDATE',
      [registrationId, attendeeId]
    );

    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Registration not found or unauthorized' });
      return;
    }

    const reg = regResult.rows[0];
    if (reg.status === 'cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Already cancelled' });
      return;
    }

    // Mark as cancelled
    await client.query("UPDATE registrations SET status = 'cancelled' WHERE id = $1", [registrationId]);

    // If they were 'registered', we might need to promote a waitlisted user
    if (reg.status === 'registered') {
      // Lock the event to prevent concurrent promotions/registrations race conditions
      await client.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [reg.event_id]);

      // Find the earliest waitlisted user
      const waitlistResult = await client.query(
        "SELECT id FROM registrations WHERE event_id = $1 AND status = 'waitlisted' ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
        [reg.event_id]
      );

      if (waitlistResult.rows.length > 0) {
        const promoteId = waitlistResult.rows[0].id;
        // Promote them!
        await client.query("UPDATE registrations SET status = 'registered' WHERE id = $1", [promoteId]);
        
        // Broadcast this promotion via Socket.io so the dashboard updates
        req.app.get('io').emit('waitlist_promoted', {
          event_id: reg.event_id,
          registration_id: promoteId
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Registration cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
