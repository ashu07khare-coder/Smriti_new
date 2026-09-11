import { Router } from 'express';
import { db, recordChangelog } from '../db/index.js';
import type { AlertNotification } from '../db/schema.js';

export const notificationsRouter = Router();

/**
 * GET /api/notifications
 * Returns notifications matching frontend SmritiNotification shape
 */
notificationsRouter.get('/notifications', (req, res) => {
  const recipientId = (req.query.recipient_id as string) || 'user-aita';

  const rows = db.prepare(`
    SELECT id, type, title, message, timestamp, read
    FROM alerts_notifications
    WHERE (recipient_id = ? OR recipient_id = 'user-aita') AND is_deleted = 0
    ORDER BY timestamp DESC
  `).all(recipientId) as Array<{
    id: string;
    type: 'medicine' | 'exercise' | 'family' | 'care' | 'general';
    title: string;
    message: string;
    timestamp: number;
    read: number;
  }>;

  // Convert SQLite 0/1 to boolean for frontend compatibility
  const formatted = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    timestamp: r.timestamp,
    read: r.read === 1,
  }));

  res.json(formatted);
});

/**
 * PATCH /api/notifications/:id/read
 * Toggles or sets read state
 */
notificationsRouter.patch('/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const { read } = req.body; // boolean or undefined to toggle

  const current = db.prepare('SELECT read FROM alerts_notifications WHERE id = ? AND is_deleted = 0').get(id) as { read: number } | undefined;
  if (!current) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }

  const newRead = read !== undefined ? (read ? 1 : 0) : (current.read ? 0 : 1);
  const now = Date.now();

  db.prepare('UPDATE alerts_notifications SET read = ?, updated_at = ? WHERE id = ?').run(newRead, now, id);

  recordChangelog('alerts_notifications', id, 'UPSERT', {
    id,
    read: newRead === 1,
    updated_at: now,
  });

  res.json({ success: true, id, read: newRead === 1 });
});

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications for recipient as read
 */
notificationsRouter.post('/notifications/mark-all-read', (req, res) => {
  const recipientId = (req.body.recipient_id as string) || 'user-aita';
  const now = Date.now();

  db.prepare(`
    UPDATE alerts_notifications
    SET read = 1, updated_at = ?
    WHERE (recipient_id = ? OR recipient_id = 'user-aita') AND is_deleted = 0
  `).run(now, recipientId);

  res.json({ success: true, message: 'All notifications marked as read.' });
});

/**
 * DELETE /api/notifications/:id
 * Removes a single notification
 */
notificationsRouter.delete('/notifications/:id', (req, res) => {
  const { id } = req.params;
  const now = Date.now();

  db.prepare('UPDATE alerts_notifications SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, id);

  recordChangelog('alerts_notifications', id, 'DELETE', { id, is_deleted: 1, updated_at: now });

  res.json({ success: true, id });
});

/**
 * DELETE /api/notifications
 * Clears all notifications
 */
notificationsRouter.delete('/notifications', (req, res) => {
  const recipientId = (req.body.recipient_id as string) || 'user-aita';
  const now = Date.now();

  db.prepare(`
    UPDATE alerts_notifications
    SET is_deleted = 1, updated_at = ?
    WHERE (recipient_id = ? OR recipient_id = 'user-aita')
  `).run(now, recipientId);

  res.json({ success: true, message: 'All notifications cleared.' });
});

/**
 * POST /api/notifications
 * Adds a new notification (useful for simulation & alerts)
 */
notificationsRouter.post('/notifications', (req, res) => {
  const {
    patient_id = 'user-aita',
    recipient_id = 'user-aita',
    type = 'general',
    title,
    message,
  } = req.body;

  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }

  const now = Date.now();
  const id = `notif-${now}-${Math.random().toString(36).substring(2, 6)}`;

  db.prepare(`
    INSERT INTO alerts_notifications (
      id, patient_id, recipient_id, type, title, message, timestamp, read, is_delivered,
      created_at, updated_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, 0)
  `).run(id, patient_id, recipient_id, type, title, message, now, now, now);

  const notif = {
    id,
    type,
    title,
    message,
    timestamp: now,
    read: false,
  };

  recordChangelog('alerts_notifications', id, 'UPSERT', notif);

  res.status(201).json(notif);
});
