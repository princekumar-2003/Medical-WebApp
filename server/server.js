require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── STATIC FILES (Frontend) ─────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API ROUTES ──────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api',              require('./routes/health'));

// ── HEALTH CHECK ────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: '🏥 MediCare Pro API is running!', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── CATCH-ALL: Serve frontend for any non-API route ─────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── ERROR HANDLER ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── START ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      🏥  MediCare Pro  — Backend API     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Server  : http://localhost:${PORT}          ║`);
  console.log(`║  Mode    : ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log('║  Demo    : demo@medicare.com / password123 ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
