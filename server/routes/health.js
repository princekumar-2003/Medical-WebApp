const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// ════════════════════════════════════════
// MEDICAL RECORDS
// ════════════════════════════════════════

// GET /api/records
router.get('/records', authMiddleware, (req, res) => {
  try {
    const records = db.prepare('SELECT * FROM medical_records WHERE user_id = ? ORDER BY record_date DESC').all(req.user.id);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/records
router.post('/records', authMiddleware, (req, res) => {
  try {
    const { record_type, title, record_date, notes } = req.body;
    if (!title || !record_date) {
      return res.status(400).json({ success: false, message: 'Title and date required' });
    }
    const result = db.prepare(`
      INSERT INTO medical_records (user_id, record_type, title, record_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, record_type || 'Other', title, record_date, notes || '');

    const record = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Record added', record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/records/:id
router.delete('/records/:id', authMiddleware, (req, res) => {
  try {
    const rec = db.prepare('SELECT id FROM medical_records WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });
    db.prepare('DELETE FROM medical_records WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════
// PRESCRIPTIONS
// ════════════════════════════════════════

// GET /api/prescriptions
router.get('/prescriptions', authMiddleware, (req, res) => {
  try {
    const prescriptions = db.prepare(`
      SELECT p.*, d.name as doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      WHERE p.user_id = ?
      ORDER BY p.prescribed_date DESC
    `).all(req.user.id);
    res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/prescriptions/refill/:id
router.post('/prescriptions/refill/:id', authMiddleware, (req, res) => {
  try {
    const presc = db.prepare('SELECT * FROM prescriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!presc) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (presc.refills <= 0) return res.status(400).json({ success: false, message: 'No refills remaining' });

    db.prepare('UPDATE prescriptions SET refills = refills - 1 WHERE id = ?').run(req.params.id);
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`)
      .run(req.user.id, '💊', 'Refill Requested', `Refill for ${presc.drug_name} has been requested.`);

    res.json({ success: true, message: 'Refill requested successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════
// VITALS
// ════════════════════════════════════════

// GET /api/vitals/latest
router.get('/vitals/latest', authMiddleware, (req, res) => {
  try {
    const vitals = db.prepare('SELECT * FROM vitals WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1').get(req.user.id);
    res.json({ success: true, vitals: vitals || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/vitals/history
router.get('/vitals/history', authMiddleware, (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM vitals WHERE user_id = ? ORDER BY logged_at DESC LIMIT 30').all(req.user.id);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/vitals
router.post('/vitals', authMiddleware, (req, res) => {
  try {
    const { heart_rate, blood_pressure, temperature, weight, bmi, spo2, blood_glucose } = req.body;

    if (!heart_rate && !blood_pressure && !weight && !blood_glucose) {
      return res.status(400).json({ success: false, message: 'Provide at least one vital value' });
    }

    // Auto-calc BMI if height is provided
    const calcBmi = bmi || null;

    const result = db.prepare(`
      INSERT INTO vitals (user_id, heart_rate, blood_pressure, temperature, weight, bmi, spo2, blood_glucose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, heart_rate || null, blood_pressure || null, temperature || null, weight || null, calcBmi, spo2 || null, blood_glucose || null);

    const vital = db.prepare('SELECT * FROM vitals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Vitals logged', vitals: vital });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════

// GET /api/notifications
router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
    const unread = notifications.filter(n => n.is_read === 0).length;
    res.json({ success: true, notifications, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/notifications/read-all
router.put('/notifications/read-all', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notifications/:id
router.delete('/notifications/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
