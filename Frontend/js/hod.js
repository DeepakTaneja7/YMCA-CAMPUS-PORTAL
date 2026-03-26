// hod.js – HOD Dashboard logic

document.addEventListener('DOMContentLoaded', () => {
  const session = requireSession('hod', 'hod-login.html');
  if (!session) return;

  initTopbar(session);
  initSidebar();
  loadStats(session);
  loadComplaints(session);
  initLogout();
  initFilters(session);
});

// ── TOPBAR ────────────────────────────────────────
function initTopbar(session) {
  const nameEl   = document.getElementById('userName');
  const roleEl   = document.getElementById('userRole');
  const avatarEl = document.getElementById('userAvatar');
  const deptEl   = document.getElementById('hodDeptLabel');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = 'Head of Department';
  if (avatarEl) avatarEl.textContent = session.name.charAt(0).toUpperCase();
  if (deptEl) deptEl.textContent = session.dept;
}

// ── SIDEBAR NAV ───────────────────────────────────
function initSidebar() {
  const items = document.querySelectorAll('.sidebar-item[data-section]');
  const sections = document.querySelectorAll('.dash-section');

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');
      item.classList.add('active');
      const sec = document.getElementById('sec-' + item.dataset.section);
      if (sec) sec.style.display = 'block';
    });
  });

  if (items.length) items[0].click();
}

// ── STATS ─────────────────────────────────────────
function loadStats(session) {
  const list     = getComplaintsByDept(session.dept);
  const total    = list.length;
  const pending  = list.filter(c => c.status === 'Pending').length;
  const progress = list.filter(c => c.status === 'In Progress').length;
  const resolved = list.filter(c => c.status === 'Resolved').length;

  setText('statTotal',    total);
  setText('statPending',  pending);
  setText('statProgress', progress);
  setText('statResolved', resolved);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── FILTERS ───────────────────────────────────────
let currentFilters = { status: 'All', priority: 'All', search: '' };

function initFilters(session) {
  const statusSel   = document.getElementById('filterStatus');
  const prioritySel = document.getElementById('filterPriority');
  const searchInput = document.getElementById('searchInput');

  if (statusSel)   statusSel.addEventListener('change',   () => { currentFilters.status   = statusSel.value;   renderComplaints(session); });
  if (prioritySel) prioritySel.addEventListener('change', () => { currentFilters.priority  = prioritySel.value; renderComplaints(session); });
  if (searchInput) searchInput.addEventListener('input',  () => { currentFilters.search    = searchInput.value.toLowerCase(); renderComplaints(session); });
}

function loadComplaints(session) {
  renderComplaints(session);
}

function renderComplaints(session) {
  const container = document.getElementById('complaintsContainer');
  if (!container) return;

  let list = getComplaintsByDept(session.dept);

  if (currentFilters.status !== 'All') {
    list = list.filter(c => c.status === currentFilters.status);
  }

  if (currentFilters.priority !== 'All') {
    list = list.filter(c => c.priority === currentFilters.priority);
  }

  if (currentFilters.search) {
    list = list.filter(c =>
      c.title.toLowerCase().includes(currentFilters.search) ||
      c.description.toLowerCase().includes(currentFilters.search) ||
      c.studentName.toLowerCase().includes(currentFilters.search) ||
      c.room.toLowerCase().includes(currentFilters.search)
    );
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>No complaints found for the current filters.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <div class="complaint-item" id="ci-${c.id}">
      <div class="complaint-item-top">
        <div>
          <div class="complaint-meta">
            <span class="complaint-id">#${c.id}</span>
            <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
            <span class="badge badge-${c.priority.toLowerCase()}">${escHtml(c.priority)}</span>
          </div>
          <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--gray-400);white-space:nowrap;text-align:right">
          <div>${timeAgo(c.createdAt)}</div>
          <div style="margin-top:2px">${formatDate(c.createdAt).split(',')[0]}</div>
        </div>
      </div>

      <div class="complaint-desc">${escHtml(c.description)}</div>

      <div class="complaint-info-row">
        <span class="info-chip"><span class="icon">👤</span>${escHtml(c.studentName)} (${escHtml(c.studentEnrollment)})</span>
        <span class="info-chip"><span class="icon">🎓</span>${escHtml(c.studentDept || '')} | Year ${escHtml(c.studentYear || '')}</span>
        <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room)}${c.block ? ' | Block: ' + escHtml(c.block) : ''}</span>
        <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
      </div>

      ${c.photos && c.photos.length ? `
        <div class="photo-gallery">
          ${c.photos.map(src => `<img src="${src}" alt="photo" onclick="openPhoto('${src}')">`).join('')}
        </div>` : ''}

      <div class="complaint-actions" style="border-top:1px solid var(--gray-100);padding-top:12px;margin-top:4px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-600)">Update Status:</label>
          <select class="status-select" onchange="updateStatus('${c.id}', this.value, '${session.dept}')">
            ${STATUS_OPTIONS.map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-outline btn-sm" onclick="openRemarkModal('${c.id}', '${escHtml(c.remark || '')}', '${session.dept}')">
          ✏️ Add Remark
        </button>
        ${c.updatedAt ? `<span style="font-size:0.75rem;color:var(--gray-400)">Updated ${timeAgo(c.updatedAt)}</span>` : ''}
      </div>

      ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600)"><strong>Your Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
    </div>
  `).join('');
}

// ── STATUS UPDATE ─────────────────────────────────
function updateStatus(id, status, dept) {
  updateComplaint(id, { status });
  const session = getSession();
  loadStats(session);
  // Refresh badge inline
  const item = document.getElementById('ci-' + id);
  if (item) {
    const badge = item.querySelector('.badge:not(.badge-low):not(.badge-medium):not(.badge-high)');
    if (badge) {
      badge.className = 'badge badge-' + statusClass(status);
      badge.textContent = status;
    }
  }
}

// ── REMARK MODAL ──────────────────────────────────
let _remarkTarget = null;

function openRemarkModal(id, currentRemark, dept) {
  _remarkTarget = { id, dept };
  const modal = document.getElementById('remarkModal');
  const input = document.getElementById('remarkInput');
  if (input) input.value = decodeHtml(currentRemark);
  if (modal) modal.classList.add('open');
}

function closeRemarkModal() {
  _remarkTarget = null;
  const modal = document.getElementById('remarkModal');
  if (modal) modal.classList.remove('open');
}

function saveRemark() {
  if (!_remarkTarget) return;
  const input = document.getElementById('remarkInput');
  const remark = input ? input.value.trim() : '';
  if (!remark) { alert('Please enter a remark.'); return; }

  updateComplaint(_remarkTarget.id, { remark });
  closeRemarkModal();

  const session = getSession();
  renderComplaints(session);
}

// ── PHOTO LIGHTBOX ────────────────────────────────
function openPhoto(src) {
  const m = document.getElementById('photoModal');
  const img = document.getElementById('modalPhoto');
  if (m && img) { img.src = src; m.classList.add('open'); }
}

function closePhoto() {
  const m = document.getElementById('photoModal');
  if (m) m.classList.remove('open');
}

// ── LOGOUT ────────────────────────────────────────
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', () => { clearSession(); window.location.href = 'index.html'; });
}

// ── HELPERS ───────────────────────────────────────
function statusClass(s) {
  const m = { Pending: 'pending', 'In Progress': 'progress', Resolved: 'resolved', Rejected: 'rejected' };
  return m[s] || 'pending';
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function decodeHtml(str) {
  return String(str || '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}
