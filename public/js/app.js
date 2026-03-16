/* app.js — App shell, navigation, dashboard */

const App = {
  currentPage: 'dashboard',

  async init() {
    setHTML('greeting-time', greeting());
    await Promise.all([
      Dashboard.load(),
      Notifications.load(),
    ]);
  },

  navigate(page, navEl) {
    App.currentPage = page;

    // Hide all pages
    $$('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById('page-' + page);
    if (pg) pg.classList.add('active');

    // Update nav
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) {
      navEl.classList.add('active');
    } else {
      $$('.nav-item').forEach(n => {
        if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
      });
    }

    // Page titles
    const titles = {
      dashboard: 'Dashboard', book: 'Book Appointment',
      appointments: 'My Appointments', doctors: 'Find Doctors',
      records: 'Medical Records', prescriptions: 'Prescriptions',
      vitals: 'Health Vitals', profile: 'My Profile', settings: 'Settings'
    };
    setHTML('page-title', titles[page] || page);

    // Lazy-load page content
    switch (page) {
      case 'dashboard':    Dashboard.load(); break;
      case 'appointments': AppointmentsPage.load(); break;
      case 'doctors':      DoctorsPage.load(); break;
      case 'records':      RecordsPage.load(); break;
      case 'prescriptions':PrescriptionsPage.load(); break;
      case 'vitals':       VitalsPage.load(); break;
      case 'profile':      ProfilePage.load(); break;
      case 'settings':     SettingsPage.load(); break;
    }

    // Close mobile sidebar
    document.querySelector('.sidebar')?.classList.remove('mob-open');
  }
};

// Global navigate shortcut
function navigate(page, navEl) { App.navigate(page, navEl); }

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
const Dashboard = {
  async load() {
    await Promise.all([
      Dashboard.loadStats(),
      Dashboard.loadUpcoming(),
      Dashboard.loadDoctors(),
    ]);
    Dashboard.renderTips();
  },

  async loadStats() {
    try {
      const data = await Api.appointments.stats();
      const { total, upcoming, completed, next } = data.stats;
      setHTML('stat-total',     total);
      setHTML('stat-completed', completed);
      setHTML('stat-upcoming',  upcoming);
      setHTML('appt-notif',     upcoming);
      setHTML('stat-next',      next ? fmtDate(next.appt_date) : '—');
    } catch (e) { console.error(e); }
  },

  async loadUpcoming() {
    try {
      const data = await Api.appointments.upcoming();
      const list = data.appointments;
      const el = document.getElementById('dash-upcoming-list');
      if (!list.length) {
        el.innerHTML = emptyState('📭', 'No upcoming appointments', 'Book one now to get started!', '📅 Book Appointment', "navigate('book',null)");
        return;
      }
      el.innerHTML = list.map(a => `
        <div class="appt-item" onclick="navigate('appointments',null)" style="cursor:pointer">
          <div class="doc-avatar">${a.doctor_emoji}</div>
          <div class="info">
            <div class="name">${a.doctor_name}</div>
            <div class="spec">${a.doctor_specialty}</div>
          </div>
          <div class="meta">
            <div class="date">${fmtDate(a.appt_date)}</div>
            <div class="time">${a.appt_time}</div>
            <span class="badge badge-gold" style="margin-top:4px">Upcoming</span>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error(e); }
  },

  async loadDoctors() {
    try {
      const data = await Api.doctors.list({ available: true });
      const docs = data.doctors.filter(d => d.rating >= 4.8).slice(0, 4);
      setHTML('featured-doctors', docs.map(d => DoctorsPage.cardHTML(d)).join(''));
    } catch (e) { console.error(e); }
  },

  renderTips() {
    const tips = [
      { icon:'🏃', title:'Stay Active', text:'30 mins of walking daily reduces cardiovascular risk by 35%.' },
      { icon:'💧', title:'Hydration', text:'Drink 8-10 glasses of water to keep kidneys and skin healthy.' },
      { icon:'😴', title:'Sleep Well', text:'7-9 hours of quality sleep boosts immunity and regulates hormones.' },
      { icon:'🥦', title:'Eat Greens', text:'Leafy greens are rich in iron and folate — include 3 servings daily.' },
      { icon:'🧘', title:'Manage Stress', text:'10 mins of meditation daily lowers cortisol and improves focus.' },
      { icon:'🚭', title:'Quit Smoking', text:'Heart attack risk drops by 50% just one year after quitting.' },
    ];
    setHTML('tips-scroll', tips.map(t => `
      <div class="tip-card">
        <div class="tip-icon">${t.icon}</div>
        <div class="tip-title">${t.title}</div>
        <div class="tip-text">${t.text}</div>
      </div>
    `).join(''));
  }
};

// ════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════
const Notifications = {
  async load() {
    try {
      const data = await Api.notifications.list();
      const { notifications, unread } = data;

      // Update badge
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

      setHTML('notif-list', notifications.length
        ? notifications.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}">
            <div class="n-icon">${n.icon}</div>
            <div style="flex:1">
              <div class="n-title">${n.title}</div>
              <div class="n-body">${n.body || ''}</div>
              <div class="n-time">${timeAgo(n.created_at)}</div>
            </div>
            ${!n.is_read ? '<div class="unread-dot"></div>' : ''}
          </div>
        `).join('')
        : '<div style="padding:40px;text-align:center;color:var(--text-muted)">No notifications</div>'
      );
    } catch (e) { console.error(e); }
  },

  async toggle() {
    const panel = document.getElementById('notif-panel');
    const isOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    if (!isOpen) {
      try {
        await Api.notifications.readAll();
        document.getElementById('notif-dot').style.display = 'none';
      } catch {}
      await Notifications.load();
    }
  }
};

function toggleNotif() { Notifications.toggle(); }

// ════════════════════════════════════════
// GLOBAL SEARCH
// ════════════════════════════════════════
function handleSearch(q) {
  if (!q || q.length < 2) return;
  App.navigate('doctors', null);
  setTimeout(() => DoctorsPage.search(q), 100);
}

// ════════════════════════════════════════
// SETTINGS PAGE
// ════════════════════════════════════════
const SettingsPage = {
  load() {
    setHTML('settings-content', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">🔔 Notification Preferences</div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${toggle('Appointment Reminders', true)}
            ${toggle('Prescription Refills', true)}
            ${toggle('Lab Results Ready', true)}
            ${toggle('Health Tips', false)}
            ${toggle('Promotional Emails', false)}
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">🔒 Privacy & Security</div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${toggle('Share data with doctors', true)}
            ${toggle('Anonymous analytics', false)}
            ${toggle('Two-factor authentication', false)}
          </div>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">
            <div class="form-label" style="margin-bottom:12px">Change Password</div>
            <div class="form-group" style="margin-bottom:10px">
              <input class="form-input" type="password" id="old-pass" placeholder="Current password">
            </div>
            <div class="form-group" style="margin-bottom:10px">
              <input class="form-input" type="password" id="new-pass" placeholder="New password (min 6 chars)">
            </div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.changePassword()">Update Password</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">🌐 Language & Region</div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Language</label>
            <select class="form-input"><option>English</option><option>Hindi</option><option>Tamil</option></select>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Currency</label>
            <select class="form-input"><option>INR (₹)</option><option>USD ($)</option></select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showToast('success','✅ Preferences saved!')">Save Changes</button>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">🗑️ Data Management</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Export or delete your personal data at any time.</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="showToast('','📦 Preparing data export…')">Export My Data</button>
            <button class="btn btn-danger btn-sm" onclick="showToast('error','⚠️ Contact support to delete account')">Delete Account</button>
          </div>
        </div>
      </div>
    `);
  },

  async changePassword() {
    const op = document.getElementById('old-pass')?.value;
    const np = document.getElementById('new-pass')?.value;
    if (!op || !np) { showToast('error','Enter both passwords'); return; }
    try {
      await Api.auth.changePassword({ current_password: op, new_password: np });
      showToast('success','✅ Password changed!');
      document.getElementById('old-pass').value = '';
      document.getElementById('new-pass').value = '';
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

function toggle(label, on) {
  return `<div style="display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px">${label}</span>
    <div class="toggle-sw ${on?'on':''}" onclick="this.classList.toggle('on')"></div>
  </div>`;
}
