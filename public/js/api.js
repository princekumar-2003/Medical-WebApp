/* api.js — All backend API calls */
const API_BASE = window.location.origin + '/api';

const Api = {
  // ── HELPERS ─────────────────────────────────────────────────
  getToken() { return localStorage.getItem('mc_token'); },
  setToken(t) { localStorage.setItem('mc_token', t); },
  clearToken() { localStorage.removeItem('mc_token'); localStorage.removeItem('mc_user'); },

  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  },

  get:    (ep)       => Api.request('GET',    ep),
  post:   (ep, body) => Api.request('POST',   ep, body),
  put:    (ep, body) => Api.request('PUT',    ep, body),
  delete: (ep)       => Api.request('DELETE', ep),

  // ── AUTH ─────────────────────────────────────────────────────
  auth: {
    login:          (body) => Api.post('/auth/login', body),
    register:       (body) => Api.post('/auth/register', body),
    me:             ()     => Api.get('/auth/me'),
    updateProfile:  (body) => Api.put('/auth/profile', body),
    changePassword: (body) => Api.put('/auth/change-password', body),
  },

  // ── DOCTORS ──────────────────────────────────────────────────
  doctors: {
    list:         (params = {}) => Api.get('/doctors?' + new URLSearchParams(params)),
    get:          (id)          => Api.get('/doctors/' + id),
    availability: (id, date)    => Api.get(`/doctors/${id}/availability?date=${date}`),
    specialties:  ()            => Api.get('/doctors/specialties/list'),
  },

  // ── APPOINTMENTS ─────────────────────────────────────────────
  appointments: {
    list:     (status)  => Api.get('/appointments' + (status ? '?status=' + status : '')),
    upcoming: ()        => Api.get('/appointments/upcoming'),
    stats:    ()        => Api.get('/appointments/stats'),
    get:      (id)      => Api.get('/appointments/' + id),
    book:     (body)    => Api.post('/appointments', body),
    cancel:   (id)      => Api.put('/appointments/' + id + '/cancel'),
    complete: (id)      => Api.put('/appointments/' + id + '/complete'),
    rate:     (id, body)=> Api.post('/appointments/' + id + '/rate', body),
  },

  // ── RECORDS ──────────────────────────────────────────────────
  records: {
    list:   ()     => Api.get('/records'),
    add:    (body) => Api.post('/records', body),
    delete: (id)   => Api.delete('/records/' + id),
  },

  // ── PRESCRIPTIONS ─────────────────────────────────────────────
  prescriptions: {
    list:   ()   => Api.get('/prescriptions'),
    refill: (id) => Api.post('/prescriptions/refill/' + id),
  },

  // ── VITALS ───────────────────────────────────────────────────
  vitals: {
    latest:  ()     => Api.get('/vitals/latest'),
    history: ()     => Api.get('/vitals/history'),
    log:     (body) => Api.post('/vitals', body),
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────
  notifications: {
    list:    ()   => Api.get('/notifications'),
    readAll: ()   => Api.put('/notifications/read-all'),
    delete:  (id) => Api.delete('/notifications/' + id),
  },
};
