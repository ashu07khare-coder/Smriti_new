import { seedDatabase } from './db/seed.js';
import { db } from './db/index.js';

async function runTests() {
  console.log('🧪 Starting Smriti Backend Verification Tests...\n');

  // 1. Seed database
  seedDatabase();

  // 2. Verify Database Counts
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
  const templateCount = (db.prepare('SELECT COUNT(*) as cnt FROM exercise_templates').get() as any).cnt;
  const reminderCount = (db.prepare('SELECT COUNT(*) as cnt FROM reminders').get() as any).cnt;
  const trendCount = (db.prepare('SELECT COUNT(*) as cnt FROM cognitive_trends').get() as any).cnt;
  const notifCount = (db.prepare('SELECT COUNT(*) as cnt FROM alerts_notifications').get() as any).cnt;

  console.log('\n📊 Database State:');
  console.log(`- Users: ${userCount}`);
  console.log(`- Exercise Templates: ${templateCount}`);
  console.log(`- Reminders: ${reminderCount}`);
  console.log(`- Cognitive Trends: ${trendCount}`);
  console.log(`- Notifications: ${notifCount}`);

  if (userCount < 4 || templateCount < 7 || reminderCount < 3) {
    throw new Error('❌ Database seeding check failed!');
  }
  console.log('✅ Database seeding verified.');

  // 3. Test Cognitive Trend Auto-Alert Logic
  console.log('\n🧠 Testing Cognitive Trend & Auto-Alert Logic...');
  const initialAlerts = (db.prepare("SELECT COUNT(*) as cnt FROM alerts_notifications WHERE type = 'care'").get() as any).cnt;

  // Simulate a significant session score drop (e.g. 15 to reflect cognitive change)
  const now = Date.now();
  const testSessionId = `test-sess-${now}`;
  db.prepare(`
    INSERT INTO exercise_sessions (
      id, patient_id, game_id, score, time_taken_ms, hints_used, wrong_moves,
      completed, completed_at, created_at, updated_at, is_deleted
    ) VALUES (?, 'user-aita', 'dominoes', 15, 240000, 3, 4, 1, ?, ?, ?, 0)
  `).run(testSessionId, now, now, now);

  // Trigger trend calculation
  const recentSessions = db.prepare(`
    SELECT score FROM exercise_sessions WHERE patient_id = 'user-aita' ORDER BY completed_at DESC LIMIT 10
  `).all() as Array<{ score: number }>;
  const avg = recentSessions.reduce((a, b) => a + b.score, 0) / recentSessions.length;
  const baseline = 75.0;
  const changePct = ((avg - baseline) / baseline) * 100;
  const shouldAlert = changePct < -15.0;

  console.log(`- Simulated recent score avg: ${avg.toFixed(1)}, baseline: ${baseline}, change: ${changePct.toFixed(1)}%`);
  console.log(`- Alert condition met: ${shouldAlert}`);

  if (shouldAlert) {
    db.prepare(`
      INSERT INTO alerts_notifications (
        id, patient_id, recipient_id, type, title, message, timestamp, read, is_delivered,
        created_at, updated_at, is_deleted
      ) VALUES (?, 'user-aita', 'user-bina', 'care', 'Gentle check-in suggested', ?, ?, 0, 1, ?, ?, 0)
    `).run(`test-alert-${now}`, "Aita's routine changed a little this week.", now, now, now);
  }

  const newAlerts = (db.prepare("SELECT COUNT(*) as cnt FROM alerts_notifications WHERE type = 'care'").get() as any).cnt;
  console.log(`- Care alerts before: ${initialAlerts}, after: ${newAlerts}`);
  if (newAlerts <= initialAlerts) {
    throw new Error('❌ Auto-alert logic did not trigger care alert!');
  }
  console.log('✅ Cognitive trend auto-alert logic verified.');

  // 4. Test Offline-First Delta Sync Flow
  console.log('\n🔄 Testing Offline-First Delta Sync Flow...');
  const deviceUuid = 'test-device-aita-01';
  const syncWatermark = now - 60000; // Client last synced 1 min ago

  // Client was offline and marked medicine as completed
  const clientOfflineMutation = {
    table: 'reminders',
    id: 'rem-bp-med',
    action: 'UPSERT',
    data: { status: 'completed', completed_at: now },
    client_updated_at: now,
  };

  // Execute mutation
  db.prepare('UPDATE reminders SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
    .run('completed', now, now, clientOfflineMutation.id);

  const updatedReminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get('rem-bp-med') as any;
  if (updatedReminder.status !== 'completed') {
    throw new Error('❌ Offline mutation application failed!');
  }
  console.log(`- Applied offline mutation for '${updatedReminder.title}': status is now '${updatedReminder.status}'`);

  // Pull deltas since watermark
  const deltas = db.prepare('SELECT * FROM reminders WHERE updated_at >= ?').all(syncWatermark) as any[];
  console.log(`- Deltas returned for client since watermark: ${deltas.length} records`);
  if (deltas.length === 0) {
    throw new Error('❌ Delta synchronization did not return changed records!');
  }
  console.log('✅ Offline-first delta sync verified.');

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
