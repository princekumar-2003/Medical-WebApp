const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/doctors - list all with optional filters
router.get('/', authMiddleware, (req, res) => {
  try {
    const { specialty, available, search } = req.query;
    let query = 'SELECT * FROM doctors WHERE 1=1';
    const params = [];

    if (specialty) { query += ' AND specialty = ?'; params.push(specialty); }
    if (available !== undefined) { query += ' AND available = ?'; params.push(available === 'true' ? 1 : 0); }
    if (search) { query += ' AND (name LIKE ? OR specialty LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY rating DESC';
    const doctors = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsed = doctors.map(d => ({
      ...d,
      slots_am: JSON.parse(d.slots_am || '[]'),
      slots_pm: JSON.parse(d.slots_pm || '[]'),
      available: d.available === 1
    }));

    res.json({ success: true, doctors: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctors/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    res.json({
      success: true,
      doctor: {
        ...doctor,
        slots_am: JSON.parse(doctor.slots_am || '[]'),
        slots_pm: JSON.parse(doctor.slots_pm || '[]'),
        available: doctor.available === 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctors/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', authMiddleware, (req, res) => {
  try {
    const { date } = req.query;
    const doctor = db.prepare('SELECT slots_am, slots_pm FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const allSlots = [...JSON.parse(doctor.slots_am || '[]'), ...JSON.parse(doctor.slots_pm || '[]')];

    // Find already booked slots for this doctor on this date
    const booked = db.prepare(`
      SELECT appt_time FROM appointments 
      WHERE doctor_id = ? AND appt_date = ? AND status != 'cancelled'
    `).all(req.params.id, date).map(a => a.appt_time);

    const slots = allSlots.map(time => ({
      time,
      available: !booked.includes(time)
    }));

    res.json({ success: true, date, slots, slots_am: JSON.parse(doctor.slots_am), slots_pm: JSON.parse(doctor.slots_pm), booked });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/doctors/specialties/list
router.get('/specialties/list', authMiddleware, (req, res) => {
  try {
    const specialties = db.prepare('SELECT DISTINCT specialty FROM doctors ORDER BY specialty').all().map(r => r.specialty);
    res.json({ success: true, specialties });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
