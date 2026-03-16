/* doctors.js — Find doctors page + modal */

const DoctorsPage = {
  all: [],
  filtered: [],

  async load() {
    setHTML('doctors-grid', spinner('Finding doctors…'));
    try {
      const data = await Api.doctors.list();
      DoctorsPage.all = data.doctors;
      DoctorsPage.filtered = [...DoctorsPage.all];
      DoctorsPage.render();
    } catch (e) {
      setHTML('doctors-grid', '<p style="color:var(--danger)">Failed to load doctors.</p>');
    }
  },

  render() {
    const docs = DoctorsPage.filtered;
    setHTML('doctors-grid', docs.length
      ? docs.map(d => DoctorsPage.cardHTML(d)).join('')
      : emptyState('🔍','No doctors found','Try adjusting your filters')
    );
  },

  cardHTML(d) {
    return `
      <div class="doctor-card" onclick="DoctorsPage.showModal(${d.id})">
        <div class="doc-header">
          ${d.available ? '<div class="avail-dot"></div>' : ''}
          <div class="doc-avatar-lg">${d.emoji}</div>
        </div>
        <div class="doc-body">
          <div class="doc-name">${d.name}</div>
          <div class="doc-spec">${d.specialty} · ${d.experience} yrs exp</div>
          <div class="doc-stats">
            <div class="doc-stat"><div class="val">${d.experience}+</div><div class="lbl">Years</div></div>
            <div class="doc-stat"><div class="val">${d.review_count}</div><div class="lbl">Reviews</div></div>
            <div class="doc-stat"><div class="val">${currency(d.fee)}</div><div class="lbl">Fee</div></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><span class="stars">★★★★★</span><span class="star-count">${d.rating}</span></div>
            ${d.available
              ? '<span class="badge badge-green">Available</span>'
              : '<span class="badge badge-grey">Unavailable</span>'}
          </div>
          <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;margin-top:12px"
            onclick="event.stopPropagation();DoctorsPage.quickBook(${d.id})">📅 Book Now</button>
        </div>
      </div>
    `;
  },

  search(q) {
    const qi = q.toLowerCase();
    DoctorsPage.filtered = DoctorsPage.all.filter(d =>
      d.name.toLowerCase().includes(qi) || d.specialty.toLowerCase().includes(qi)
    );
    DoctorsPage.render();
    const input = document.getElementById('doc-search-input');
    if (input) input.value = q;
  },

  filterBySpec(v) {
    const q = document.getElementById('doc-search-input')?.value?.toLowerCase() || '';
    DoctorsPage.filtered = DoctorsPage.all.filter(d => {
      const matchQ    = !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
      const matchSpec = !v || d.specialty === v;
      return matchQ && matchSpec;
    });
    DoctorsPage.render();
  },

  filterByAvail(v) {
    const q = document.getElementById('doc-search-input')?.value?.toLowerCase() || '';
    DoctorsPage.filtered = DoctorsPage.all.filter(d => {
      const matchQ     = !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
      const matchAvail = v !== 'available' || d.available;
      return matchQ && matchAvail;
    });
    DoctorsPage.render();
  },

  async showModal(id) {
    openModal('doctor-modal');
    setHTML('modal-doc-info', spinner());
    setHTML('modal-body', '');

    try {
      const data = await Api.doctors.get(id);
      const d = data.doctor;

      setHTML('modal-doc-info', `
        <div style="display:flex;gap:16px;align-items:center">
          <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:32px">${d.emoji}</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:white">${d.name}</div>
            <div style="color:rgba(255,255,255,.65);font-size:14px;margin-top:4px">${d.specialty} · ${d.hospital}</div>
            <div style="display:flex;gap:8px;margin-top:8px">
              ${d.available ? '<span class="badge badge-green">Available Today</span>' : '<span class="badge badge-grey">Unavailable</span>'}
              <span class="badge badge-gold">⭐ ${d.rating}</span>
            </div>
          </div>
        </div>
      `);

      setHTML('modal-body', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
          ${statPill('🎓 Experience', d.experience + '+ Years')}
          ${statPill('👥 Patients', d.review_count + '+')}
          ${statPill('💰 Consult Fee', currency(d.fee))}
        </div>
        <div style="margin-bottom:16px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--navy);margin-bottom:6px">About</div>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.6">${d.bio}</p>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--navy);margin-bottom:6px">Education</div>
          <p style="font-size:13px;color:var(--text-muted)">${d.education}</p>
        </div>
        <div style="margin-bottom:20px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--navy);margin-bottom:8px">Today's Slots</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${[...(d.slots_am||[]), ...(d.slots_pm||[])].map(s =>
              `<span style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600">${s}</span>`
            ).join('')}
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px"
          onclick="closeModal('doctor-modal');DoctorsPage.quickBook(${d.id})">
          📅 Book with ${d.name.split(' ').slice(0,2).join(' ')}
        </button>
      `);
    } catch (e) {
      setHTML('modal-body', '<p style="color:var(--danger)">Failed to load doctor info.</p>');
    }
  },

  quickBook(id) {
    const doc = DoctorsPage.all.find(d => d.id === id) || Booking.doctors.find(d => d.id === id);
    if (doc) {
      Booking.data.doctor = doc;
    }
    App.navigate('book', null);
    Booking.initPage().then(() => {
      if (doc) {
        Booking.data.doctor = doc;
        Booking.renderDocList(Booking.doctors);
        document.getElementById('step1-next').disabled = false;
        Booking.goToStep(2);
      }
    });
  }
};

function statPill(l, v) {
  return `<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border)">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${l}</div>
    <div style="font-size:14px;font-weight:700;color:var(--navy)">${v}</div>
  </div>`;
}
