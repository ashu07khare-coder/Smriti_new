import { db } from './index.js';

export function seedDatabase() {
  console.log('🌱 Seeding Smriti database with NER demo data...');

  const now = Date.now();

  // Clean existing data
  const tables = [
    'sync_changelog',
    'sync_devices',
    'care_actions',
    'alerts_notifications',
    'cognitive_trends',
    'exercise_sessions',
    'exercise_content_i18n',
    'exercise_templates',
    'reminders',
    'daily_plans',
    'care_circle',
    'users',
  ];

  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, phone, name, role, preferred_language, avatar_local_ref, created_at, updated_at, is_deleted)
    VALUES (@id, @phone, @name, @role, @preferred_language, @avatar_local_ref, @created_at, @updated_at, 0)
  `);

  const users = [
    {
      id: 'user-aita',
      phone: '+919876543210',
      name: 'Aita (Grandmother)',
      role: 'patient',
      preferred_language: 'Assamese',
      avatar_local_ref: 'avatar-aita-1',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
    {
      id: 'user-bina',
      phone: '+919876543211',
      name: 'Bina Barua (Daughter)',
      role: 'caregiver',
      preferred_language: 'Assamese',
      avatar_local_ref: 'avatar-bina-1',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
    {
      id: 'user-rohan',
      phone: '+919876543212',
      name: 'Rohan Barua (Grandson)',
      role: 'caregiver',
      preferred_language: 'Assamese',
      avatar_local_ref: 'avatar-rohan-1',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
    {
      id: 'user-lakhi',
      phone: '+919876543213',
      name: 'Lakhi Gogoi (ASHA Worker)',
      role: 'asha_worker',
      preferred_language: 'Assamese',
      avatar_local_ref: 'avatar-lakhi-1',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
  ];

  for (const u of users) insertUser.run(u);

  // 2. Care Circle
  const insertCareCircle = db.prepare(`
    INSERT INTO care_circle (id, patient_id, member_id, relationship_label, permissions, phone_number_override, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @member_id, @relationship_label, @permissions, @phone_number_override, @created_at, @updated_at, 0)
  `);

  const careCircles = [
    {
      id: 'circle-1',
      patient_id: 'user-aita',
      member_id: 'user-bina',
      relationship_label: 'Daughter',
      permissions: JSON.stringify(['view_trend', 'can_call', 'receive_alerts']),
      phone_number_override: '+919876543211',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
    {
      id: 'circle-2',
      patient_id: 'user-aita',
      member_id: 'user-rohan',
      relationship_label: 'Grandson',
      permissions: JSON.stringify(['view_trend', 'can_call']),
      phone_number_override: '+919876543212',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
    {
      id: 'circle-3',
      patient_id: 'user-aita',
      member_id: 'user-lakhi',
      relationship_label: 'ASHA Worker',
      permissions: JSON.stringify(['view_trend', 'can_call', 'receive_alerts', 'log_visit']),
      phone_number_override: '+919876543213',
      created_at: now - 30 * 86400000,
      updated_at: now,
    },
  ];

  for (const c of careCircles) insertCareCircle.run(c);

  // 3. Daily Plans & Reminders
  const todayStr = new Date().toISOString().split('T')[0];
  const insertDailyPlan = db.prepare(`
    INSERT INTO daily_plans (id, patient_id, plan_date, notes, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @plan_date, @notes, @created_at, @updated_at, 0)
  `);

  insertDailyPlan.run({
    id: 'plan-today-aita',
    patient_id: 'user-aita',
    plan_date: todayStr,
    notes: 'Gentle routine with morning BP tablet and family memory game.',
    created_at: now,
    updated_at: now,
  });

  const insertReminder = db.prepare(`
    INSERT INTO reminders (id, patient_id, daily_plan_id, type, title, dosage, scheduled_time, recurrence, status, completed_at, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @daily_plan_id, @type, @title, @dosage, @scheduled_time, @recurrence, @status, @completed_at, @created_at, @updated_at, 0)
  `);

  const reminders = [
    {
      id: 'rem-bp-med',
      patient_id: 'user-aita',
      daily_plan_id: 'plan-today-aita',
      type: 'medicine',
      title: 'BP tablet',
      dosage: '1 tablet with warm water',
      scheduled_time: '9:30 AM',
      recurrence: 'daily',
      status: 'pending',
      completed_at: null,
      created_at: now - 3600000,
      updated_at: now,
    },
    {
      id: 'rem-brain-ex',
      patient_id: 'user-aita',
      daily_plan_id: 'plan-today-aita',
      type: 'exercise',
      title: 'Brain exercise',
      dosage: '5 minutes · memory and focus',
      scheduled_time: '11:00 AM',
      recurrence: 'daily',
      status: 'pending',
      completed_at: null,
      created_at: now - 3600000,
      updated_at: now,
    },
    {
      id: 'rem-tea-time',
      patient_id: 'user-aita',
      daily_plan_id: 'plan-today-aita',
      type: 'routine',
      title: 'Evening tea & conversation',
      dosage: 'Call Bina or sit on the veranda',
      scheduled_time: '4:30 PM',
      recurrence: 'daily',
      status: 'pending',
      completed_at: null,
      created_at: now - 3600000,
      updated_at: now,
    },
  ];

  for (const r of reminders) insertReminder.run(r);

  // 4. Cognitive Exercises Templates & Multi-language content
  const insertTemplate = db.prepare(`
    INSERT INTO exercise_templates (id, game_id, difficulty, time_estimate_mins, accent_color, created_at, updated_at, is_deleted)
    VALUES (@id, @game_id, @difficulty, @time_estimate_mins, @accent_color, @created_at, @updated_at, 0)
  `);

  const insertContent = db.prepare(`
    INSERT INTO exercise_content_i18n (id, exercise_template_id, language, title, description, instructions, content_json, audio_asset_ref, created_at, updated_at)
    VALUES (@id, @exercise_template_id, @language, @title, @description, @instructions, @content_json, @audio_asset_ref, @created_at, @updated_at)
  `);

  const templates = [
    { id: 'tpl-who-is-this', game_id: 'who-is-this', difficulty: 'gentle', time_estimate_mins: 5, accent_color: '#299B78' },
    { id: 'tpl-match-pairs', game_id: 'match-pairs', difficulty: 'gentle', time_estimate_mins: 4, accent_color: '#F2B454' },
    { id: 'tpl-daily-routine', game_id: 'daily-routine', difficulty: 'gentle', time_estimate_mins: 3, accent_color: '#E57B4F' },
    { id: 'tpl-name-three', game_id: 'name-three', difficulty: 'gentle', time_estimate_mins: 4, accent_color: '#299B78' },
    { id: 'tpl-story-recall', game_id: 'story-recall', difficulty: 'gentle', time_estimate_mins: 5, accent_color: '#F2B454' },
    { id: 'tpl-picture-bingo', game_id: 'picture-bingo', difficulty: 'gentle', time_estimate_mins: 5, accent_color: '#F2B454' },
    { id: 'tpl-dominoes', game_id: 'dominoes', difficulty: 'gentle', time_estimate_mins: 5, accent_color: '#287d9e' },
  ];

  for (const t of templates) {
    insertTemplate.run({
      ...t,
      created_at: now,
      updated_at: now,
    });
  }

  // Multilingual content for games
  // Picture Bingo
  insertContent.run({
    id: 'cnt-bingo-en',
    exercise_template_id: 'tpl-picture-bingo',
    language: 'English',
    title: 'Picture Bingo',
    description: 'Listen and find the picture',
    instructions: JSON.stringify([
      'Listen to the picture being called.',
      'Find it on your card and tap it.',
      'Keep going until your card is full.',
      'Tap the speaker any time to hear it again.',
    ]),
    content_json: JSON.stringify([
      { id: 'tea', label: 'Tea cup', color: '#E57B4F', iconName: 'Coffee' },
      { id: 'umbrella', label: 'Umbrella', color: '#287d9e', iconName: 'Umbrella' },
      { id: 'bowl', label: 'Rice bowl', color: '#F2B454', iconName: 'Soup' },
      { id: 'mountain', label: 'Mountain', color: '#299B78', iconName: 'Mountain' },
      { id: 'leaf', label: 'Betel leaf', color: '#299B78', iconName: 'Leaf' },
      { id: 'bird', label: 'Rooster', color: '#bc6b43', iconName: 'Bird' },
    ]),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  insertContent.run({
    id: 'cnt-bingo-as',
    exercise_template_id: 'tpl-picture-bingo',
    language: 'Assamese',
    title: 'ছবি বিংগো',
    description: 'শব্দ শুনক আৰু ছবি বাছনি কৰক',
    instructions: JSON.stringify([
      'কৈ থকা ছবিখনৰ নাম শুনক।',
      'আপোনাৰ কাৰ্ডত সেই ছবিখন বিচাৰি চুই দিয়ক।',
      'কাৰ্ডখন সম্পূৰ্ণ নোহোৱালৈকে খেলি থাকক।',
      'আকৌ শুনিবলৈ মাইকত চুই দিয়ক।',
    ]),
    content_json: JSON.stringify([
      { id: 'tea', label: 'চাহৰ কাপ', color: '#E57B4F', iconName: 'Coffee' },
      { id: 'umbrella', label: 'ছাতি', color: '#287d9e', iconName: 'Umbrella' },
      { id: 'bowl', label: 'ভাতৰ বাটি', color: '#F2B454', iconName: 'Soup' },
      { id: 'mountain', label: 'পাহাৰ', color: '#299B78', iconName: 'Mountain' },
      { id: 'leaf', label: 'পান পাত', color: '#299B78', iconName: 'Leaf' },
      { id: 'bird', label: 'কুকুৰা', color: '#bc6b43', iconName: 'Bird' },
    ]),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  // Dominoes
  insertContent.run({
    id: 'cnt-dominoes-en',
    exercise_template_id: 'tpl-dominoes',
    language: 'English',
    title: 'Dominoes',
    description: 'Match the matching tiles',
    instructions: JSON.stringify([
      'Pick a tile from your hand.',
      'Tap the end of the board where the dots match.',
      'Keep placing until your hand is empty.',
      'Take your time, there is no rush.',
    ]),
    content_json: JSON.stringify([
      { id: 'd1', left: 3, right: 5 },
      { id: 'd2', left: 0, right: 2 },
      { id: 'd3', left: 4, right: 6 },
      { id: 'd4', left: 1, right: 3 },
      { id: 'd5', left: 2, right: 4 },
      { id: 'd6', left: 5, right: 1 },
    ]),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  insertContent.run({
    id: 'cnt-dominoes-as',
    exercise_template_id: 'tpl-dominoes',
    language: 'Assamese',
    title: 'ডমিনো',
    description: 'মিলা টাইলবোৰ সংযোগ কৰক',
    instructions: JSON.stringify([
      'হাতৰ পৰা এটা টাইল বাছক।',
      'বৰ্ডৰ যিটো অংশত বিন্দু মিলি যায়, তাতে চুই দিয়ক।',
      'সকলো টাইল নোহোৱালৈকে আগবাঢ়ক।',
      'লাহে লাহে খেলক, কোনো খৰখেদা নাই।',
    ]),
    content_json: JSON.stringify([
      { id: 'd1', left: 3, right: 5 },
      { id: 'd2', left: 0, right: 2 },
      { id: 'd3', left: 4, right: 6 },
      { id: 'd4', left: 1, right: 3 },
      { id: 'd5', left: 2, right: 4 },
      { id: 'd6', left: 5, right: 1 },
    ]),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  // Story Recall
  insertContent.run({
    id: 'cnt-story-en',
    exercise_template_id: 'tpl-story-recall',
    language: 'English',
    title: 'Story Time Recall',
    description: 'Listen and remember',
    instructions: JSON.stringify([
      'Listen to a short story recorded by your family.',
      'You can play it as many times as you like.',
      'After the story, a kind question will appear.',
      'Speak your answer or tap a picture. There is no wrong answer.',
    ]),
    content_json: JSON.stringify({
      storyText: 'Aita went to the morning market. She bought fresh fish and vegetables for lunch. On the way home, she met her old friend Lakhi at the tea stall. They sat together, had a cup of tea, and talked about old times.',
      questions: [
        {
          question: 'What did Aita buy at the market?',
          options: [
            { label: 'Fish and vegetables', color: '#299B78', correct: true },
            { label: 'New clothes', color: '#F2B454', correct: false },
            { label: 'A book', color: '#E57B4F', correct: false },
          ],
        },
        {
          question: 'Who did Aita meet on the way home?',
          options: [
            { label: 'Her friend Lakhi', color: '#299B78', correct: true },
            { label: 'Her grandson', color: '#F2B454', correct: false },
            { label: 'The doctor', color: '#E57B4F', correct: false },
          ],
        },
      ],
    }),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  insertContent.run({
    id: 'cnt-story-as',
    exercise_template_id: 'tpl-story-recall',
    language: 'Assamese',
    title: 'সাধু কথা আৰু মনত পেলোৱা',
    description: 'শুনক আৰু মনত ৰাখক',
    instructions: JSON.stringify([
      'পৰিয়ালে কোৱা চুটি সাধুটো শুনক।',
      'আপুনি যিমানবাৰ ইচ্ছা সিমানবাৰ শুনিব পাৰে।',
      'তাৰ পিছত এটা সহজ প্ৰশ্ন সুধিব।',
      'উত্তৰটো মাত মাতি দিয়ক বা ছবিত চুই দিয়ক।',
    ]),
    content_json: JSON.stringify({
      storyText: 'আইতা পুৱাৰ বজাৰলৈ গৈছিল। দুপৰীয়াৰ সাজৰ বাবে তেওঁ সতেজ মাছ আৰু শাক-পাচলি কিনিলে। ঘৰলৈ উভতি অহাৰ পথত চাহৰ দোকানত পুৰণি বান্ধৱী লক্ষীক লগ পালে। দুয়ো একেলগে বহি চাহ খালে আৰু পুৰণি কথা পাতিলে।',
      questions: [
        {
          question: 'আইতাই বজাৰৰ পৰা কি কিনি আনিছিল?',
          options: [
            { label: 'মাছ আৰু শাক-পাচলি', color: '#299B78', correct: true },
            { label: 'নতুন কাপোৰ', color: '#F2B454', correct: false },
            { label: 'এখন কিতাপ', color: '#E57B4F', correct: false },
          ],
        },
        {
          question: 'ঘৰলৈ আহোঁতে আইতাই কাক লগ পালে?',
          options: [
            { label: 'বান্ধৱী লক্ষী', color: '#299B78', correct: true },
            { label: 'নাতি', color: '#F2B454', correct: false },
            { label: 'ডাক্তৰ', color: '#E57B4F', correct: false },
          ],
        },
      ],
    }),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  // Name Three Things
  insertContent.run({
    id: 'cnt-name3-en',
    exercise_template_id: 'tpl-name-three',
    language: 'English',
    title: 'Name Three Things',
    description: 'Say three from a category',
    instructions: JSON.stringify([
      'The app asks you to name three things from a category.',
      'Speak your answer, type it, or tap a word from the list.',
      'Each answer is welcomed warmly. There are no wrong answers.',
      'If you pause, a gentle picture cue will appear to help.',
    ]),
    content_json: JSON.stringify([
      {
        prompt: 'Can you name three fruits?',
        cueLabel: 'Think of something sweet that grows on a tree',
        suggestions: ['Mango', 'Banana', 'Guava', 'Pineapple', 'Papaya', 'Litchi'],
      },
      {
        prompt: 'Name three family members',
        cueLabel: 'Think of people who live with you or near you',
        suggestions: ['Mother', 'Father', 'Sister', 'Brother', 'Son', 'Daughter'],
      },
      {
        prompt: 'Name three festivals you celebrate',
        cueLabel: 'Think of a time when there was music and good food',
        suggestions: ['Bihu', 'Durga Puja', 'Diwali', 'Christmas', 'Wangala', 'Chapchar Kut'],
      },
    ]),
    audio_asset_ref: null,
    created_at: now,
    updated_at: now,
  });

  // 5. Exercise Sessions (Aita's recent history)
  const insertSession = db.prepare(`
    INSERT INTO exercise_sessions (id, patient_id, game_id, exercise_template_id, score, time_taken_ms, hints_used, wrong_moves, completed, raw_metrics_json, completed_at, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @game_id, @exercise_template_id, @score, @time_taken_ms, @hints_used, @wrong_moves, @completed, @raw_metrics_json, @completed_at, @created_at, @updated_at, 0)
  `);

  const sessions = [
    {
      id: 'sess-01',
      patient_id: 'user-aita',
      game_id: 'dominoes',
      exercise_template_id: 'tpl-dominoes',
      score: 85,
      time_taken_ms: 154000,
      hints_used: 1,
      wrong_moves: 1,
      completed: 1,
      raw_metrics_json: JSON.stringify({ tileSequence: ['d1', 'd4', 'd2', 'd5', 'd3', 'd6'] }),
      completed_at: now - 3 * 86400000,
      created_at: now - 3 * 86400000,
      updated_at: now - 3 * 86400000,
    },
    {
      id: 'sess-02',
      patient_id: 'user-aita',
      game_id: 'picture-bingo',
      exercise_template_id: 'tpl-picture-bingo',
      score: 90,
      time_taken_ms: 120000,
      hints_used: 0,
      wrong_moves: 1,
      completed: 1,
      raw_metrics_json: JSON.stringify({ matchTimesMs: [12000, 15000, 18000, 14000, 21000, 20000] }),
      completed_at: now - 2 * 86400000,
      created_at: now - 2 * 86400000,
      updated_at: now - 2 * 86400000,
    },
    {
      id: 'sess-03',
      patient_id: 'user-aita',
      game_id: 'story-recall',
      exercise_template_id: 'tpl-story-recall',
      score: 60,
      time_taken_ms: 220000,
      hints_used: 2,
      wrong_moves: 2,
      completed: 1,
      raw_metrics_json: JSON.stringify({ questionsAnswered: 2, firstTryCorrect: 1 }),
      completed_at: now - 1800000,
      created_at: now - 1800000,
      updated_at: now - 1800000,
    },
  ];

  for (const s of sessions) insertSession.run(s);

  // 6. Cognitive Trends (Matching CareCircleView in App.tsx)
  const insertTrend = db.prepare(`
    INSERT INTO cognitive_trends (id, patient_id, period_label, score, baseline_score, change_pct, gentle_checkin_triggered, calculated_at, created_at, updated_at)
    VALUES (@id, @patient_id, @period_label, @score, @baseline_score, @change_pct, @gentle_checkin_triggered, @calculated_at, @created_at, @updated_at)
  `);

  const trends = [
    {
      id: 'trend-jul',
      patient_id: 'user-aita',
      period_label: 'JUL',
      score: 80.0,
      baseline_score: 78.0,
      change_pct: 2.5,
      gentle_checkin_triggered: 0,
      calculated_at: now - 45 * 86400000,
      created_at: now - 45 * 86400000,
      updated_at: now - 45 * 86400000,
    },
    {
      id: 'trend-aug',
      patient_id: 'user-aita',
      period_label: 'AUG',
      score: 65.0,
      baseline_score: 75.0,
      change_pct: -13.3,
      gentle_checkin_triggered: 0,
      calculated_at: now - 15 * 86400000,
      created_at: now - 15 * 86400000,
      updated_at: now - 15 * 86400000,
    },
    {
      id: 'trend-this-week',
      patient_id: 'user-aita',
      period_label: 'THIS WEEK',
      score: 52.0,
      baseline_score: 72.0,
      change_pct: -27.7,
      gentle_checkin_triggered: 1, // Triggers "Gentle check-in suggested" alert!
      calculated_at: now,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const tr of trends) insertTrend.run(tr);

  // 7. Alerts & Notifications (Matches NotificationCenter.tsx mock notifications)
  const insertAlert = db.prepare(`
    INSERT INTO alerts_notifications (id, patient_id, recipient_id, type, title, message, timestamp, read, is_delivered, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @recipient_id, @type, @title, @message, @timestamp, @read, 1, @created_at, @updated_at, 0)
  `);

  const notifications = [
    {
      id: 'notif-1',
      patient_id: 'user-aita',
      recipient_id: 'user-aita',
      type: 'medicine',
      title: 'Medicine reminder',
      message: 'Time for your BP tablet. Tap the checkmark when you have taken it.',
      timestamp: now - 120000,
      read: 0,
      created_at: now - 120000,
      updated_at: now - 120000,
    },
    {
      id: 'notif-2',
      patient_id: 'user-aita',
      recipient_id: 'user-aita',
      type: 'family',
      title: 'Voice message from Bina',
      message: 'Your daughter Bina sent a good morning voice message. Tap to listen.',
      timestamp: now - 600000,
      read: 0,
      created_at: now - 600000,
      updated_at: now - 600000,
    },
    {
      id: 'notif-3',
      patient_id: 'user-aita',
      recipient_id: 'user-aita',
      type: 'exercise',
      title: 'Brain exercise ready',
      message: 'A gentle memory exercise is waiting for you. It takes about five minutes.',
      timestamp: now - 3600000,
      read: 1,
      created_at: now - 3600000,
      updated_at: now - 3600000,
    },
    {
      id: 'notif-4',
      patient_id: 'user-aita',
      recipient_id: 'user-bina',
      type: 'care',
      title: 'Gentle check-in suggested',
      message: "Aita's routine changed a little this week. Consider a warm phone call.",
      timestamp: now - 7200000,
      read: 0,
      created_at: now - 7200000,
      updated_at: now - 7200000,
    },
    {
      id: 'notif-5',
      patient_id: 'user-aita',
      recipient_id: 'user-aita',
      type: 'family',
      title: 'Photo added by Rohan',
      message: 'Your grandson Rohan added a new family photo for the memory game.',
      timestamp: now - 18000000,
      read: 1,
      created_at: now - 18000000,
      updated_at: now - 18000000,
    },
    {
      id: 'notif-6',
      patient_id: 'user-aita',
      recipient_id: 'user-aita',
      type: 'general',
      title: 'New language pack available',
      message: 'A Mizo content pack is ready to download over Wi-Fi.',
      timestamp: now - 86400000,
      read: 1,
      created_at: now - 86400000,
      updated_at: now - 86400000,
    },
  ];

  for (const n of notifications) insertAlert.run(n);

  // 8. Care Actions
  const insertAction = db.prepare(`
    INSERT INTO care_actions (id, patient_id, actor_id, action_type, notes, metadata_json, performed_at, created_at, updated_at, is_deleted)
    VALUES (@id, @patient_id, @actor_id, @action_type, @notes, @metadata_json, @performed_at, @created_at, @updated_at, 0)
  `);

  insertAction.run({
    id: 'act-01',
    patient_id: 'user-aita',
    actor_id: 'user-bina',
    action_type: 'call_patient',
    notes: 'Morning greeting call with Aita. She was in high spirits.',
    metadata_json: JSON.stringify({ durationSec: 340 }),
    performed_at: now - 86400000,
    created_at: now - 86400000,
    updated_at: now - 86400000,
  });

  insertAction.run({
    id: 'act-02',
    patient_id: 'user-aita',
    actor_id: 'user-bina',
    action_type: 'share_with_asha',
    notes: 'Shared weekly check-in note with Lakhi Gogoi (ASHA).',
    metadata_json: JSON.stringify({ ashaId: 'user-lakhi' }),
    performed_at: now - 3600000,
    created_at: now - 3600000,
    updated_at: now - 3600000,
  });

  console.log('✅ Seeding complete!');
  console.log(`- ${users.length} users created (Aita, Bina, Rohan, Lakhi ASHA)`);
  console.log(`- ${careCircles.length} care circle links established`);
  console.log(`- ${reminders.length} reminders created for today's plan`);
  console.log(`- ${templates.length} cognitive exercise templates created with Assamese/English i18n`);
  console.log(`- ${sessions.length} exercise sessions logged`);
  console.log(`- ${trends.length} cognitive trends calculated`);
  console.log(`- ${notifications.length} alerts & notifications seeded`);
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
