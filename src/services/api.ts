const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface GameSessionPayload {
  id?: string;
  patient_id?: string;
  gameName: string;
  score?: number;
  timeTakenMs?: number;
  hintsUsed?: number;
  wrongMoves?: number;
  completed?: boolean;
  rawMetrics?: Record<string, any>;
}

export interface SyncMutation {
  table: 'reminders' | 'exercise_sessions' | 'alerts_notifications' | 'care_actions';
  id: string;
  action: 'UPSERT' | 'DELETE';
  data: Record<string, any>;
  client_updated_at: number;
}

export const smritiApi = {
  // --- Auth ---
  async requestOtp(phone: string) {
    const res = await fetch(`${API_BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  async verifyOtp(phone: string, otp: string) {
    const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    return res.json();
  },

  // --- Games & Cognitive Sessions ---
  async getPictureBingoCallSequence(setId: string = 'default', language: string = 'Assamese') {
    const res = await fetch(`${API_BASE_URL}/picture-sets/${setId}/call-sequence?language=${encodeURIComponent(language)}`);
    if (!res.ok) throw new Error('Failed to fetch picture sequence');
    return res.json();
  },

  async getDominoSets() {
    const res = await fetch(`${API_BASE_URL}/domino-sets`);
    if (!res.ok) throw new Error('Failed to fetch domino sets');
    return res.json();
  },

  async recordGameSession(payload: GameSessionPayload) {
    const res = await fetch(`${API_BASE_URL}/games/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to record game session');
    return res.json();
  },

  // --- Daily Plan & Medicine Reminders ---
  async getDailyPlan(patientId: string = 'user-aita') {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/daily-plan`);
    if (!res.ok) throw new Error('Failed to fetch daily plan');
    return res.json();
  },

  async updateReminderStatus(id: string, status: 'completed' | 'pending' | 'skipped') {
    const res = await fetch(`${API_BASE_URL}/reminders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update reminder status');
    return res.json();
  },

  // --- Care Circle & Cognitive Trends ---
  async getCareCircle(patientId: string = 'user-aita') {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/care-circle`);
    if (!res.ok) throw new Error('Failed to fetch care circle');
    return res.json();
  },

  async getCognitiveTrend(patientId: string = 'user-aita') {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/cognitive-trend`);
    if (!res.ok) throw new Error('Failed to fetch cognitive trend');
    return res.json();
  },

  async logCareAction(patientId: string, actorId: string, actionType: 'call_patient' | 'share_with_asha', notes?: string) {
    const res = await fetch(`${API_BASE_URL}/care-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, actor_id: actorId, action_type: actionType, notes }),
    });
    if (!res.ok) throw new Error('Failed to log care action');
    return res.json();
  },

  // --- Notifications ---
  async getNotifications(recipientId: string = 'user-aita') {
    const res = await fetch(`${API_BASE_URL}/notifications?recipient_id=${encodeURIComponent(recipientId)}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async toggleNotificationRead(id: string, read?: boolean) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read }),
    });
    if (!res.ok) throw new Error('Failed to toggle notification read');
    return res.json();
  },

  async markAllNotificationsRead(recipientId: string = 'user-aita') {
    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: recipientId }),
    });
    if (!res.ok) throw new Error('Failed to mark all notifications read');
    return res.json();
  },

  // --- Offline Delta Sync ---
  async sync(deviceUuid: string, userId: string, lastSyncedAt: number, mutations: SyncMutation[]) {
    const res = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_uuid: deviceUuid,
        user_id: userId,
        last_synced_at: lastSyncedAt,
        mutations,
      }),
    });
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
  },
};
