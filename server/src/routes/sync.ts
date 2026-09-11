import { Router } from 'express';
import { db, recordChangelog } from '../db/index.js';

export const syncRouter = Router();

interface ClientMutation {
  table: 'reminders' | 'exercise_sessions' | 'alerts_notifications' | 'care_actions';
  id: string;
  action: 'UPSERT' | 'DELETE';
  data: Record<string, any>;
  client_updated_at: number;
}

/**
 * POST /api/sync
 * Offline-first delta synchronization endpoint.
 * Ingests offline-queued mutations and returns deltas since last_synced_at.
 */
syncRouter.post('/sync', (req, res) => {
  const {
    device_uuid = 'default-device',
    user_id = 'user-aita',
    last_synced_at = 0,
    mutations = [],
  } = req.body as {
    device_uuid: string;
    user_id: string;
    last_synced_at: number;
    mutations: ClientMutation[];
  };

  const serverTime = Date.now();
  let appliedCount = 0;
  const conflicts: Array<{ id: string; table: string; reason: string }> = [];

  // Transactionally process mutations
  const runTransaction = db.transaction((muts: ClientMutation[]) => {
    for (const m of muts) {
      const { table, id, action, data, client_updated_at } = m;

      if (table === 'reminders') {
        const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;
        if (action === 'DELETE') {
          db.prepare('UPDATE reminders SET is_deleted = 1, updated_at = ? WHERE id = ?').run(serverTime, id);
          recordChangelog('reminders', id, 'DELETE', { id, is_deleted: 1, updated_at: serverTime });
          appliedCount++;
        } else if (existing) {
          // Last-Write-Wins conflict resolution
          if (existing.updated_at > client_updated_at) {
            conflicts.push({ id, table, reason: 'Server has newer version; server copy retained.' });
            continue;
          }
          db.prepare(`
            UPDATE reminders
            SET status = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
          `).run(data.status || existing.status, data.completed_at || existing.completed_at, serverTime, id);
          recordChangelog('reminders', id, 'UPSERT', { id, ...data, updated_at: serverTime });
          appliedCount++;
        } else {
          db.prepare(`
            INSERT INTO reminders (
              id, patient_id, daily_plan_id, type, title, dosage, scheduled_time,
              recurrence, status, completed_at, created_at, updated_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(
            id,
            data.patient_id || user_id,
            data.daily_plan_id || null,
            data.type || 'medicine',
            data.title || 'Reminder',
            data.dosage || null,
            data.scheduled_time || '09:30 AM',
            data.recurrence || 'daily',
            data.status || 'pending',
            data.completed_at || null,
            client_updated_at || serverTime,
            serverTime
          );
          recordChangelog('reminders', id, 'UPSERT', { id, ...data, updated_at: serverTime });
          appliedCount++;
        }
      } else if (table === 'exercise_sessions') {
        const existing = db.prepare('SELECT id FROM exercise_sessions WHERE id = ?').get(id);
        if (!existing && action === 'UPSERT') {
          db.prepare(`
            INSERT INTO exercise_sessions (
              id, patient_id, game_id, score, time_taken_ms, hints_used, wrong_moves,
              completed, raw_metrics_json, completed_at, created_at, updated_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(
            id,
            data.patient_id || user_id,
            data.game_id || 'unknown',
            data.score ?? 100,
            data.time_taken_ms ?? 60000,
            data.hints_used ?? 0,
            data.wrong_moves ?? 0,
            data.completed ?? 1,
            data.raw_metrics ? JSON.stringify(data.raw_metrics) : null,
            data.completed_at || client_updated_at || serverTime,
            client_updated_at || serverTime,
            serverTime
          );
          recordChangelog('exercise_sessions', id, 'UPSERT', { id, ...data, updated_at: serverTime });
          appliedCount++;
        }
      } else if (table === 'alerts_notifications') {
        if (action === 'UPSERT') {
          const existing = db.prepare('SELECT id FROM alerts_notifications WHERE id = ?').get(id);
          if (existing) {
            db.prepare('UPDATE alerts_notifications SET read = ?, updated_at = ? WHERE id = ?').run(
              data.read ? 1 : 0,
              serverTime,
              id
            );
          } else {
            db.prepare(`
              INSERT INTO alerts_notifications (
                id, patient_id, recipient_id, type, title, message, timestamp,
                read, is_delivered, created_at, updated_at, is_deleted
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
            `).run(
              id,
              data.patient_id || user_id,
              data.recipient_id || user_id,
              data.type || 'general',
              data.title,
              data.message,
              data.timestamp || serverTime,
              data.read ? 1 : 0,
              serverTime,
              serverTime
            );
          }
          recordChangelog('alerts_notifications', id, 'UPSERT', { id, ...data, updated_at: serverTime });
          appliedCount++;
        }
      } else if (table === 'care_actions') {
        const existing = db.prepare('SELECT id FROM care_actions WHERE id = ?').get(id);
        if (!existing && action === 'UPSERT') {
          db.prepare(`
            INSERT INTO care_actions (
              id, patient_id, actor_id, action_type, notes, metadata_json, performed_at,
              created_at, updated_at, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(
            id,
            data.patient_id || user_id,
            data.actor_id || user_id,
            data.action_type,
            data.notes || null,
            data.metadata ? JSON.stringify(data.metadata) : null,
            data.performed_at || serverTime,
            serverTime,
            serverTime
          );
          recordChangelog('care_actions', id, 'UPSERT', { id, ...data, updated_at: serverTime });
          appliedCount++;
        }
      }
    }

    // Update device watermark
    db.prepare(`
      INSERT INTO sync_devices (device_uuid, user_id, last_synced_at)
      VALUES (?, ?, ?)
      ON CONFLICT(device_uuid) DO UPDATE SET
        last_synced_at = excluded.last_synced_at,
        user_id = excluded.user_id
    `).run(device_uuid, user_id, serverTime);
  });

  runTransaction(mutations);

  // Fetch delta changes since last_synced_at
  const remindersDelta = db.prepare(`
    SELECT * FROM reminders
    WHERE patient_id = ? AND updated_at > ?
  `).all(user_id, last_synced_at);

  const alertsDelta = (db.prepare(`
    SELECT id, type, title, message, timestamp, read, is_deleted
    FROM alerts_notifications
    WHERE (recipient_id = ? OR recipient_id = 'user-aita') AND updated_at > ?
  `).all(user_id, last_synced_at) as any[]).map((a) => ({
    ...a,
    read: a.read === 1,
  }));

  const trendsDelta = db.prepare(`
    SELECT * FROM cognitive_trends
    WHERE patient_id = ? AND updated_at > ?
  `).all(user_id, last_synced_at);

  res.json({
    server_time: serverTime,
    applied_count: appliedCount,
    conflicts,
    deltas: {
      reminders: remindersDelta,
      alerts_notifications: alertsDelta,
      cognitive_trends: trendsDelta,
    },
  });
});

/**
 * GET /api/sync/status
 * Returns sync watermark and device status
 */
syncRouter.get('/sync/status', (req, res) => {
  const deviceUuid = (req.query.device_uuid as string) || 'default-device';
  const device = db.prepare('SELECT * FROM sync_devices WHERE device_uuid = ?').get(deviceUuid);

  res.json({
    device: device || null,
    server_time: Date.now(),
  });
});
