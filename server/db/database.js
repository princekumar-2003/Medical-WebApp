const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'medicare.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  // ── USERS ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name  TEXT    NOT NULL,
      last_name   TEXT    NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      phone       TEXT,
      dob         TEXT,
      gender      TEXT,
      blood_group TEXT,
      address     TEXT,
      avatar_initials TEXT,
      member_since TEXT DEFAULT (date('now')),
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── DOCTORS ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      specialty     TEXT    NOT NULL,
      emoji         TEXT    DEFAULT '👨‍⚕️',
      experience    INTEGER DEFAULT 0,
      rating        REAL    DEFAULT 4.5,
      review_count  INTEGER DEFAULT 0,
      fee           INTEGER NOT NULL,
      available     INTEGER DEFAULT 1,
      bio           TEXT,
      hospital      TEXT,
      education     TEXT,
      slots_am      TEXT    DEFAULT '[]',
      slots_pm      TEXT    DEFAULT '[]',
      created_at    TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ── APPOINTMENTS ───────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      doctor_id   INTEGER NOT NULL,
      appt_date   TEXT    NOT NULL,
      appt_time   TEXT    NOT NULL,
      visit_type  TEXT    DEFAULT 'In-Person',
      reason      TEXT,
      conditions  TEXT,
      medications TEXT,
      status      TEXT    DEFAULT 'upcoming',
      fee         INTEGER,
      patient_name TEXT,
      patient_dob  TEXT,
      patient_gender TEXT,
      patient_blood  TEXT,
      rating      INTEGER,
      review_text TEXT,
      booked_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    );
  `);

  // ── MEDICAL RECORDS ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      record_type TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      record_date TEXT    NOT NULL,
      notes       TEXT,
      file_url    TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── PRESCRIPTIONS ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      doctor_id    INTEGER,
      drug_name    TEXT    NOT NULL,
      dosage       TEXT,
      instruction  TEXT,
      duration     TEXT,
      status       TEXT    DEFAULT 'Active',
      refills      INTEGER DEFAULT 0,
      prescribed_date TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
    );
  `);

  // ── VITALS ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vitals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      heart_rate  INTEGER,
      blood_pressure TEXT,
      temperature REAL,
      weight      REAL,
      bmi         REAL,
      spo2        INTEGER,
      blood_glucose INTEGER,
      logged_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── NOTIFICATIONS ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      icon        TEXT    DEFAULT '🔔',
      title       TEXT    NOT NULL,
      body        TEXT,
      is_read     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── SEED DOCTORS ──────────────────────────────────────────────
  const doctorCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
  if (doctorCount === 0) {
    const insertDoctor = db.prepare(`
      INSERT INTO doctors (name, specialty, emoji, experience, rating, review_count, fee, available, bio, hospital, education, slots_am, slots_pm)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const doctors = [
      ['Dr. Priya Sharma',    'Cardiologist',       '👩‍⚕️', 14, 4.9, 312, 800,  1, 'Senior interventional cardiologist with expertise in heart disease management and preventive cardiology. Trained at top institutions across India and abroad.', 'Apollo Heart Institute', 'MBBS, MD (Cardiology) — AIIMS Delhi', JSON.stringify(['9:00 AM','9:30 AM','10:00 AM','10:30 AM']), JSON.stringify(['2:00 PM','2:30 PM','3:00 PM','4:00 PM'])],
      ['Dr. Arjun Mehta',     'Neurologist',        '🧠',   12, 4.8, 245, 900,  1, 'Expert in treating neurological disorders including epilepsy, migraines, Parkinson\'s disease and stroke rehabilitation.', 'Fortis Brain & Spine', 'MBBS, DM (Neurology) — CMC Vellore', JSON.stringify(['9:00 AM','10:00 AM','11:00 AM']), JSON.stringify(['3:00 PM','4:00 PM','5:00 PM'])],
      ['Dr. Ananya Krishnan', 'Dermatologist',      '🌸',    8, 4.7, 189, 600,  1, 'Specialist in cosmetic and medical dermatology, treating acne, eczema, psoriasis and skin cancer screening.', 'Skin Care Plus Clinic', 'MBBS, MD (Dermatology) — MAHE Manipal', JSON.stringify(['9:30 AM','10:30 AM','11:30 AM']), JSON.stringify(['2:30 PM','4:30 PM'])],
      ['Dr. Rajesh Kumar',    'Orthopedic',         '🦴',   18, 4.9, 420, 1000, 1, 'Top orthopedic surgeon specializing in joint replacements, sports injuries and spinal surgeries with a 98% success rate.', 'Bone & Joint Centre', 'MBBS, MS (Ortho) — JIPMER Pondicherry', JSON.stringify(['8:00 AM','9:00 AM','11:00 AM']), JSON.stringify(['2:00 PM','3:00 PM'])],
      ['Dr. Meera Patel',     'Pediatrician',       '👶',   10, 4.8, 367, 500,  1, 'Dedicated pediatrician caring for children from birth to adolescence. Special interest in child nutrition and developmental disorders.', 'Kids First Hospital', 'MBBS, MD (Pediatrics) — KMC Manipal', JSON.stringify(['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM']), JSON.stringify(['4:00 PM','4:30 PM','5:00 PM'])],
      ['Dr. Vikram Singh',    'General Physician',  '🩺',   16, 4.6, 523, 400,  1, 'Experienced family physician providing comprehensive primary care for all age groups. Special interest in preventive medicine and lifestyle diseases.', 'City Health Clinic', 'MBBS — Sri Ramachandra University', JSON.stringify(['9:00 AM','9:15 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM']), JSON.stringify(['2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM'])],
      ['Dr. Sunita Rao',      'Gynecologist',       '🌺',   20, 4.9, 601, 750,  0, 'Senior obstetrician & gynaecologist with 20 years experience in maternal-fetal medicine, high-risk pregnancies and minimally invasive surgery.', "Women's Care Hospital", 'MBBS, MD, DGO — Osmania Medical College', JSON.stringify(['10:00 AM','11:00 AM']), JSON.stringify(['3:00 PM','4:00 PM'])],
      ['Dr. Aditya Bose',     'Psychiatrist',       '🧘',   11, 4.7, 178, 850,  1, 'Compassionate psychiatrist specializing in anxiety, depression, ADHD, OCD and relationship counselling. Practices CBT and mindfulness-based therapy.', 'Mind Wellness Centre', 'MBBS, MD (Psychiatry) — NIMHANS Bangalore', JSON.stringify(['10:00 AM','11:00 AM']), JSON.stringify(['3:00 PM','4:00 PM','5:00 PM','5:30 PM'])],
    ];
    const insertMany = db.transaction((docs) => { for (const d of docs) insertDoctor.run(...d); });
    insertMany(doctors);
    console.log('✅ Seeded 8 doctors');
  }

  // ── SEED DEMO USER ────────────────────────────────────────────
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    db.prepare(`INSERT INTO users (first_name, last_name, email, password, phone, dob, gender, blood_group, avatar_initials)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('Demo', 'Patient', 'demo@medicare.com', hash, '+91 9876543210', '1990-06-15', 'Male', 'B+', 'DP');
    console.log('✅ Seeded demo user: demo@medicare.com / password123');

    // Demo notifications
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@medicare.com').id;
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`).run(userId, '👋', 'Welcome to MediCare Pro!', 'Your account is set up. Book your first appointment today.');
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`).run(userId, '💊', 'Prescription Reminder', 'Remember to take your medications as scheduled.');

    // Demo vitals
    db.prepare(`INSERT INTO vitals (user_id, heart_rate, blood_pressure, temperature, weight, bmi, spo2, blood_glucose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, 72, '118/76', 98.4, 70, 22.8, 98, 95);

    // Demo records
    db.prepare(`INSERT INTO medical_records (user_id, record_type, title, record_date, notes) VALUES (?, ?, ?, ?, ?)`).run(userId, 'Lab Report', 'Complete Blood Count (CBC)', '2025-11-20', 'All values within normal range. Haemoglobin 13.8 g/dL, WBC 7,200.');
    db.prepare(`INSERT INTO medical_records (user_id, record_type, title, record_date, notes) VALUES (?, ?, ?, ?, ?)`).run(userId, 'X-Ray / Scan', 'Chest X-Ray', '2025-09-05', 'Clear lung fields. No active lesion. Cardiac silhouette normal.');

    // Demo prescriptions
    db.prepare(`INSERT INTO prescriptions (user_id, doctor_id, drug_name, dosage, instruction, duration, status, refills, prescribed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, 6, 'Metformin 500mg', '500mg', 'Take twice daily after meals', '3 months', 'Active', 2, '2026-01-10');
    db.prepare(`INSERT INTO prescriptions (user_id, doctor_id, drug_name, dosage, instruction, duration, status, refills, prescribed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, 1, 'Atorvastatin 20mg', '20mg', 'Once daily at bedtime', 'Ongoing', 'Active', 5, '2025-12-01');
  }

  console.log('✅ Database initialised');
}

initDB();

module.exports = db;
