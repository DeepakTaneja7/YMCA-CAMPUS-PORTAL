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

// Global array to store data so your Search/Filter bars work instantly
let allDeptComplaints = []; 

// ── FETCH COMPLAINTS FROM DATABASE ──
async function loadComplaints(session) {
  try {
    const response = await fetch(`http://localhost:5000/api/complaints/department/${session.dept}`);
    const data = await response.json();
    
    if (data.success) {
      allDeptComplaints = data.complaints;
      loadStats(); 
      renderComplaints(session); 
    }
  } catch (error) {
    console.error("Error fetching complaints:", error);
    document.getElementById('complaintsContainer').innerHTML = `<p style="color:red; padding:20px;">Could not load complaints from server.</p>`;
  }
}

// ── STATS ─────────────────────────────────────────
function loadStats() {
  const list = allDeptComplaints;
  setText('statTotal',    list.length);
  setText('statPending',  list.filter(c => c.status === 'Pending').length);
  setText('statProgress', list.filter(c => c.status === 'In Progress').length);
  setText('statResolved', list.filter(c => c.status === 'Resolved').length);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── FILTERS & RENDER ──────────────────────────────
let currentFilters = { status: 'All', priority: 'All', search: '' };

function initFilters(session) {
  const statusSel   = document.getElementById('filterStatus');
  const prioritySel = document.getElementById('filterPriority');
  const searchInput = document.getElementById('searchInput');

  if (statusSel)   statusSel.addEventListener('change',   () => { currentFilters.status   = statusSel.value;   renderComplaints(session); });
  if (prioritySel) prioritySel.addEventListener('change', () => { currentFilters.priority = prioritySel.value; renderComplaints(session); });
  if (searchInput) searchInput.addEventListener('input',  () => { currentFilters.search   = searchInput.value.toLowerCase(); renderComplaints(session); });
}

function renderComplaints(session) {
  const container = document.getElementById('complaintsContainer');
  if (!container) return;

  let list = allDeptComplaints;

  if (currentFilters.status !== 'All') list = list.filter(c => c.status === currentFilters.status);
  if (currentFilters.priority !== 'All') list = list.filter(c => c.priority === currentFilters.priority);
  if (currentFilters.search) {
    const s = currentFilters.search;
    list = list.filter(c =>
      (c.title && c.title.toLowerCase().includes(s)) ||
      (c.description && c.description.toLowerCase().includes(s)) ||
      (c.studentName && c.studentName.toLowerCase().includes(s)) ||
      (c.room_no && c.room_no.toLowerCase().includes(s))
    );
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>No complaints found.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(c => {
    // --- PHOTO LOGIC START ---
    let photoHtml = '';
    try {
      // Parse the JSON string from MySQL into a real array
      const photoArray = typeof c.photos === 'string' ? JSON.parse(c.photos) : c.photos;
      
      if (photoArray && photoArray.length > 0) {
        photoHtml = `
          <div class="photo-gallery" style="display:flex; gap:10px; margin-top:12px; overflow-x:auto; padding-bottom:5px;">
            ${photoArray.map(src => `
              <img src="${src}" 
                   alt="Complaint Photo" 
                   style="width:80px; height:80px; object-fit:cover; border-radius:6px; cursor:pointer; border:1px solid var(--gray-200);" 
                   onclick="openPhoto('${src}')">
            `).join('')}
          </div>`;
      }
    } catch (e) {
      console.error("Error displaying photos:", e);
    }
    // --- PHOTO LOGIC END ---

    return `
    <div class="complaint-item" id="ci-${c.id}">
      <div class="complaint-item-top">
        <div>
          <div class="complaint-meta">
            <span class="complaint-id">#${c.id}</span>
            <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
            <span class="badge badge-${(c.priority || 'medium').toLowerCase()}">${escHtml(c.priority)}</span>
          </div>
          <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--gray-400);text-align:right">
          <div>${formatDate(c.created_at)}</div>
        </div>
      </div>

      <div class="complaint-desc">${escHtml(c.description)}</div>

      <div class="complaint-info-row">
        <span class="info-chip"><span class="icon">👤</span>${escHtml(c.studentName || 'Unknown')} (${escHtml(c.student_enrollment)})</span>
        <span class="info-chip"><span class="icon">🎓</span>Year ${escHtml(c.studentYear || 'N/A')}</span>
        <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
        <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
      </div>

      ${photoHtml}

      <div class="complaint-actions" style="border-top:1px solid var(--gray-100);padding-top:12px;margin-top:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-600)">Update Status:</label>
          <select class="status-select" onchange="updateStatus('${c.id}', this.value)">
            ${['Pending', 'In Progress', 'Resolved', 'Rejected'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-outline btn-sm" onclick="openRemarkModal('${c.id}', '${escHtml(c.remark || '')}')">
          ✏️ Add Remark
        </button>
      </div>

      ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:10px"><strong>Your Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
    </div>
  `; }).join('');
}

// ── STATUS & REMARK UPDATES TO DATABASE ───────────
async function updateStatus(id, status) {
  try {
    await fetch(`http://localhost:5000/api/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    // Re-fetch data from DB so UI perfectly syncs
    loadComplaints(getSession());
  } catch (error) {
    alert('Failed to update status.');
  }
}

let _remarkTarget = null;
function openRemarkModal(id, currentRemark) {
  _remarkTarget = id;
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

async function saveRemark() {
  if (!_remarkTarget) return;
  const input = document.getElementById('remarkInput');
  const remark = input ? input.value.trim() : '';
  if (!remark) { alert('Please enter a remark.'); return; }

  try {
    await fetch(`http://localhost:5000/api/complaints/${_remarkTarget}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remark })
    });
    closeRemarkModal();
    loadComplaints(getSession());
  } catch (error) {
    alert('Failed to save remark.');
  }
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
