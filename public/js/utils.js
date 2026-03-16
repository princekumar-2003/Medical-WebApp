/* utils.js — Shared utility functions */

// ── DATE / TIME ────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDatetime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

function timeAgo(dtStr) {
  const diff = Date.now() - new Date(dtStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs>1?'s':''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} day${days>1?'s':''} ago`;
  return fmtDate(dtStr.split('T')[0]);
}

// ── DOM ────────────────────────────────────────────────────────
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

function setHTML(id, html) {
  const e = document.getElementById(id);
  if (e) e.innerHTML = html;
}

function show(id) { const e = document.getElementById(id); if (e) e.style.display = ''; }
function hide(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
function addClass(id, cls) { const e = document.getElementById(id); if (e) e.classList.add(cls); }
function removeClass(id, cls) { const e = document.getElementById(id); if (e) e.classList.remove(cls); }

// ── TOAST ─────────────────────────────────────────────────────
function showToast(type, msg, duration = 3500) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── BADGE ─────────────────────────────────────────────────────
function statusBadge(status) {
  const map = { upcoming: 'badge-gold', completed: 'badge-green', cancelled: 'badge-red' };
  return `<span class="badge ${map[status] || 'badge-grey'}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
}

// ── NUMBER FORMAT ─────────────────────────────────────────────
function currency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// ── LOADER ────────────────────────────────────────────────────
function spinner(msg = 'Loading…') {
  return `<div class="loading-spinner"><div class="spin"></div><span>${msg}</span></div>`;
}

function emptyState(icon, title, sub, btnLabel, btnFn) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    <div class="empty-sub">${sub}</div>
    ${btnLabel ? `<button class="btn btn-primary" onclick="${btnFn}">${btnLabel}</button>` : ''}
  </div>`;
}

// ── OVERFLOW CLOSE ────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
