import { Router } from 'express';
import { db, recordChangelog } from '../db/index.js';
import type { ExerciseSession, ExerciseTemplate, ExerciseContentI18n, CognitiveTrend } from '../db/schema.js';

export const gamesRouter = Router();

/**
 * GET /api/picture-sets/:id/call-sequence
 * Referenced in PictureBingo.tsx:20
 * Returns randomized picture list and calling sequence with localized labels
 */
gamesRouter.get('/picture-sets/:id/call-sequence', (req, res) => {
  const language = (req.query.language as string) || 'Assamese';

  // Fetch content from i18n table for picture-bingo
  const row = db.prepare(`
    SELECT content_json FROM exercise_content_i18n
    WHERE exercise_template_id = 'tpl-picture-bingo' AND language = ?
  `).get(language) as { content_json: string } | undefined;

  let items = [
    { id: 'tea', label: 'Tea cup', color: '#E57B4F', iconName: 'Coffee' },
    { id: 'umbrella', label: 'Umbrella', color: '#287d9e', iconName: 'Umbrella' },
    { id: 'bowl', label: 'Rice bowl', color: '#F2B454', iconName: 'Soup' },
    { id: 'mountain', label: 'Mountain', color: '#299B78', iconName: 'Mountain' },
    { id: 'leaf', label: 'Betel leaf', color: '#299B78', iconName: 'Leaf' },
    { id: 'bird', label: 'Rooster', color: '#bc6b43', iconName: 'Bird' },
  ];

  if (row) {
    try {
      items = JSON.parse(row.content_json);
    } catch (e) {
      console.error('Failed to parse i18n picture set json:', e);
    }
  }

  // Generate randomized call order
  const callSequence = [...items].sort(() => Math.random() - 0.5);

  res.json({
    setId: req.params.id,
    language,
    items,
    callSequence,
  });
});

/**
 * GET /api/domino-sets
 * Referenced in Dominoes.tsx:18
 * Returns standard domino tile configurations
 */
gamesRouter.get('/domino-sets', (_req, res) => {
  const row = db.prepare(`
    SELECT content_json FROM exercise_content_i18n
    WHERE exercise_template_id = 'tpl-dominoes' AND language = 'English'
  `).get() as { content_json: string } | undefined;

  let tiles = [
    { id: 'd1', left: 3, right: 5 },
    { id: 'd2', left: 0, right: 2 },
    { id: 'd3', left: 4, right: 6 },
    { id: 'd4', left: 1, right: 3 },
    { id: 'd5', left: 2, right: 4 },
    { id: 'd6', left: 5, right: 1 },
  ];

  if (row) {
    try {
      tiles = JSON.parse(row.content_json);
    } catch (e) {
      console.error('Failed to parse domino set json:', e);
    }
  }

  res.json({
    setId: 'default-gentle-set',
    tiles,
  });
});

/**
 * POST /api/games/session
 * Referenced in PictureBingo.tsx:84 & Dominoes.tsx:124
 * Records cognitive exercise session, computes baseline trend, and auto-triggers gentle check-in alert if needed
 */
gamesRouter.post('/games/session', (req, res) => {
  const {
    id,
    patient_id = 'user-aita',
    gameName,
    score = 100,
    timeTakenMs = 60000,
    hintsUsed = 0,
    wrongMoves = 0,
    completed = 1,
    rawMetrics = null,
  } = req.body;

  const now = Date.now();
  const sessionId = id || `sess-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const gameId = (gameName || 'unknown-game').toLowerCase().replace(/\s+/g, '-');

  // Insert session
  db.prepare(`
    INSERT INTO exercise_sessions (
      id, patient_id, game_id, score, time_taken_ms, hints_used, wrong_moves, completed,
      raw_metrics_json, completed_at, created_at, updated_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    sessionId,
    patient_id,
    gameId,
    score,
    timeTakenMs,
    hintsUsed,
    wrongMoves,
    completed ? 1 : 0,
    rawMetrics ? JSON.stringify(rawMetrics) : null,
    now,
    now,
    now
  );

  // Record for offline delta sync
  recordChangelog('exercise_sessions', sessionId, 'UPSERT', {
    id: sessionId,
    patient_id,
    game_id: gameId,
    score,
    time_taken_ms: timeTakenMs,
    hints_used: hintsUsed,
    wrong_moves: wrongMoves,
    completed,
    completed_at: now,
  });

  // Calculate rolling cognitive trend
  const recentSessions = db.prepare(`
    SELECT score FROM exercise_sessions
    WHERE patient_id = ? AND is_deleted = 0
    ORDER BY completed_at DESC LIMIT 10
  `).all(patient_id) as Array<{ score: number }>;

  const avgScore = recentSessions.length > 0
    ? recentSessions.reduce((acc, s) => acc + s.score, 0) / recentSessions.length
    : score;

  const baselineRow = db.prepare(`
    SELECT baseline_score FROM cognitive_trends
    WHERE patient_id = ?
    ORDER BY calculated_at DESC LIMIT 1
  `).get(patient_id) as { baseline_score: number } | undefined;

  const baselineScore = baselineRow ? baselineRow.baseline_score : 75.0;
  const changePct = ((avgScore - baselineScore) / baselineScore) * 100;
  const shouldAlert = changePct < -15.0; // Weekly variance check

  const trendId = `trend-${now}`;
  db.prepare(`
    INSERT INTO cognitive_trends (
      id, patient_id, period_label, score, baseline_score, change_pct, gentle_checkin_triggered,
      calculated_at, created_at, updated_at
    ) VALUES (?, ?, 'THIS WEEK', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trendId,
    patient_id,
    Math.round(avgScore * 10) / 10,
    Math.round(baselineScore * 10) / 10,
    Math.round(changePct * 10) / 10,
    shouldAlert ? 1 : 0,
    now,
    now,
    now
  );

  // If gentle check-in alert triggered, create notification for caregiver & ASHA
  if (shouldAlert) {
    const alertId = `notif-auto-${now}`;
    const caregivers = db.prepare(`
      SELECT member_id FROM care_circle
      WHERE patient_id = ? AND is_deleted = 0
    `).all(patient_id) as Array<{ member_id: string }>;

    for (const c of caregivers) {
      db.prepare(`
        INSERT INTO alerts_notifications (
          id, patient_id, recipient_id, type, title, message, timestamp, read, is_delivered,
          created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, 'care', 'Gentle check-in suggested', ?, ?, 0, 1, ?, ?, 0)
      `).run(
        `${alertId}-${c.member_id}`,
        patient_id,
        c.member_id,
        "Aita's routine changed a little this week. Consider a warm phone call.",
        now,
        now,
        now
      );

      recordChangelog('alerts_notifications', `${alertId}-${c.member_id}`, 'UPSERT', {
        id: `${alertId}-${c.member_id}`,
        recipient_id: c.member_id,
        type: 'care',
        title: 'Gentle check-in suggested',
        timestamp: now,
      });
    }
  }

  res.json({
    success: true,
    sessionId,
    trend: {
      score: Math.round(avgScore * 10) / 10,
      baselineScore,
      changePct: Math.round(changePct * 10) / 10,
      gentleCheckinTriggered: shouldAlert,
    },
  });
});

/**
 * GET /api/games/templates
 * Fetches all games and localized content
 */
gamesRouter.get('/games/templates', (req, res) => {
  const language = (req.query.language as string) || 'Assamese';

  const templates = db.prepare(`
    SELECT t.*, c.title, c.description, c.instructions, c.content_json
    FROM exercise_templates t
    LEFT JOIN exercise_content_i18n c
      ON t.id = c.exercise_template_id AND c.language = ?
    WHERE t.is_deleted = 0
  `).all(language);

  res.json(templates);
});

/**
 * GET /api/games/sessions/:patient_id
 * Returns recent sessions for a patient
 */
gamesRouter.get('/games/sessions/:patient_id', (req, res) => {
  const sessions = db.prepare(`
    SELECT * FROM exercise_sessions
    WHERE patient_id = ? AND is_deleted = 0
    ORDER BY completed_at DESC LIMIT 20
  `).all(req.params.patient_id);

  res.json(sessions);
});
