import { Router } from 'express';
import { db, recordChangelog } from '../db/index.js';
import type { CareAction, CognitiveTrend } from '../db/schema.js';

export const careCircleRouter = Router();

/**
 * GET /api/patients/:patient_id/care-circle
 * Returns family circle and ASHA workers associated with the patient
 */
careCircleRouter.get('/patients/:patient_id/care-circle', (req, res) => {
  const { patient_id } = req.params;

  const members = db.prepare(`
    SELECT c.id, c.patient_id, c.member_id, c.relationship_label, c.permissions,
           c.phone_number_override, u.name, u.phone, u.role, u.preferred_language
    FROM care_circle c
    JOIN users u ON c.member_id = u.id
    WHERE c.patient_id = ? AND c.is_deleted = 0
  `).all(patient_id);

  const formatted = members.map((m: any) => ({
    ...m,
    permissions: JSON.parse(m.permissions || '[]'),
  }));

  res.json(formatted);
});

/**
 * GET /api/patients/:patient_id/cognitive-trend
 * Returns historical data points for the trend graph and active check-in alerts
 */
careCircleRouter.get('/patients/:patient_id/cognitive-trend', (req, res) => {
  const { patient_id } = req.params;

  const trends = db.prepare(`
    SELECT * FROM cognitive_trends
    WHERE patient_id = ?
    ORDER BY calculated_at ASC
  `).all(patient_id) as CognitiveTrend[];

  const latest = trends[trends.length - 1];

  res.json({
    patient_id,
    trends,
    currentScore: latest ? latest.score : 65.0,
    baselineScore: latest ? latest.baseline_score : 75.0,
    gentleCheckinSuggested: latest ? latest.gentle_checkin_triggered === 1 : false,
    updatedAt: latest ? latest.calculated_at : Date.now(),
  });
});

/**
 * POST /api/care-actions
 * Logs "Call Aita" or "Share with ASHA"
 */
careCircleRouter.post('/care-actions', (req, res) => {
  const {
    patient_id = 'user-aita',
    actor_id = 'user-bina',
    action_type, // 'call_patient', 'share_with_asha', 'visit_logged'
    notes,
    metadata = {},
  } = req.body;

  if (!['call_patient', 'share_with_asha', 'visit_logged'].includes(action_type)) {
    res.status(400).json({ error: "Invalid action_type. Must be 'call_patient', 'share_with_asha', or 'visit_logged'." });
    return;
  }

  const now = Date.now();
  const id = `act-${now}-${Math.random().toString(36).substring(2, 6)}`;

  db.prepare(`
    INSERT INTO care_actions (
      id, patient_id, actor_id, action_type, notes, metadata_json, performed_at,
      created_at, updated_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    id,
    patient_id,
    actor_id,
    action_type,
    notes || null,
    JSON.stringify(metadata),
    now,
    now,
    now
  );

  const action = db.prepare('SELECT * FROM care_actions WHERE id = ?').get(id) as CareAction;

  // Record for offline delta sync
  recordChangelog('care_actions', id, 'UPSERT', {
    id,
    patient_id,
    action_type,
    notes,
    performed_at: now,
  });

  res.status(201).json({
    success: true,
    action,
    message: action_type === 'call_patient'
      ? 'Call logged successfully.'
      : 'Care report shared with ASHA worker successfully.',
  });
});

/**
 * GET /api/care-actions/:patient_id
 * Returns recent actions for the patient
 */
careCircleRouter.get('/care-actions/:patient_id', (req, res) => {
  const { patient_id } = req.params;

  const actions = db.prepare(`
    SELECT a.*, u.name as actor_name, u.role as actor_role
    FROM care_actions a
    JOIN users u ON a.actor_id = u.id
    WHERE a.patient_id = ? AND a.is_deleted = 0
    ORDER BY a.performed_at DESC LIMIT 20
  `).all(patient_id);

  res.json(actions);
});
