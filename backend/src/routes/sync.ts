import express, { Response } from 'express';
import pool from '../db';
import { authenticate, requireOrganizer, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, requireOrganizer, async (req: AuthRequest, res: Response): Promise<void> => {
  const { scans } = req.body;
  const organizerId = req.user?.id;

  if (!Array.isArray(scans)) {
    res.status(400).json({ error: 'scans must be an array' });
    return;
  }

  const results = [];
  const client = await pool.connect();

  try {
    for (const scan of scans) {
      const { qr_token, client_timestamp, station_id } = scan;

      if (!qr_token || !client_timestamp) {
        results.push({ qr_token, status: 'error', error: 'Missing fields' });
        continue;
      }

      await client.query('BEGIN');

      try {
        const regResult = await client.query(
          'SELECT * FROM registrations WHERE qr_token = $1 FOR UPDATE',
          [qr_token]
        );

        if (regResult.rows.length === 0) {
          await client.query('ROLLBACK');
          results.push({ qr_token, status: 'error', error: 'Invalid token' });
          continue;
        }

        const reg = regResult.rows[0];

        // Check for idempotency (dedupe)
        const dupCheck = await client.query(
          'SELECT id FROM check_in_events WHERE registration_id = $1 AND client_timestamp = $2 AND station_id = $3',
          [reg.id, client_timestamp, station_id || 'unknown']
        );

        if (dupCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          results.push({ qr_token, status: 'skipped', error: 'Already synced' });
          continue;
        }

        // Handle the offline-first race condition (First-timestamp-wins)
        let isOfficialCheckin = false;
        const scanTime = new Date(client_timestamp);

        if (reg.status !== 'checked_in') {
          if (reg.status === 'registered') {
             // Valid first check-in
             isOfficialCheckin = true;
          }
        } else {
          // Already checked in. Is this offline scan EARLIER than the current checked_in_at?
          const currentCheckinTime = new Date(reg.checked_in_at);
          if (scanTime < currentCheckinTime) {
            isOfficialCheckin = true;
          }
        }

        const serverTimestamp = new Date();

        if (isOfficialCheckin) {
          await client.query(
            "UPDATE registrations SET status = 'checked_in', checked_in_at = $1 WHERE id = $2",
            [scanTime, reg.id]
          );
        }

        // Always log the audit event
        await client.query(
          'INSERT INTO check_in_events (registration_id, action, source, station_id, client_timestamp, server_timestamp, performed_by) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [reg.id, 'check_in', 'offline_sync', station_id || 'unknown', scanTime, serverTimestamp, organizerId]
        );

        await client.query('COMMIT');
        
        if (isOfficialCheckin) {
           req.app.get('io').emit('check_in_update', {
             event_id: reg.event_id,
             registration_id: reg.id,
             status: 'checked_in'
           });
        }

        results.push({ qr_token, status: 'success' });
      } catch (innerError) {
        await client.query('ROLLBACK');
        console.error(innerError);
        results.push({ qr_token, status: 'error', error: 'Internal error' });
      }
    }

    res.json({ success: true, results });
  } finally {
    client.release();
  }
});

export default router;
