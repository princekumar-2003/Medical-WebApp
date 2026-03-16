/* booking.js — 4-step appointment booking flow */

const Booking = {
  data: { doctor: null, date: null, time: null, step: 1 },
  calMonth: new Date().getMonth(),
  calYear:  new Date().getFullYear(),
  doctors:  [],

  async initPage() {
    Booking.data = { doctor: null, date: null, time: null, step: 1 };
    Booking.calMonth = new Date().getMonth();
    Booking.calYear  = new Date().getFullYear();
    await Booking.loadDoctors();
    Booking.goToStep(1);
    document.getElementById('step1-next').disabled = true;
    document.getElementById('step2-next').disabled = true;
  },

  async loadDoctors(specialty = '') {
    try {
      const params = specialty ? { specialty } : {};
      const data = await Api.doctors.list(params);
      Booking.doctors = data.doctors;
      Booking.renderDocList(Booking.doctors);
    } catch (e) { showToast('error','Failed to load doctors'); }
  },

  renderDocList(docs) {
    setHTML('doc-select-list', docs.length
      ? docs.map(d => `
        <div class="doc-select-card ${Booking.data.doctor?.id === d.id ? 'selected' : ''}" onclick="Booking.selectDoctor(${d.id})">
          <div class="mini-avatar">${d.emoji}</div>
          <div class="mini-info">
            <div class="name">${d.name}</div>
            <div class="spec">${d.specialty}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
              <span style="color:var(--gold);font-size:12px">★ ${d.rating}</span>
              <span style="color:var(--text-muted);font-size:11px">(${d.review_count})</span>
            </div>
            <div class="fee">${currency(d.fee)} / visit</div>
            ${!d.available ? '<span class="badge badge-grey" style="margin-top:4px">Unavailable</span>' : ''}
          </div>
        </div>
      `).join('')
      : emptyState('🔍','No doctors found','Try a different specialty filter')
    );
  },

  selectDoctor(id) {
    Booking.data.doctor = Booking.doctors.find(d => d.id === id);
    Booking.data.date = null;
    Booking.data.time = null;
    document.getElementById('step1-next').disabled = false;
    document.getElementById('step2-next').disabled = true;
    Booking.renderDocList(Booking.doctors);
  },

  goToStep(n) {
    Booking.data.step = n;
    $$('.booking-step').forEach(s => s.classList.remove('active'));
    document.getElementById('booking-step-' + n).classList.add('active');
    $$('.step-btn').forEach((b, i) => b.classList.toggle('active', i + 1 === n));
    if (n === 2) Booking.renderCalendar();
    if (n === 3) Booking.prefillPatient();
    if (n === 4) Booking.renderSummary();
  },

  filterBySpec() {
    const v = document.getElementById('spec-filter').value;
    Booking.loadDoctors(v);
  },

  // ── CALENDAR ─────────────────────────────────────────────
  renderCalendar() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    setHTML('cal-month-label', months[Booking.calMonth] + ' ' + Booking.calYear);

    const grid = document.getElementById('cal-grid');
    const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html = days.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    const first  = new Date(Booking.calYear, Booking.calMonth, 1).getDay();
    const total  = new Date(Booking.calYear, Booking.calMonth + 1, 0).getDate();
    const today  = new Date(); today.setHours(0,0,0,0);

    for (let i = 0; i < first; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= total; d++) {
      const dt       = new Date(Booking.calYear, Booking.calMonth, d);
      const isPast   = dt < today;
      const isSun    = dt.getDay() === 0;
      const dStr     = dt.toISOString().split('T')[0];
      const isSel    = Booking.data.date === dStr;
      const isToday  = dt.toDateString() === today.toDateString();

      const cls = [
        isPast || isSun ? 'past unavailable' : 'has-slots',
        isSel   ? 'selected' : '',
        isToday && !isSel ? 'today' : ''
      ].filter(Boolean).join(' ');

      const click = (!isPast && !isSun) ? `Booking.pickDate('${dStr}')` : '';
      html += `<div class="cal-day ${cls}" onclick="${click}">${d}</div>`;
    }
    grid.innerHTML = html;
  },

  changeMonth(dir) {
    Booking.calMonth += dir;
    if (Booking.calMonth > 11) { Booking.calMonth = 0; Booking.calYear++; }
    if (Booking.calMonth < 0)  { Booking.calMonth = 11; Booking.calYear--; }
    Booking.renderCalendar();
  },

  async pickDate(dateStr) {
    Booking.data.date = dateStr;
    Booking.data.time = null;
    document.getElementById('step2-next').disabled = true;
    Booking.renderCalendar();
    await Booking.renderSlots(dateStr);
  },

  async renderSlots(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    setHTML('time-slots-date', d.toLocaleDateString('en-IN', opts));

    setHTML('time-slots-container', spinner('Loading slots…'));

    try {
      const avail = await Api.doctors.availability(Booking.data.doctor.id, dateStr);

      const renderSection = (slots, label, allAvail) => {
        const filtered = allAvail.filter(s => slots.includes(s.time));
        if (!filtered.length) return '';
        const btns = filtered.map(s => `
          <div class="slot-btn ${!s.available ? 'booked' : ''} ${Booking.data.time === s.time ? 'selected' : ''}"
               onclick="${s.available ? `Booking.selectSlot('${s.time}')` : ''}">
            ${s.time}
          </div>
        `).join('');
        return `<div class="slots-section"><div class="slots-label">${label}</div><div class="slots-grid">${btns}</div></div>`;
      };

      const html = renderSection(avail.slots_am, '🌅 Morning', avail.slots) +
                   renderSection(avail.slots_pm, '🌆 Afternoon / Evening', avail.slots);

      setHTML('time-slots-container', html || '<p style="color:var(--text-muted);padding:16px 0">No slots available for this date.</p>');
    } catch (e) {
      setHTML('time-slots-container', '<p style="color:var(--danger)">Failed to load slots. Please try again.</p>');
    }
  },

  selectSlot(time) {
    Booking.data.time = time;
    document.getElementById('step2-next').disabled = false;
    Booking.renderSlots(Booking.data.date);
  },

  prefillPatient() {
    const u = Auth.currentUser;
    if (u) {
      const nameEl = document.getElementById('p-name');
      if (nameEl && !nameEl.value) nameEl.value = `${u.first_name} ${u.last_name}`;
      const phoneEl = document.getElementById('p-phone');
      if (phoneEl && !phoneEl.value) phoneEl.value = u.phone || '';
      const dobEl = document.getElementById('p-dob');
      if (dobEl && !dobEl.value) dobEl.value = u.dob || '';
      const genderEl = document.getElementById('p-gender');
      if (genderEl && !genderEl.value) genderEl.value = u.gender || '';
      const bloodEl = document.getElementById('p-blood');
      if (bloodEl && !bloodEl.value) bloodEl.value = u.blood_group || '';
    }
  },

  renderSummary() {
    const { doctor, date, time } = Booking.data;
    const type    = document.getElementById('p-type')?.value  || 'In-Person';
    const reason  = document.getElementById('p-reason')?.value || '—';
    const patient = document.getElementById('p-name')?.value   || '—';
    const tax     = Math.round(doctor.fee * 0.05);
    const total   = doctor.fee + 49 + tax;

    setHTML('confirm-summary', `
      <div class="appt-item" style="cursor:default;margin-bottom:12px">
        <div class="doc-avatar" style="font-size:32px;width:56px;height:56px;border-radius:14px">${doctor.emoji}</div>
        <div class="info">
          <div class="name">${doctor.name}</div>
          <div class="spec">${doctor.specialty} · ${doctor.hospital}</div>
          <div style="color:var(--gold);font-size:13px">★ ${doctor.rating} (${doctor.review_count} reviews)</div>
        </div>
      </div>
      ${sumRow('📅 Date', fmtDate(date))}
      ${sumRow('🕐 Time', time)}
      ${sumRow('🏥 Visit Type', type)}
      ${sumRow('📋 Reason', reason)}
      ${sumRow('👤 Patient', patient)}
    `);

    setHTML('confirm-fee-box', `
      <div class="sum-row"><span class="lbl">Consultation Fee</span><span>${currency(doctor.fee)}</span></div>
      <div class="sum-row"><span class="lbl">Platform Fee</span><span>₹49</span></div>
      <div class="sum-row"><span class="lbl">GST (5%)</span><span>${currency(tax)}</span></div>
      <div class="sum-row"><span class="lbl" style="font-weight:700">Total</span><span style="color:var(--navy)">${currency(total)}</span></div>
    `);
  },

  async confirm() {
    const { doctor, date, time } = Booking.data;
    if (!doctor || !date || !time) { showToast('error','Incomplete booking data'); return; }

    const btn = document.getElementById('confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin-inline">↻</span> Booking…';

    try {
      await Api.appointments.book({
        doctor_id:      doctor.id,
        appt_date:      date,
        appt_time:      time,
        visit_type:     document.getElementById('p-type')?.value || 'In-Person',
        reason:         document.getElementById('p-reason')?.value || '',
        conditions:     document.getElementById('p-conditions')?.value || '',
        medications:    document.getElementById('p-meds')?.value || '',
        patient_name:   document.getElementById('p-name')?.value || '',
        patient_dob:    document.getElementById('p-dob')?.value || '',
        patient_gender: document.getElementById('p-gender')?.value || '',
        patient_blood:  document.getElementById('p-blood')?.value || '',
      });

      showToast('success', '🎉 Appointment booked successfully!');
      App.navigate('appointments', null);
      await Dashboard.loadStats();
    } catch (e) {
      showToast('error', '❌ ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✅ Confirm & Book Appointment';
    }
  }
};

function sumRow(l, v) {
  return `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text-muted)">${l}</span><span style="font-weight:600">${v}</span></div>`;
}

// Page-level initialiser (called when nav to 'book')
async function initBookingPage() { await Booking.initPage(); }
