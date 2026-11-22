// hod.js – HOD Dashboard logic (with Upvotes & SLA Overdue Escalation)

let allDeptComplaints = [];
let currentFilters = { status: 'All', priority: 'All', search: '', sort: 'smart' };

document.addEventListener('DOMContentLoaded', () => {
  const session = requireSession('hod', 'hod-login.html');
  if (!session) return;

  initTopbar(session);
  initSidebar();
  loadComplaints(session);
  initLogout();
  initFilters(session);
});

// ── TOPBAR ────────────────────────────────────────
function initTopbar(session) {
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const avatarEl = document.getElementById('userAvatar');
  const deptEl = document.getElementById('hodDeptLabel');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = 'Head of Department';
  if (avatarEl) avatarEl.textContent = session.name.charAt(0).toUpperCase();
  if (deptEl) deptEl.textContent = session.dept;
}

// ── SIDEBAR NAV ───────────────────────────────────
function initSidebar() {
  const items = document.querySelectorAll('.sidebar-item[data-section]');
  const sections = document.querySelectorAll('.dash-section');

  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((i) => i.classList.remove('active'));
      sections.forEach((s) => (s.style.display = 'none'));
      item.classList.add('active');
      const sec = document.getElementById('sec-' + item.dataset.section);
      if (sec) sec.style.display = 'block';
    });
  });

  if (items.length) items[0].click();
}

// ── FETCH COMPLAINTS FROM DATABASE ────────────────
async function loadComplaints(session) {
  try {
    const response = await fetch(
      `${API_BASE}/api/complaints/department/${encodeURIComponent(session.dept)}`
    );
    const data = await response.json();

    if (data.success) {
      allDeptComplaints = data.complaints || [];
      loadStats();
      renderComplaints();
      if (typeof renderAllHodTabs === 'function') renderAllHodTabs();
    }
  } catch (error) {
    console.error('Error fetching complaints:', error);
    const container = document.getElementById('complaintsContainer');
    if (container) {
      container.innerHTML = `<p style="color:red; padding:20px;">Could not load complaints from server.</p>`;
    }
  }
}

// ── STATS ─────────────────────────────────────────
function loadStats() {
  const list = allDeptComplaints;
  const overdueCount = list.filter((c) => isComplaintOverdue(c)).length;

  setText('statTotal', list.length);
  setText('statOverdue', overdueCount);
  setText('statPending', list.filter((c) => c.status === 'Pending').length);
  setText('statProgress', list.filter((c) => c.status === 'In Progress').length);
  setText('statResolved', list.filter((c) => c.status === 'Resolved').length);

  const badge = document.getElementById('sidebarOverdueBadge');
  if (badge) {
    badge.textContent = overdueCount;
    badge.style.display = overdueCount > 0 ? 'inline-block' : 'none';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── FILTERS & SORTING ─────────────────────────────
function initFilters() {
  const statusSel = document.getElementById('filterStatus');
  const prioritySel = document.getElementById('filterPriority');
  const searchInput = document.getElementById('searchInput');
  const sortSel = document.getElementById('sortOrder');

  if (statusSel) {
    statusSel.addEventListener('change', () => {
      currentFilters.status = statusSel.value;
      renderComplaints();
    });
  }
  if (prioritySel) {
    prioritySel.addEventListener('change', () => {
      currentFilters.priority = prioritySel.value;
      renderComplaints();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentFilters.search = searchInput.value.toLowerCase();
      renderComplaints();
    });
  }
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      currentFilters.sort = sortSel.value;
      renderComplaints();
    });
  }
}

function priorityWeight(p) {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
}

function sortHodList(list, mode) {
  const copy = [...list];
  if (mode === 'upvotes') {
    return copy.sort(
      (a, b) =>
        Number(b.upvote_count || 0) - Number(a.upvote_count || 0) ||
        Number(isComplaintOverdue(b)) - Number(isComplaintOverdue(a))
    );
  }
  if (mode === 'newest') {
    return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  // Smart Escalation Priority: Overdue -> Priority -> Upvotes -> Newest
  return copy.sort(
    (a, b) =>
      Number(isComplaintOverdue(b)) - Number(isComplaintOverdue(a)) ||
      priorityWeight(b.priority) - priorityWeight(a.priority) ||
      Number(b.upvote_count || 0) - Number(a.upvote_count || 0) ||
      new Date(b.created_at) - new Date(a.created_at)
  );
}

// Shared card builder used by both All Complaints & Filtered Sidebar Tabs
function buildHodComplaintCard(c) {
  const overdue = isComplaintOverdue(c);
  const upvotes = Number(c.upvote_count || 0);
  const photos = parsePhotosArray(c.photos);
  const photoHtml = photos.length
    ? `<div class="photo-gallery">${photos
        .map(
          (src) =>
            `<img src="${escHtml(src)}" alt="Complaint Photo" onclick="openPhoto('${escHtml(src)}')">`
        )
        .join('')}</div>`
    : '';

  return `
    <div class="complaint-item ${overdue ? 'is-overdue' : ''}" id="ci-${c.id}">
      <div class="complaint-item-top">
        <div>
          <div class="complaint-meta">
            <span class="complaint-id">#${c.id}</span>
            <span class="badge badge-${statusClass(c.status)}">${escHtml(c.status)}</span>
            <span class="badge badge-${(c.priority || 'medium').toLowerCase()}">${escHtml(c.priority)}</span>
            ${overdue ? '<span class="badge badge-overdue">🚨 Escalated</span>' : ''}
            <span class="upvote-pill ${upvotes >= 5 ? 'high-support' : ''}">👍 ${upvotes} ${upvotes === 1 ? 'Upvote' : 'Upvotes'}</span>
            ${getSlaBadgeHtml(c)}
          </div>
          <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--gray-400);text-align:right;white-space:nowrap">
          <div>${formatDate(c.created_at)}</div>
        </div>
      </div>

      <div class="complaint-desc">${escHtml(c.description)}</div>

      <div class="complaint-info-row">
        <span class="info-chip"><span class="icon">👤</span>${escHtml(c.studentName || 'Unknown')} (${escHtml(c.student_enrollment)})</span>
        <span class="info-chip"><span class="icon">🎓</span>${escHtml(c.studentYear || 'N/A')}</span>
        ${c.building ? `<span class="info-chip"><span class="icon">🏢</span>${escHtml(c.building)}</span>` : ''}
        <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
        <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
      </div>

      ${photoHtml}

      <div class="complaint-actions" style="border-top:1px solid var(--gray-100);padding-top:12px;margin-top:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-600)">Update Status:</label>
          <select class="status-select" onchange="updateStatus(${c.id}, this.value)">
            ${STATUS_OPTIONS.map(
              (s) => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <button class="btn btn-outline btn-sm" onclick="openRemarkModal(${c.id})">
          ✏️ ${c.remark ? 'Edit Remark' : 'Add Remark'}
        </button>
      </div>

      ${
        c.remark
          ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:6px"><strong>Your Remark:</strong> ${escHtml(c.remark)}</div>`
          : ''
      }
    </div>
  `;
}

function renderComplaints() {
  const container = document.getElementById('complaintsContainer');
  if (!container) return;

  let list = [...allDeptComplaints];

  if (currentFilters.status === 'Overdue') {
    list = list.filter((c) => isComplaintOverdue(c));
  } else if (currentFilters.status !== 'All') {
    list = list.filter((c) => c.status === currentFilters.status);
  }

  if (currentFilters.priority !== 'All') {
    list = list.filter((c) => c.priority === currentFilters.priority);
  }

  if (currentFilters.search) {
    const s = currentFilters.search;
    list = list.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(s)) ||
        (c.description && c.description.toLowerCase().includes(s)) ||
        (c.studentName && c.studentName.toLowerCase().includes(s)) ||
        (c.room_no && c.room_no.toLowerCase().includes(s)) ||
        (c.building && c.building.toLowerCase().includes(s))
    );
  }

  list = sortHodList(list, currentFilters.sort);

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>No complaints found.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(buildHodComplaintCard).join('');
}

// ── STATUS & REMARK UPDATES ───────────────────────
async function updateStatus(id, status) {
  try {
    const res = await fetch(`${API_BASE}/api/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    loadComplaints(getSession());
  } catch (error) {
    console.error(error);
    alert('Failed to update status.');
  }
}

let _remarkTarget = null;
function openRemarkModal(id) {
  const complaint = allDeptComplaints.find((c) => c.id === id);
  _remarkTarget = id;
  const modal = document.getElementById('remarkModal');
  const input = document.getElementById('remarkInput');
  if (input) input.value = complaint && complaint.remark ? complaint.remark : '';
  if (modal) modal.classList.add('open');
}

function closeRemarkModal() {
  _remarkTarget = null;
  const modal = document.getElementById('remarkModal');
  if (modal) modal.classList.remove('open');
}

async function saveRemark() {
  if (!_remarkTarget) return;
  const input = document.getElementById('remarkInput');
  const remark = input ? input.value.trim() : '';
  if (!remark) {
    alert('Please enter a remark.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/complaints/${_remarkTarget}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remark }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    closeRemarkModal();
    loadComplaints(getSession());
  } catch (error) {
    console.error(error);
    alert('Failed to save remark.');
  }
}

// ── PHOTO LIGHTBOX ────────────────────────────────
function openPhoto(src) {
  const m = document.getElementById('photoModal');
  const img = document.getElementById('modalPhoto');
  if (m && img) {
    img.src = src;
    m.classList.add('open');
  }
}

function closePhoto() {
  const m = document.getElementById('photoModal');
  if (m) m.classList.remove('open');
}

// ── LOGOUT ────────────────────────────────────────
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      clearSession();
      window.location.href = 'index.html';
    });
  }
}

// ── HELPERS ───────────────────────────────────────
function statusClass(s) {
  const m = { Pending: 'pending', 'In Progress': 'progress', Resolved: 'resolved', Rejected: 'rejected' };
  return m[s] || 'pending';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}