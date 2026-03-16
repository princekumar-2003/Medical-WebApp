/* appointments.js, records.js, prescriptions.js, vitals.js, profile.js — All health pages */

// ════════════════════════════════════════
// APPOINTMENTS PAGE
// ════════════════════════════════════════
const AppointmentsPage = {
  current: 'upcoming',

  async load(filter) {
    filter = filter || AppointmentsPage.current;
    AppointmentsPage.current = filter;
    setHTML('appt-list', spinner('Loading appointments…'));
    try {
      const data = await Api.appointments.list(filter === 'all' ? '' : filter);
      AppointmentsPage.render(data.appointments, filter);
    } catch (e) {
      setHTML('appt-list', '<p style="color:var(--danger)">Failed to load appointments.</p>');
    }
  },

  render(list, filter) {
    $$('.appt-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === filter);
    });

    if (!list.length) {
      setHTML('appt-list', emptyState('📭', `No ${filter} appointments`,
        'Book a new appointment to get started!',
        '📅 Book Now', "navigate('book',null)"));
      return;
    }

    setHTML('appt-list', list.map(a => `
      <div class="appt-full-card">
        <div class="doc-big">${a.doctor_emoji}</div>
        <div class="info">
          <div class="doc-name">${a.doctor_name}</div>
          <div class="spec">${a.doctor_specialty}</div>
          <div class="details">
            <div class="det-item">📅 ${fmtDate(a.appt_date)}</div>
            <div class="det-item">🕐 ${a.appt_time}</div>
            <div class="det-item">${a.visit_type === 'Video Consultation' ? '💻' : '🏥'} ${a.visit_type}</div>
            ${a.reason ? `<div class="det-item">📋 ${a.reason.substring(0,40)}${a.reason.length>40?'…':''}</div>` : ''}
          </div>
        </div>
        <div class="actions">
          ${statusBadge(a.status)}
          ${a.status === 'upcoming' ? `
            <button class="btn btn-outline btn-sm" onclick="AppointmentsPage.reschedule(${a.id},${a.doctor_id})">Reschedule</button>
            <button class="btn btn-danger btn-sm" onclick="AppointmentsPage.cancel(${a.id})">Cancel</button>
          ` : ''}
          ${a.status === 'completed' && !a.rating ? `
            <button class="btn btn-outline btn-sm" onclick="RatingModal.open(${a.id},'${a.doctor_name}')">⭐ Rate</button>
          ` : ''}
          ${a.status === 'completed' && a.rating ? `
            <span class="badge badge-gold">${'★'.repeat(a.rating)} Rated</span>
          ` : ''}
          ${a.status === 'completed' ? `
            <button class="btn btn-success btn-sm" onclick="DoctorsPage.quickBook(${a.doctor_id})">Book Again</button>
          ` : ''}
        </div>
      </div>
    `).join(''));
  },

  async cancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await Api.appointments.cancel(id);
      showToast('warning', '❌ Appointment cancelled');
      AppointmentsPage.load(AppointmentsPage.current);
      Dashboard.loadStats();
    } catch (e) { showToast('error', '❌ ' + e.message); }
  },

  reschedule(apptId, docId) {
    AppointmentsPage.cancel(apptId).then(() => {
      DoctorsPage.quickBook(docId);
    });
  }
};

// ════════════════════════════════════════
// RATING MODAL
// ════════════════════════════════════════
const RatingModal = {
  apptId: null,
  rating: 0,

  open(apptId, docName) {
    RatingModal.apptId = apptId;
    RatingModal.rating = 0;
    setHTML('rate-doc-name', docName);
    $$('.stars-input .star').forEach(s => s.classList.remove('lit'));
    document.getElementById('rate-comment').value = '';
    openModal('rate-modal');
  },

  setRating(v) {
    RatingModal.rating = v;
    $$('.stars-input .star').forEach(s => {
      s.classList.toggle('lit', parseInt(s.dataset.v) <= v);
    });
  },

  async submit() {
    if (!RatingModal.rating) { showToast('error','Please select a star rating'); return; }
    const comment = document.getElementById('rate-comment').value;
    try {
      await Api.appointments.rate(RatingModal.apptId, { rating: RatingModal.rating, review_text: comment });
      closeModal('rate-modal');
      showToast('success','⭐ Thank you for your review!');
      AppointmentsPage.load(AppointmentsPage.current);
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

// ════════════════════════════════════════
// MEDICAL RECORDS
// ════════════════════════════════════════
const RecordsPage = {
  async load() {
    setHTML('records-list', spinner('Loading records…'));
    try {
      const data = await Api.records.list();
      RecordsPage.render(data.records);
    } catch (e) {
      setHTML('records-list', '<p style="color:var(--danger)">Failed to load records.</p>');
    }
  },

  render(records) {
    const icons  = { 'Lab Report':'🧪','X-Ray / Scan':'🩻',"Doctor's Note":'📝','Prescription':'💊','Vaccination':'💉','Other':'📁' };
    const colors = { 'Lab Report':'#EBF0FA','X-Ray / Scan':'#FEF5E7',"Doctor's Note":'#E6F7EE','Prescription':'#FDECEA','Vaccination':'#F0FAE6','Other':'#F0F2F7' };

    setHTML('records-list', records.length
      ? records.map(r => `
        <div class="record-card">
          <div class="record-icon" style="background:${colors[r.record_type]||'#F0F2F7'}">${icons[r.record_type]||'📁'}</div>
          <div style="flex:1">
            <div class="rec-title">${r.title}</div>
            <div class="rec-date">${r.record_type} · ${fmtDate(r.record_date)}</div>
            ${r.notes ? `<div class="rec-desc">${r.notes}</div>` : ''}
          </div>
          <div class="rec-actions" style="display:flex;gap:8px;flex-direction:column">
            <button class="btn btn-outline btn-sm" onclick="showToast('','📥 Downloading…')">📥 Download</button>
            <button class="btn btn-danger btn-sm" onclick="RecordsPage.delete(${r.id})">🗑️ Delete</button>
          </div>
        </div>
      `).join('')
      : emptyState('📁','No medical records','Add your first record to keep track of your health history', '+ Add Record', "openModal('record-modal')")
    );
  },

  async add() {
    const title       = document.getElementById('rec-title').value.trim();
    const record_type = document.getElementById('rec-type').value;
    const record_date = document.getElementById('rec-date').value;
    const notes       = document.getElementById('rec-notes').value.trim();

    if (!title || !record_date) { showToast('error','Title and date are required'); return; }

    const btn = document.getElementById('add-record-btn');
    btn.disabled = true;
    try {
      await Api.records.add({ title, record_type, record_date, notes });
      closeModal('record-modal');
      showToast('success','✅ Record added!');
      await RecordsPage.load();
      // Reset
      document.getElementById('rec-title').value = '';
      document.getElementById('rec-notes').value = '';
    } catch (e) { showToast('error','❌ ' + e.message); }
    finally { btn.disabled = false; }
  },

  async delete(id) {
    if (!confirm('Delete this record?')) return;
    try {
      await Api.records.delete(id);
      showToast('success','🗑️ Record deleted');
      RecordsPage.load();
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

// ════════════════════════════════════════
// PRESCRIPTIONS
// ════════════════════════════════════════
const PrescriptionsPage = {
  async load() {
    setHTML('prescriptions-list', spinner('Loading prescriptions…'));
    try {
      const data = await Api.prescriptions.list();
      PrescriptionsPage.render(data.prescriptions);
    } catch (e) {
      setHTML('prescriptions-list', '<p style="color:var(--danger)">Failed to load prescriptions.</p>');
    }
  },

  render(list) {
    setHTML('prescriptions-list', list.length
      ? list.map(p => `
        <div class="record-card">
          <div class="record-icon" style="background:#FDECEA">💊</div>
          <div style="flex:1">
            <div class="rec-title" style="display:flex;align-items:center;gap:10px">
              ${p.drug_name}
              <span class="badge ${p.status==='Active'?'badge-green':'badge-grey'}">${p.status}</span>
            </div>
            <div class="rec-date">Prescribed by ${p.doctor_name||'Unknown'} · ${fmtDate(p.prescribed_date)}</div>
            <div class="rec-desc">${p.instruction||''} · Duration: ${p.duration||'—'}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              Refills remaining: <strong>${p.refills}</strong>
              ${p.dosage ? ` · Dosage: ${p.dosage}` : ''}
            </div>
          </div>
          <div class="rec-actions" style="display:flex;flex-direction:column;gap:6px">
            ${p.status==='Active' && p.refills > 0 ? `
              <button class="btn btn-success btn-sm" onclick="PrescriptionsPage.refill(${p.id})">Request Refill</button>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="showToast('','📥 Generating PDF…')">📥 PDF</button>
          </div>
        </div>
      `).join('')
      : emptyState('💊','No prescriptions','Your prescriptions from doctors will appear here')
    );
  },

  async refill(id) {
    try {
      await Api.prescriptions.refill(id);
      showToast('success','✅ Refill requested!');
      PrescriptionsPage.load();
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

// ════════════════════════════════════════
// VITALS
// ════════════════════════════════════════
const VitalsPage = {
  async load() {
    setHTML('vitals-content', spinner('Loading vitals…'));
    try {
      const data = await Api.vitals.latest();
      VitalsPage.render(data.vitals);
    } catch (e) {
      setHTML('vitals-content', '<p style="color:var(--danger)">Failed to load vitals.</p>');
    }
  },

  render(v) {
    const cards = [
      { icon:'❤️', name:'Heart Rate',      value: v?.heart_rate    || '—', unit:'bpm',    color:'#FDECEA', status:'Normal' },
      { icon:'🩸', name:'Blood Pressure',  value: v?.blood_pressure || '—', unit:'mmHg',   color:'#E6F7EE', status:'Normal' },
      { icon:'🌡️', name:'Temperature',     value: v?.temperature   || '—', unit:'°F',     color:'#FEF5E7', status:'Normal' },
      { icon:'⚖️', name:'BMI',             value: v?.bmi           || '—', unit:'kg/m²',  color:'#E6F7EE', status:'Healthy' },
      { icon:'🫁', name:'SpO₂',            value: v?.spo2          || '—', unit:'%',      color:'#EBF0FA', status:'Normal' },
      { icon:'🍬', name:'Blood Glucose',   value: v?.blood_glucose || '—', unit:'mg/dL',  color:'#F0FAE6', status:'Normal' },
    ];

    setHTML('vitals-content', `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
        ${cards.map(c => `
          <div class="stat-card">
            <div class="icon" style="background:${c.color}">${c.icon}</div>
            <div class="value" style="font-size:26px">${c.value}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${c.unit}</div>
            <div class="label">${c.name}</div>
            <div class="change up">→ ${c.status}</div>
          </div>
        `).join('')}
      </div>
      ${v ? `<div style="text-align:right;font-size:12px;color:var(--text-muted);margin-bottom:16px">Last updated: ${fmtDatetime(v.logged_at)}</div>` : ''}
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">📊 Log New Vitals</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Heart Rate (bpm)</label>
            <input class="form-input" type="number" placeholder="72" id="v-hr">
          </div>
          <div class="form-group">
            <label class="form-label">Blood Pressure (mmHg)</label>
            <input class="form-input" placeholder="120/80" id="v-bp">
          </div>
          <div class="form-group">
            <label class="form-label">Temperature (°F)</label>
            <input class="form-input" type="number" step="0.1" placeholder="98.6" id="v-temp">
          </div>
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input class="form-input" type="number" step="0.1" placeholder="70" id="v-wt">
          </div>
          <div class="form-group">
            <label class="form-label">SpO₂ (%)</label>
            <input class="form-input" type="number" placeholder="98" id="v-spo2">
          </div>
          <div class="form-group">
            <label class="form-label">Blood Glucose (mg/dL)</label>
            <input class="form-input" type="number" placeholder="95" id="v-bg">
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="VitalsPage.log()">💾 Save Vitals</button>
      </div>
    `);
  },

  async log() {
    const body = {
      heart_rate:    document.getElementById('v-hr')?.value   || null,
      blood_pressure:document.getElementById('v-bp')?.value   || null,
      temperature:   document.getElementById('v-temp')?.value || null,
      weight:        document.getElementById('v-wt')?.value   || null,
      spo2:          document.getElementById('v-spo2')?.value || null,
      blood_glucose: document.getElementById('v-bg')?.value   || null,
    };

    const hasValue = Object.values(body).some(v => v);
    if (!hasValue) { showToast('error','Enter at least one vital value'); return; }

    try {
      await Api.vitals.log(body);
      showToast('success','📊 Vitals saved!');
      VitalsPage.load();
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

// ════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════
const ProfilePage = {
  editing: false,

  async load() {
    try {
      const data = await Api.auth.me();
      Auth.currentUser = data.user;
      ProfilePage.render(data.user);
    } catch {}
  },

  render(u) {
    const name = `${u.first_name} ${u.last_name}`;
    const initials = (u.first_name[0] + (u.last_name?.[0]||'')).toUpperCase();

    setHTML('profile-full-name', name);
    setHTML('profile-email-tag', u.email);
    setHTML('profile-avatar-lg', initials);

    setHTML('profile-details', `
      ${profileRow('First Name',  u.first_name  || '—')}
      ${profileRow('Last Name',   u.last_name   || '—')}
      ${profileRow('Email',       u.email       || '—')}
      ${profileRow('Phone',       u.phone       || '—')}
      ${profileRow('Date of Birth', u.dob ? fmtDate(u.dob) : '—')}
      ${profileRow('Gender',      u.gender      || '—')}
      ${profileRow('Blood Group', u.blood_group || '—')}
      ${profileRow('Member Since',u.member_since ? fmtDate(u.member_since) : '—')}
    `);
  },

  showEditModal() {
    const u = Auth.currentUser || {};
    setHTML('edit-profile-form', `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">First Name</label>
          <input class="form-input" id="ep-fname" value="${u.first_name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Last Name</label>
          <input class="form-input" id="ep-lname" value="${u.last_name||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="ep-phone" value="${u.phone||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input class="form-input" type="date" id="ep-dob" value="${u.dob||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-input" id="ep-gender">
            <option value="">Select</option>
            ${['Male','Female','Other','Prefer not to say'].map(g => `<option ${u.gender===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Blood Group</label>
          <select class="form-input" id="ep-blood">
            <option value="">Select</option>
            ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => `<option ${u.blood_group===b?'selected':''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full">
          <label class="form-label">Address</label>
          <input class="form-input" id="ep-addr" value="${u.address||''}" placeholder="Your address">
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px" onclick="ProfilePage.saveEdit()">💾 Save Changes</button>
    `);
    openModal('edit-profile-modal');
  },

  async saveEdit() {
    const body = {
      first_name:  document.getElementById('ep-fname')?.value,
      last_name:   document.getElementById('ep-lname')?.value,
      phone:       document.getElementById('ep-phone')?.value,
      dob:         document.getElementById('ep-dob')?.value,
      gender:      document.getElementById('ep-gender')?.value,
      blood_group: document.getElementById('ep-blood')?.value,
      address:     document.getElementById('ep-addr')?.value,
    };
    try {
      const data = await Auth.updateProfile(body);
      closeModal('edit-profile-modal');
      showToast('success','✅ Profile updated!');
      ProfilePage.render(data.user);
    } catch (e) { showToast('error','❌ ' + e.message); }
  }
};

function profileRow(l, v) {
  return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
    <span style="color:var(--text-muted)">${l}</span>
    <span style="font-weight:600">${v}</span>
  </div>`;
}
