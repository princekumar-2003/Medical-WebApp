const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { first_name, last_name, email, password, phone } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const initials = (first_name[0] + last_name[0]).toUpperCase();

    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password, phone, avatar_initials)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hash, phone || '', initials);

    // Welcome notification
    db.prepare(`INSERT INTO notifications (user_id, icon, title, body) VALUES (?, ?, ?, ?)`)
      .run(result.lastInsertRowid, '👋', 'Welcome to MediCare Pro!', `Hi ${first_name}! Your account is ready. Book your first appointment.`);

    const user = db.prepare('SELECT id, first_name, last_name, email, phone, avatar_initials, member_since FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({ success: true, message: 'Account created successfully', token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    const { password: _, ...safeUser } = user;

    res.json({ success: true, message: 'Login successful', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, first_name, last_name, email, phone, dob, gender, blood_group, address, avatar_initials, member_since FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { first_name, last_name, phone, dob, gender, blood_group, address } = req.body;
    const initials = first_name && last_name ? (first_name[0] + last_name[0]).toUpperCase() : undefined;

    db.prepare(`
      UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name),
      phone=COALESCE(?,phone), dob=COALESCE(?,dob), gender=COALESCE(?,gender),
      blood_group=COALESCE(?,blood_group), address=COALESCE(?,address),
      avatar_initials=COALESCE(?,avatar_initials)
      WHERE id=?
    `).run(first_name, last_name, phone, dob, gender, blood_group, address, initials, req.user.id);

    const user = db.prepare('SELECT id, first_name, last_name, email, phone, dob, gender, blood_group, address, avatar_initials FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
