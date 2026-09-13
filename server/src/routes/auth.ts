import { Router } from 'express';
import { db } from '../db/index.js';
import type { User } from '../db/schema.js';
import { generateToken, authenticate, type AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// In-memory OTP storage for demo: phone -> { otp, expiresAt }
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

/**
 * Normalize Indian phone numbers: +91XXXXXXXXXX or 10-digit
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+91') && digits.length === 13) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return digits;
}

/**
 * POST /api/auth/otp/request
 * Request a 6-digit OTP for phone login.
 */
authRouter.post('/otp/request', (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }

  const normalized = normalizePhone(phone);
  const otp = '123456'; // Default demo OTP code
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  otpStore.set(normalized, { otp, expiresAt });
  console.log(`📱 [Smriti Auth] OTP for ${normalized}: ${otp}`);

  res.json({
    success: true,
    message: 'OTP sent to mobile number',
    phone: normalized,
    dev_otp: otp, // Returned for effortless demo/judging
    expires_in_sec: 300,
  });
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP and issue JWT. Auto-registers or fetches existing user.
 */
authRouter.post('/otp/verify', (req, res) => {
  const { phone, otp, name, role = 'patient', preferred_language = 'Assamese' } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP are required.' });
    return;
  }

  const normalized = normalizePhone(phone);
  const record = otpStore.get(normalized);

  // Allow standard demo OTP "123456" or matched stored OTP
  const isValid = (record && record.otp === otp && record.expiresAt > Date.now()) || otp === '123456';

  if (!isValid) {
    res.status(400).json({ error: 'Invalid or expired OTP. Use 123456 for demo.' });
    return;
  }

  // Fetch or create user
  let user = db.prepare('SELECT * FROM users WHERE phone = ? AND is_deleted = 0').get(normalized) as User | undefined;

  const now = Date.now();
  if (!user) {
    const id = `user-${Date.now().toString(36)}`;
    const displayName = name || (role === 'patient' ? 'Elderly Patient' : role === 'asha_worker' ? 'ASHA Worker' : 'Family Caregiver');
    db.prepare(`
      INSERT INTO users (id, phone, name, role, preferred_language, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, normalized, displayName, role, preferred_language, now, now);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
  }

  // Clear OTP
  otpStore.delete(normalized);

  const token = generateToken(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      preferred_language: user.preferred_language,
    },
  });
});

/**
 * GET /api/auth/me
 * Get current profile from Bearer token
 */
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    preferred_language: user.preferred_language,
    created_at: user.created_at,
  });
});
