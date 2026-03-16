/* auth.js — Login, register, session management */

const Auth = {
  currentUser: null,

  async init() {
    const token = Api.getToken();
    if (token) {
      try {
        const data = await Api.auth.me();
        Auth.currentUser = data.user;
        Auth.updateUI();
        return true;
      } catch {
        Api.clearToken();
      }
    }
    return false;
  },

  async login(email, password) {
    const data = await Api.auth.login({ email, password });
    Api.setToken(data.token);
    Auth.currentUser = data.user;
    localStorage.setItem('mc_user', JSON.stringify(data.user));
    Auth.updateUI();
    return data;
  },

  async register(body) {
    const data = await Api.auth.register(body);
    Api.setToken(data.token);
    Auth.currentUser = data.user;
    localStorage.setItem('mc_user', JSON.stringify(data.user));
    Auth.updateUI();
    return data;
  },

  logout() {
    Api.clearToken();
    Auth.currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    showToast('', '👋 Signed out successfully');
  },

  updateUI() {
    const u = Auth.currentUser;
    if (!u) return;
    const name = `${u.first_name} ${u.last_name}`;
    const initials = (u.first_name[0] + (u.last_name?.[0] || '')).toUpperCase();

    setHTML('sidebar-name', name);
    setHTML('sidebar-avatar', initials);
    setHTML('top-avatar', initials[0]);
    setHTML('greeting-name', u.first_name);
    document.getElementById('sidebar-avatar').style.background = 'var(--gold)';
    document.getElementById('sidebar-avatar').style.color = 'var(--navy)';
  },

  async updateProfile(body) {
    const data = await Api.auth.updateProfile(body);
    Auth.currentUser = data.user;
    localStorage.setItem('mc_user', JSON.stringify(data.user));
    Auth.updateUI();
    return data;
  }
};

// ── LOGIN HANDLER ──────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value;
  const btn      = document.getElementById('login-btn');

  if (!email || !password) { showToast('error', '⚠️ Please enter email and password'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spin-inline">↻</span> Signing in…';

  try {
    await Auth.login(email, password);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    showToast('success', `✅ Welcome back, ${Auth.currentUser.first_name}!`);
    App.init();
  } catch (err) {
    showToast('error', '❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign In to Dashboard →';
  }
}

// ── REGISTER HANDLER ───────────────────────────────────────────
async function doRegister() {
  const first_name = document.getElementById('reg-fname').value.trim();
  const last_name  = document.getElementById('reg-lname').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const password   = document.getElementById('reg-pass').value;
  const phone      = document.getElementById('reg-phone').value.trim();
  const btn        = document.getElementById('register-btn');

  if (!first_name || !last_name || !email || !password) {
    showToast('error', '⚠️ All fields are required');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spin-inline">↻</span> Creating account…';

  try {
    await Auth.register({ first_name, last_name, email, password, phone });
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    showToast('success', `🎉 Account created! Welcome, ${first_name}!`);
    App.init();
  } catch (err) {
    showToast('error', '❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Account →';
  }
}

function doLogout() {
  if (confirm('Are you sure you want to sign out?')) Auth.logout();
}

function switchAuthTab(tab, el) {
  $$('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

// Enter key on login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('auth-screen').style.display !== 'none') {
    if (!document.getElementById('login-form').classList.contains('hidden')) doLogin();
    else doRegister();
  }
});
