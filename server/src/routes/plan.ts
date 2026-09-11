import { Router } from 'express';
import { db, recordChangelog } from '../db/index.js';
import type { DailyPlan, Reminder } from '../db/schema.js';

export const planRouter = Router();

/**
 * GET /api/patients/:patient_id/daily-plan
 * Returns today's simple plan and medicine reminders for HomeView
 */
planRouter.get('/patients/:patient_id/daily-plan', (req, res) => {
  const { patient_id } = req.params;
  const todayStr = new Date().toISOString().split('T')[0];

  let plan = db.prepare(`
    SELECT * FROM daily_plans
    WHERE patient_id = ? AND plan_date = ? AND is_deleted = 0
  `).get(patient_id, todayStr) as DailyPlan | undefined;

  if (!plan) {
    // Auto-create today's plan if not yet created
    const now = Date.now();
    const planId = `plan-${todayStr}-${patient_id}`;
    db.prepare(`
      INSERT INTO daily_plans (id, patient_id, plan_date, notes, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, 'Gentle daily routine', ?, ?, 0)
    `).run(planId, patient_id, todayStr, now, now);

    plan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(planId) as DailyPlan;
  }

  const reminders = db.prepare(`
    SELECT * FROM reminders
    WHERE patient_id = ? AND is_deleted = 0
    ORDER BY scheduled_time ASC
  `).all(patient_id) as Reminder[];

  res.json({
    plan,
    reminders,
  });
});

/**
 * PUT /api/reminders/:id/status
 * Updates reminder status (e.g. marking BP tablet completed)
 */
planRouter.put('/reminders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'completed', 'pending', 'skipped'

  if (!['completed', 'pending', 'skipped'].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be 'completed', 'pending', or 'skipped'." });
    return;
  }

  const now = Date.now();
  const completedAt = status === 'completed' ? now : null;

  const result = db.prepare(`
    UPDATE reminders
    SET status = ?, completed_at = ?, updated_at = ?
    WHERE id = ? AND is_deleted = 0
  `).run(status, completedAt, now, id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Reminder not found.' });
    return;
  }

  const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder;

  // Record for offline delta sync
  recordChangelog('reminders', id, 'UPSERT', {
    id,
    patient_id: updated.patient_id,
    status,
    completed_at: completedAt,
    updated_at: now,
  });

  res.json({
    success: true,
    reminder: updated,
  });
});

/**
 * POST /api/reminders
 * Adds a new medicine or exercise reminder
 */
planRouter.post('/reminders', (req, res) => {
  const {
    patient_id = 'user-aita',
    type = 'medicine',
    title,
    dosage,
    scheduled_time = '09:30 AM',
    recurrence = 'daily',
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Reminder title is required.' });
    return;
  }

  const now = Date.now();
  const id = `rem-${now}-${Math.random().toString(36).substring(2, 6)}`;

  db.prepare(`
    INSERT INTO reminders (
      id, patient_id, type, title, dosage, scheduled_time, recurrence, status,
      created_at, updated_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 0)
  `).run(id, patient_id, type, title, dosage, scheduled_time, recurrence, now, now);

  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder;

  recordChangelog('reminders', id, 'UPSERT', reminder as unknown as Record<string, unknown>);

  res.status(201).json(reminder);
});
