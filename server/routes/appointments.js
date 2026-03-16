const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/appointments - all user appointments
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty,
             d.emoji as doctor_emoji, d.hospital as doctor_hospital, d.fee as doctor_fee
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];
    if (status && status !== 'all') { query += ' AND a.status = ?'; params.push(status); }
    query += ' ORDER BY a.appt_date DESC, a.appt_time DESC';

    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/upcoming
router.get('/upcoming', authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty,
             d.emoji as doctor_emoji, d.hospital as doctor_hospital
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.user_id = ? AND a.status = 'upcoming' AND a.appt_date >= ?
      ORDER BY a.appt_date ASC, a.appt_time ASC
      LIMIT 5
    `).all(req.user.id, today);
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const total     = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE user_id = ?').get(req.user.id).c;
    const upcoming  = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE user_id = ? AND status = 'upcoming'").get(req.user.id).c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE user_id = ? AND status = 'completed'").get(req.user.id).c;
    const cancelled = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE user_id = ? AND status = 'cancelled'").get(req.user.id).c;
    const today     = new Date().toISOString().split('T')[0];
    const next = db.prepare(`
      SELECT a.appt_date, a.appt_time, d.name as doctor_name
      FROM appointments a JOIN doctors d ON a.doctor_id = d.id
      WHERE a.user_id = ? AND a.status = 'upcoming' AND a.appt_date >= ?
      ORDER BY a.appt_date ASC, a.appt_time ASC LIMIT 1
    `).get(req.user.id, today);

    res.json({ success: true, stats: { total, upcoming, completed, cancelled, next } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/appointments - book appointment
router.post('/', authMiddleware, (req, res) => {
  try {
    const { doctor_id, appt_date, appt_time, visit_type, reason, conditions, medications, patient_name, patient_dob, patient_gender, patient_blood } = req.body;

    if (!doctor_id || !appt_date || !appt_time) {
      return res.status(400).json({ success: false, message: 'Doctor, date and time are required' });
    }

    // Check slot availability
    const conflict = db.prepare(`
      SELECT id FROM appointments 
      WHERE doctor_id = ? AND appt_date = ? AND appt_time = ? AND status != 'cancelled'
    `).get(doctor_id, appt_date, appt_time);
    if (conflict) {
      return res.status(409).json({ success: false, message: 'This slot is already booked. Please choose another time.' });
    }

    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const result = db.prepare(`
      INSERT INTO appointments (user_id, doctor_id, appt_date, appt_time, visit_type, reason, conditions, medications, fee, patient_name, patient_dob, patient_gender, patient_blood, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
    `).run(req.user.id, doctor_id, appt_date, appt_time, visit_type || 'In-Person', reason || '', conditions || '', medications || '', doctor.fee, patient_name || '', patient_dob || '', patient_gender || '', patient_blood || '');

    // Create notification
    const niceDate = new Date(appt_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`)
      .run(req.user.id, '✅', 'Appointment Confirmed!', `Booked with ${doctor.name} on ${niceDate} at ${appt_time}.`);

    const appt = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, d.emoji as doctor_emoji
      FROM appointments a JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, message: 'Appointment booked successfully', appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/appointments/:id/cancel
router.put('/:id/cancel', authMiddleware, (req, res) => {
  try {
    const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appt.status !== 'upcoming') return res.status(400).json({ success: false, message: 'Only upcoming appointments can be cancelled' });

    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`)
      .run(req.user.id, '❌', 'Appointment Cancelled', `Your appointment on ${appt.appt_date} at ${appt.appt_time} has been cancelled.`);

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/appointments/:id/complete  (admin/system use)
router.put('/:id/complete', authMiddleware, (req, res) => {
  try {
    db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true, message: 'Marked as completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/appointments/:id/rate
router.post('/:id/rate', authMiddleware, (req, res) => {
  try {
    const { rating, review_text } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }

    const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    db.prepare('UPDATE appointments SET rating = ?, review_text = ? WHERE id = ?').run(rating, review_text || '', req.params.id);

    // Update doctor rating (weighted average)
    const ratings = db.prepare("SELECT rating FROM appointments WHERE doctor_id = ? AND rating IS NOT NULL").all(appt.doctor_id);
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    db.prepare('UPDATE doctors SET rating = ?, review_count = ? WHERE id = ?').run(Math.round(avg * 10) / 10, ratings.length, appt.doctor_id);

    res.json({ success: true, message: 'Review submitted. Thank you!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/appointments/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const appt = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty,
             d.emoji as doctor_emoji, d.hospital as doctor_hospital, d.phone as doctor_phone
      FROM appointments a JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ? AND a.user_id = ?
    `).get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
