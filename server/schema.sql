-- =====================================================================
-- SMRITI PLATFORM DATABASE SCHEMA (PostgreSQL / Supabase / SQLite compatible)
-- AI-based cognitive gaming & memory assistance for elderly dementia patients
-- North Eastern Region (NER), India
-- =====================================================================

-- 1. USERS
-- Patients, family caregivers, and ASHA community health workers.
-- Authentication is phone/OTP based.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'asha_worker')),
    preferred_language TEXT NOT NULL DEFAULT 'Assamese',
    avatar_local_ref TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. CARE CIRCLE (Many-to-Many with permissions)
-- Links a patient to multiple caregivers / ASHA workers.
-- permissions JSON array: e.g. ["view_trend", "can_call", "receive_alerts"]
CREATE TABLE IF NOT EXISTS care_circle (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_label TEXT NOT NULL, -- 'Daughter', 'Grandson', 'Son', 'ASHA Worker'
    permissions TEXT NOT NULL DEFAULT '["view_trend","can_call","receive_alerts"]',
    phone_number_override TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_circle_patient ON care_circle(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_circle_member ON care_circle(member_id);

-- 3. DAILY PLANS
-- Core daily schedule for elderly patient.
CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL, -- 'YYYY-MM-DD'
    notes TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    UNIQUE(patient_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_patient_date ON daily_plans(patient_id, plan_date);

-- 4. REMINDERS (Medicine, exercises, routine steps)
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_plan_id TEXT REFERENCES daily_plans(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('medicine', 'exercise', 'routine')),
    title TEXT NOT NULL, -- e.g. 'BP tablet'
    dosage TEXT,         -- e.g. '1 tablet with warm water'
    scheduled_time TEXT NOT NULL, -- '09:30' (24-hour or local format)
    recurrence TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'twice_daily', 'weekly'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_updated ON reminders(updated_at);

-- 5. COGNITIVE EXERCISE TEMPLATES
-- Bank of exercises (7 games: who-is-this, match-pairs, daily-routine, etc.)
CREATE TABLE IF NOT EXISTS exercise_templates (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL CHECK (game_id IN (
        'who-is-this', 'match-pairs', 'daily-routine', 'name-three', 
        'story-recall', 'picture-bingo', 'dominoes'
    )),
    difficulty TEXT NOT NULL DEFAULT 'gentle' CHECK (difficulty IN ('gentle', 'moderate')),
    time_estimate_mins INTEGER NOT NULL DEFAULT 5,
    accent_color TEXT NOT NULL DEFAULT '#299B78',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_game ON exercise_templates(game_id);

-- 6. EXERCISE CONTENT I18N
-- Clean normalized multilingual storage (Assamese, Bodo, Khasi, Mizo, Manipuri, Nagamese, Hindi, English).
CREATE TABLE IF NOT EXISTS exercise_content_i18n (
    id TEXT PRIMARY KEY,
    exercise_template_id TEXT NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL, -- JSON array of strings
    content_json TEXT NOT NULL, -- JSON containing questions, bingo call items, domino data, stories
    audio_asset_ref TEXT,       -- Reference to local or offline audio asset
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    UNIQUE(exercise_template_id, language)
);

CREATE INDEX IF NOT EXISTS idx_exercise_i18n_lang ON exercise_content_i18n(language);

-- 7. EXERCISE SESSIONS
-- Tracks patient session completion with raw performance metrics.
-- Never exposes a harsh "fail" to patients, but stores raw indicators to derive trends.
CREATE TABLE IF NOT EXISTS exercise_sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    exercise_template_id TEXT REFERENCES exercise_templates(id),
    score INTEGER NOT NULL,            -- Baseline metric e.g. 0-100
    time_taken_ms INTEGER NOT NULL,     -- Completion duration
    hints_used INTEGER NOT NULL DEFAULT 0,
    wrong_moves INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 1,
    raw_metrics_json TEXT,              -- JSON breakdown of interactions
    completed_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_patient ON exercise_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_date ON exercise_sessions(completed_at);

-- 8. COGNITIVE TRENDS
-- Weekly/monthly rollups and personal baselines used to trigger gentle check-ins.
CREATE TABLE IF NOT EXISTS cognitive_trends (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_label TEXT NOT NULL,         -- 'JUL', 'AUG', 'THIS WEEK'
    score REAL NOT NULL,               -- e.g. 78.5
    baseline_score REAL NOT NULL,      -- Rolling average baseline
    change_pct REAL NOT NULL,          -- Delta % from baseline
    gentle_checkin_triggered INTEGER NOT NULL DEFAULT 0,
    calculated_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_trends_patient ON cognitive_trends(patient_id);

-- 9. ALERTS & NOTIFICATIONS
-- Matches frontend SmritiNotification shape:
-- { id, type: 'medicine'|'exercise'|'family'|'care'|'general', title, message, timestamp, read }
CREATE TABLE IF NOT EXISTS alerts_notifications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('medicine', 'exercise', 'family', 'care', 'general')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    is_delivered INTEGER NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_recipient ON alerts_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts_notifications(read);
CREATE INDEX IF NOT EXISTS idx_alerts_updated ON alerts_notifications(updated_at);

-- 10. CARE ACTIONS
-- Audit log for dashboard: "Call Aita", "Share with ASHA", visit notes.
CREATE TABLE IF NOT EXISTS care_actions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('call_patient', 'share_with_asha', 'visit_logged')),
    notes TEXT,
    metadata_json TEXT,
    performed_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_actions_patient ON care_actions(patient_id);

-- 11. SYNC DEVICES & CHANGELOG (Offline-First Delta Sync)
-- Tracks each device's sync watermarks and transaction history for fast delta computation.
CREATE TABLE IF NOT EXISTS sync_devices (
    device_uuid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_synced_at BIGINT NOT NULL,
    app_version TEXT,
    last_ip TEXT
);

CREATE TABLE IF NOT EXISTS sync_changelog (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'reminders', 'exercise_sessions', 'alerts_notifications', 'daily_plans'
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
    payload_json TEXT NOT NULL,
    version_ts BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_changelog_ts ON sync_changelog(version_ts);
