import express, { Response } from 'express';
import pool from '../db';
import { authenticate, requireOrganizer, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all events
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create event
router.post('/', authenticate, requireOrganizer, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, date, capacity } = req.body;
  if (!name || !date || !capacity) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO events (name, date, capacity, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, date, capacity, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single event
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get event registrations (Organizer only)
router.get('/:id/registrations', authenticate, requireOrganizer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.status, r.checked_in_at, u.name, u.email 
      FROM registrations r
      JOIN users u ON r.attendee_id = u.id
      WHERE r.event_id = $1
      ORDER BY r.created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
