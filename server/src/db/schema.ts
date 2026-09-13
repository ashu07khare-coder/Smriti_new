export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'patient' | 'caregiver' | 'asha_worker';
  preferred_language: string;
  avatar_local_ref?: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface CareCircleMember {
  id: string;
  patient_id: string;
  member_id: string;
  relationship_label: string;
  permissions: string; // JSON string e.g. ["view_trend", "can_call", "receive_alerts"]
  phone_number_override?: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface DailyPlan {
  id: string;
  patient_id: string;
  plan_date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface Reminder {
  id: string;
  patient_id: string;
  daily_plan_id?: string | null;
  type: 'medicine' | 'exercise' | 'routine';
  title: string;
  dosage?: string | null;
  scheduled_time: string;
  recurrence: string;
  status: 'pending' | 'completed' | 'skipped';
  completed_at?: number | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface ExerciseTemplate {
  id: string;
  game_id: string;
  difficulty: 'gentle' | 'moderate';
  time_estimate_mins: number;
  accent_color: string;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface ExerciseContentI18n {
  id: string;
  exercise_template_id: string;
  language: string;
  title: string;
  description: string;
  instructions: string; // JSON string array
  content_json: string; // JSON object with specific game data
  audio_asset_ref?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ExerciseSession {
  id: string;
  patient_id: string;
  game_id: string;
  exercise_template_id?: string | null;
  score: number;
  time_taken_ms: number;
  hints_used: number;
  wrong_moves: number;
  completed: number;
  raw_metrics_json?: string | null;
  completed_at: number;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface CognitiveTrend {
  id: string;
  patient_id: string;
  period_label: string; // 'JUL', 'AUG', 'THIS WEEK'
  score: number;
  baseline_score: number;
  change_pct: number;
  gentle_checkin_triggered: number;
  calculated_at: number;
  created_at: number;
  updated_at: number;
}

export interface AlertNotification {
  id: string;
  patient_id: string;
  recipient_id: string;
  type: 'medicine' | 'exercise' | 'family' | 'care' | 'general';
  title: string;
  message: string;
  timestamp: number;
  read: number; // 0 or 1
  is_delivered: number;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface CareAction {
  id: string;
  patient_id: string;
  actor_id: string;
  action_type: 'call_patient' | 'share_with_asha' | 'visit_logged';
  notes?: string | null;
  metadata_json?: string | null;
  performed_at: number;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface SyncDevice {
  device_uuid: string;
  user_id: string;
  last_synced_at: number;
  app_version?: string | null;
  last_ip?: string | null;
}

export interface SyncChangelog {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'UPSERT' | 'DELETE';
  payload_json: string;
  version_ts: number;
}

export const DDL = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'asha_worker')),
    preferred_language TEXT NOT NULL DEFAULT 'Assamese',
    avatar_local_ref TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS care_circle (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_label TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '["view_trend","can_call","receive_alerts"]',
    phone_number_override TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_circle_patient ON care_circle(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_circle_member ON care_circle(member_id);

CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    UNIQUE(patient_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_patient_date ON daily_plans(patient_id, plan_date);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_plan_id TEXT REFERENCES daily_plans(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('medicine', 'exercise', 'routine')),
    title TEXT NOT NULL,
    dosage TEXT,
    scheduled_time TEXT NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_updated ON reminders(updated_at);

CREATE TABLE IF NOT EXISTS exercise_templates (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL CHECK (game_id IN (
        'who-is-this', 'match-pairs', 'daily-routine', 'name-three', 
        'story-recall', 'picture-bingo', 'dominoes'
    )),
    difficulty TEXT NOT NULL DEFAULT 'gentle' CHECK (difficulty IN ('gentle', 'moderate')),
    time_estimate_mins INTEGER NOT NULL DEFAULT 5,
    accent_color TEXT NOT NULL DEFAULT '#299B78',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_game ON exercise_templates(game_id);

CREATE TABLE IF NOT EXISTS exercise_content_i18n (
    id TEXT PRIMARY KEY,
    exercise_template_id TEXT NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL,
    content_json TEXT NOT NULL,
    audio_asset_ref TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(exercise_template_id, language)
);

CREATE INDEX IF NOT EXISTS idx_exercise_i18n_lang ON exercise_content_i18n(language);

CREATE TABLE IF NOT EXISTS exercise_sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    exercise_template_id TEXT REFERENCES exercise_templates(id),
    score INTEGER NOT NULL,
    time_taken_ms INTEGER NOT NULL,
    hints_used INTEGER NOT NULL DEFAULT 0,
    wrong_moves INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 1,
    raw_metrics_json TEXT,
    completed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_patient ON exercise_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_date ON exercise_sessions(completed_at);

CREATE TABLE IF NOT EXISTS cognitive_trends (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_label TEXT NOT NULL,
    score REAL NOT NULL,
    baseline_score REAL NOT NULL,
    change_pct REAL NOT NULL,
    gentle_checkin_triggered INTEGER NOT NULL DEFAULT 0,
    calculated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_trends_patient ON cognitive_trends(patient_id);

CREATE TABLE IF NOT EXISTS alerts_notifications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('medicine', 'exercise', 'family', 'care', 'general')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    is_delivered INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_recipient ON alerts_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts_notifications(read);
CREATE INDEX IF NOT EXISTS idx_alerts_updated ON alerts_notifications(updated_at);

CREATE TABLE IF NOT EXISTS care_actions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('call_patient', 'share_with_asha', 'visit_logged')),
    notes TEXT,
    metadata_json TEXT,
    performed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_actions_patient ON care_actions(patient_id);

CREATE TABLE IF NOT EXISTS sync_devices (
    device_uuid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_synced_at INTEGER NOT NULL,
    app_version TEXT,
    last_ip TEXT
);

CREATE TABLE IF NOT EXISTS sync_changelog (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
    payload_json TEXT NOT NULL,
    version_ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_changelog_ts ON sync_changelog(version_ts);
`;
