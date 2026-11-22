

let uploadedImages = [];
let currentComplaintsList = [];
let communityComplaintsList = [];

const communityFilters = {
  search: '',
  dept: 'All',
  status: 'Open',
  sort: 'upvotes',
};

document.addEventListener('DOMContentLoaded', () => {
  const session = requireSession('student', 'student-login.html');
  if (!session) return;

  initTopbar(session);
  initSidebar(session);
  initComplaintForm(session);
  initCommunityFilters(session);
  loadMyComplaints(session);
  loadCommunityComplaints(session);
  initLogout();
  initEditModalForm();
});

// ── TOPBAR ────────────────────────────────────────
function initTopbar(session) {
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const avatarEl = document.getElementById('userAvatar');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = session.dept;
  if (avatarEl) avatarEl.textContent = session.name.charAt(0).toUpperCase();
}

// ── SIDEBAR NAV ───────────────────────────────────
function initSidebar(session) {
  const items = document.querySelectorAll('.sidebar-item[data-section]');
  const sections = document.querySelectorAll('.dash-section');

  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((i) => i.classList.remove('active'));
      sections.forEach((s) => (s.style.display = 'none'));
      item.classList.add('active');

      const secName = item.dataset.section;
      const sec = document.getElementById('sec-' + secName);
      if (sec) sec.style.display = 'block';

      if (secName === 'community') loadCommunityComplaints(session);
      if (secName === 'mycomplaints') loadMyComplaints(session);
    });
  });

  if (items.length) items[0].click();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── COMPLAINT FORM ────────────────────────────────
function initComplaintForm(session) {
  populateSelect('cat-dept', DEPARTMENTS);
  populateSelect('cat-category', ISSUE_CATEGORIES);
  populateSelect('cat-priority', PRIORITY_LEVELS);

  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('photoInput');

  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));
  }

  const form = document.getElementById('complaintForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitComplaint(session, form);
  });
}

function populateSelect(id, options) {
  const sel = document.getElementById(id);
  if (!sel) return;
  options.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    sel.appendChild(o);
  });
}

function handleFiles(files) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  files.forEach((file) => {
    if (!allowed.includes(file.type)) return;
    if (uploadedImages.length >= 5) return;
    uploadedImages.push(file);
    renderPreviews();
  });
}

function renderPreviews() {
  const grid = document.getElementById('previewGrid');
  if (!grid) return;
  grid.innerHTML = '';

  uploadedImages.forEach((file, i) => {
    const tempUrl = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${tempUrl}" alt="Photo ${i + 1}">
      <button type="button" class="remove-btn" onclick="removeImage(${i})">✕</button>
    `;
    grid.appendChild(div);
  });

  const hint = document.getElementById('uploadHint');
  if (hint) hint.style.display = uploadedImages.length >= 5 ? 'none' : 'block';
}

function removeImage(i) {
  uploadedImages.splice(i, 1);
  renderPreviews();
}

// ── SUBMIT COMPLAINT ──────────────────────────────
async function submitComplaint(session, form) {
  const alertEl = document.getElementById('formAlert');
  if (alertEl) alertEl.style.display = 'none';

  const title = form.title.value.trim();
  const dept = document.getElementById('cat-dept').value;
  const category = document.getElementById('cat-category').value;
  const priority = document.getElementById('cat-priority').value;
  const block = form.block.value.trim();
  const room = form.room.value.trim();
  const desc = form.desc.value.trim();

  if (!title || !dept || !category || !priority || !room || !desc) {
    if (alertEl) {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = 'Please fill all required fields.';
      alertEl.style.display = 'block';
    }
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
  }

  try {
    const formData = new FormData();
    formData.append('enrollment', session.enrollment);
    formData.append('title', title);
    formData.append('department', dept);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('building', block);
    formData.append('room', room);
    formData.append('description', desc);

    uploadedImages.forEach((file) => {
      formData.append('photos', file);
    });

    const response = await fetch(`${API_BASE}/api/complaints`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      if (alertEl) {
        alertEl.className = 'alert alert-success';
        alertEl.textContent = '✅ Complaint filed successfully!';
        alertEl.style.display = 'block';
      }

      form.reset();
      uploadedImages = [];
      renderPreviews();

      setTimeout(() => {
        loadMyComplaints(session);
        loadCommunityComplaints(session);
      }, 400);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error submitting complaint:', error);
    alert('Could not connect to the database server.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '📩 Submit Complaint';
    }
  }
}

// ── COMMUNITY ISSUES FEED & UPVOTING ──────────────
function initCommunityFilters(session) {
  populateSelect('communityDeptFilter', DEPARTMENTS);

  const searchEl = document.getElementById('communitySearch');
  const deptEl = document.getElementById('communityDeptFilter');
  const statusEl = document.getElementById('communityStatusFilter');
  const sortEl = document.getElementById('communitySort');

  if (searchEl) {
    searchEl.addEventListener('input', () => {
      communityFilters.search = searchEl.value.toLowerCase();
      renderCommunityComplaints(session);
    });
  }
  if (deptEl) {
    deptEl.addEventListener('change', () => {
      communityFilters.dept = deptEl.value;
      renderCommunityComplaints(session);
    });
  }
  if (statusEl) {
    statusEl.addEventListener('change', () => {
      communityFilters.status = statusEl.value;
      renderCommunityComplaints(session);
    });
  }
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      communityFilters.sort = sortEl.value;
      renderCommunityComplaints(session);
    });
  }
}

async function loadCommunityComplaints(session) {
  const container = document.getElementById('communityComplaintsList');
  if (!container) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/complaints/community?enrollment=${encodeURIComponent(session.enrollment)}`
    );
    const data = await response.json();

    if (data.success) {
      communityComplaintsList = data.complaints || [];
      renderCommunityComplaints(session);
    }
  } catch (error) {
    console.error('Error loading community feed:', error);
    container.innerHTML = `<p style="color:red; text-align:center;">Could not load campus issues.</p>`;
  }
}

function renderCommunityComplaints(session) {
  const container = document.getElementById('communityComplaintsList');
  if (!container) return;

  let list = [...communityComplaintsList];

  if (communityFilters.dept !== 'All') {
    list = list.filter((c) => c.department === communityFilters.dept);
  }

  if (communityFilters.status === 'Open') {
    list = list.filter((c) => c.status === 'Pending' || c.status === 'In Progress');
  } else if (communityFilters.status !== 'All') {
    list = list.filter((c) => c.status === communityFilters.status);
  }

  if (communityFilters.search) {
    const s = communityFilters.search;
    list = list.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(s)) ||
        (c.description && c.description.toLowerCase().includes(s)) ||
        (c.room_no && c.room_no.toLowerCase().includes(s)) ||
        (c.building && c.building.toLowerCase().includes(s)) ||
        (c.category && c.category.toLowerCase().includes(s))
    );
  }

  if (communityFilters.sort === 'upvotes') {
    list.sort(
      (a, b) =>
        Number(b.upvote_count || 0) - Number(a.upvote_count || 0) ||
        new Date(b.created_at) - new Date(a.created_at)
    );
  } else if (communityFilters.sort === 'overdue') {
    list.sort(
      (a, b) =>
        Number(isComplaintOverdue(b)) - Number(isComplaintOverdue(a)) ||
        Number(b.upvote_count || 0) - Number(a.upvote_count || 0)
    );
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">✨</div>
        <p>No campus issues match your filter.</p>
      </div>`;
    return;
  }

  container.innerHTML = list
    .map((c) => {
      const overdue = isComplaintOverdue(c);
      const upvoted = Boolean(Number(c.has_upvoted));
      const count = Number(c.upvote_count || 0);
      const isClosed = c.status === 'Resolved' || c.status === 'Rejected';
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
      <div class="complaint-item ${overdue ? 'is-overdue' : ''}">
        <div class="complaint-item-top">
          <div>
            <div class="complaint-meta">
              <span class="complaint-id">#${c.id}</span>
              <span class="badge badge-${statusClass(c.status)}">${escHtml(c.status)}</span>
              <span class="badge badge-${(c.priority || 'medium').toLowerCase()}">${escHtml(c.priority)}</span>
              ${overdue ? '<span class="badge badge-overdue">🚨 Escalated</span>' : ''}
              ${getSlaBadgeHtml(c)}
            </div>
            <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
          </div>
          <div style="font-size:0.78rem;color:var(--gray-400);white-space:nowrap">${formatDate(c.created_at)}</div>
        </div>

        <div class="complaint-desc">${escHtml(c.description)}</div>

        <div class="complaint-info-row">
          <span class="info-chip"><span class="icon">🏛️</span>${escHtml(c.department)}</span>
          ${c.building ? `<span class="info-chip"><span class="icon">🏢</span>${escHtml(c.building)}</span>` : ''}
          <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
          <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
          <span class="info-chip"><span class="icon">👤</span>Reported by ${escHtml(c.studentName || 'Student')}</span>
        </div>

        ${photoHtml}

        <div class="complaint-actions" style="border-top:1px solid var(--gray-100);padding-top:12px;margin-top:4px;justify-content:space-between;">
          <button
            type="button"
            id="upvote-btn-${c.id}"
            class="upvote-btn ${upvoted ? 'upvoted' : ''}"
            onclick="toggleUpvote(${c.id})"
            ${isClosed ? 'disabled title="Closed complaints cannot be upvoted"' : ''}
          >
            <span>${upvoted ? '👍 Upvoted' : '👍 Me Too'}</span>
            <span>(${count})</span>
          </button>
          <span style="font-size:0.78rem;color:var(--gray-400);">
            ${c.student_enrollment === session.enrollment ? '📌 Filed by you' : timeAgo(c.created_at)}
          </span>
        </div>

        ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:4px;"><strong>HOD Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
      </div>`;
    })
    .join('');
}

async function toggleUpvote(complaintId) {
  const session = requireSession('student', 'student-login.html');
  if (!session) return;

  const btn = document.getElementById(`upvote-btn-${complaintId}`);
  if (btn) btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/api/complaints/${complaintId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollment: session.enrollment }),
    });

    const data = await response.json();
    if (!data.success) {
      alert(data.message || 'Could not update upvote.');
      return;
    }

    // Update local community list immediately for snappy UI
    const target = communityComplaintsList.find((c) => c.id === complaintId);
    if (target) {
      target.has_upvoted = data.upvoted ? 1 : 0;
      target.upvote_count = data.upvoteCount;
    }

    // Also keep student's own list synced if they upvoted their own ticket
    const ownTarget = currentComplaintsList.find((c) => c.id === complaintId);
    if (ownTarget) {
      ownTarget.upvote_count = data.upvoteCount;
    }

    renderCommunityComplaints(session);
  } catch (error) {
    console.error('Upvote error:', error);
    alert('Could not connect to server.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── MY COMPLAINTS LIST ────────────────────────────
async function loadMyComplaints(session) {
  const container = document.getElementById('myComplaintsList');
  if (!container) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/complaints/student/${encodeURIComponent(session.enrollment)}`
    );
    const data = await response.json();

    if (!data.success || !data.complaints.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>You haven't filed any complaints yet.</p>
        </div>`;

      setText('statTotal', 0);
      setText('statPending', 0);
      setText('statProgress', 0);
      setText('statResolved', 0);
      return;
    }

    const list = data.complaints;
    currentComplaintsList = list;

    setText('statTotal', list.length);
    setText('statPending', list.filter((c) => c.status === 'Pending').length);
    setText('statProgress', list.filter((c) => c.status === 'In Progress').length);
    setText('statResolved', list.filter((c) => c.status === 'Resolved').length);

    container.innerHTML = list
      .map((c) => {
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
        <div class="complaint-item ${overdue ? 'is-overdue' : ''}">
          <div class="complaint-item-top">
            <div>
              <div class="complaint-meta">
                <span class="complaint-id">#${c.id}</span>
                <span class="badge badge-${statusClass(c.status)}">${escHtml(c.status)}</span>
                <span class="badge badge-${(c.priority || 'medium').toLowerCase()}">${escHtml(c.priority)}</span>
                ${overdue ? '<span class="badge badge-overdue">🚨 Overdue Escalated</span>' : ''}
                <span class="upvote-pill ${upvotes >= 5 ? 'high-support' : ''}">👍 ${upvotes} ${upvotes === 1 ? 'Upvote' : 'Upvotes'}</span>
                ${getSlaBadgeHtml(c)}
              </div>
              <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
            </div>
            <div style="font-size:0.78rem;color:var(--gray-400);white-space:nowrap">${formatDate(c.created_at)}</div>
          </div>

          <div class="complaint-desc">${escHtml(c.description)}</div>

          <div class="complaint-info-row">
            <span class="info-chip"><span class="icon">🏛️</span>${escHtml(c.department)}</span>
            ${c.building ? `<span class="info-chip"><span class="icon">🏢</span>${escHtml(c.building)}</span>` : ''}
            <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
            <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
          </div>

          ${photoHtml}

          ${
            c.status === 'Pending'
              ? `
            <div style="margin-top: 8px; display: flex; gap: 8px; border-top: 1px solid var(--gray-200); padding-top: 12px;">
              <button onclick="openEditModal(${c.id})" class="btn btn-outline" style="padding: 6px 14px; font-size: 0.85rem;">✏️ Edit</button>
              <button onclick="deleteComplaint(${c.id})" class="btn" style="padding: 6px 14px; font-size: 0.85rem; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;">🗑️ Delete</button>
            </div>`
              : ''
          }

          ${
            c.remark
              ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:6px;"><strong>HOD Remark:</strong> ${escHtml(c.remark)}</div>`
              : ''
          }
        </div>`;
      })
      .join('');
  } catch (error) {
    console.error('Error loading complaints:', error);
    container.innerHTML = `<p style="color:red; text-align:center;">Could not load complaints from database.</p>`;
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

// ── STUDENT: DELETE COMPLAINT ─────────────────────
async function deleteComplaint(id) {
  if (!confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;

  const session = requireSession('student', 'student-login.html');

  try {
    const response = await fetch(`${API_BASE}/api/complaints/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollment: session.enrollment }),
    });

    const data = await response.json();
    if (data.success) {
      alert('✅ Complaint deleted successfully.');
      loadMyComplaints(session);
      loadCommunityComplaints(session);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Could not connect to server to delete.');
  }
}

// ── STUDENT: EDIT COMPLAINT ───────────────────────
function openEditModal(id) {
  const complaint = currentComplaintsList.find((c) => c.id === id);
  if (!complaint) return;

  const deptSelect = document.getElementById('edit-dept');
  const catSelect = document.getElementById('edit-category');
  const priSelect = document.getElementById('edit-priority');

  if (deptSelect && catSelect && priSelect) {
    deptSelect.innerHTML = '';
    catSelect.innerHTML = '';
    priSelect.innerHTML = '';
    DEPARTMENTS.forEach((d) => deptSelect.add(new Option(d, d)));
    ISSUE_CATEGORIES.forEach((c) => catSelect.add(new Option(c, c)));
    PRIORITY_LEVELS.forEach((p) => priSelect.add(new Option(p, p)));
  }

  document.getElementById('edit-id').value = complaint.id;
  document.getElementById('edit-title').value = complaint.title;
  if (deptSelect) deptSelect.value = complaint.department;
  if (catSelect) catSelect.value = complaint.category;
  if (priSelect) priSelect.value = complaint.priority;
  document.getElementById('edit-room').value = complaint.room_no;
  document.getElementById('edit-building').value = complaint.building || '';
  document.getElementById('edit-desc').value = complaint.description;

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.style.display = 'none';
}

function initEditModalForm() {
  const editForm = document.getElementById('editComplaintForm');
  if (!editForm) return;

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const session = requireSession('student', 'student-login.html');
    const id = document.getElementById('edit-id').value;
    const btn = document.getElementById('saveEditBtn');

    if (btn) {
      btn.textContent = 'Saving…';
      btn.disabled = true;
    }

    const updatedData = {
      enrollment: session.enrollment,
      title: document.getElementById('edit-title').value.trim(),
      department: document.getElementById('edit-dept').value,
      category: document.getElementById('edit-category').value,
      priority: document.getElementById('edit-priority').value,
      room: document.getElementById('edit-room').value.trim(),
      building: document.getElementById('edit-building').value.trim(),
      description: document.getElementById('edit-desc').value.trim(),
    };

    try {
      const response = await fetch(`${API_BASE}/api/complaints/student/update/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (data.success) {
        closeEditModal();
        alert('✅ Complaint updated successfully!');
        loadMyComplaints(session);
        loadCommunityComplaints(session);
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Server error while updating.');
    } finally {
      if (btn) {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
      }
    }
  });
}