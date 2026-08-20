import express, { Response } from 'express';
import pool from '../db';
import { authenticate, requireOrganizer, AuthRequest } from '../middleware/auth';

const router = express.Router();

// QR Scan Check-in
router.post('/scan', authenticate, requireOrganizer, async (req: AuthRequest, res: Response): Promise<void> => {
  const { qr_token, station_id, client_timestamp } = req.body;
  const organizerId = req.user?.id;

  if (!qr_token || !client_timestamp) {
    res.status(400).json({ error: 'qr_token and client_timestamp are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the registration by token AND lock it to prevent race conditions
    const regResult = await client.query(
      'SELECT r.*, e.name as event_name, u.name as attendee_name FROM registrations r ' +
      'JOIN events e ON r.event_id = e.id ' +
      'JOIN users u ON r.attendee_id = u.id ' +
      'WHERE r.qr_token = $1 FOR UPDATE',
      [qr_token]
    );

    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Invalid QR token. The attendee might have rotated it.' });
      return;
    }

    const reg = regResult.rows[0];

    // Status checks
    if (reg.status === 'cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Registration was cancelled.' });
      return;
    }
    if (reg.status === 'waitlisted') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Attendee is on the waitlist.' });
      return;
    }
    if (reg.status === 'checked_in') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: `Already checked in at ${reg.checked_in_at}` });
      return;
    }

    // Mark as checked in
    const serverTimestamp = new Date();
    await client.query(
      "UPDATE registrations SET status = 'checked_in', checked_in_at = $1 WHERE id = $2",
      [serverTimestamp, reg.id]
    );

    // Record audit trail
    await client.query(
      'INSERT INTO check_in_events (registration_id, action, source, station_id, client_timestamp, server_timestamp, performed_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [reg.id, 'check_in', 'qr_scan', station_id || 'unknown', client_timestamp, serverTimestamp, organizerId]
    );

    await client.query('COMMIT');

    // Broadcast check-in to dashboard
    req.app.get('io').emit('check_in_update', {
      event_id: reg.event_id,
      registration_id: reg.id,
      status: 'checked_in',
      attendee_name: reg.attendee_name
    });

    res.json({ success: true, message: 'Checked in successfully', attendee: reg.attendee_name });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
