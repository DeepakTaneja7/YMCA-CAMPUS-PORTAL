// student.js – Student Dashboard logic

let uploadedImages = []; // Array of base64 strings

document.addEventListener('DOMContentLoaded', () => {
  const session = requireSession('student', 'student-login.html');
  if (!session) return;

  initTopbar(session);
  initSidebar();
  initComplaintForm(session);
  loadMyComplaints(session);
  initLogout();
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

  // Default: show complaint section
  if (items.length) items[0].click();
}



function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── COMPLAINT FORM ────────────────────────────────
function initComplaintForm(session) {
  // Populate dropdowns
  populateSelect('cat-dept', DEPARTMENTS);
  populateSelect('cat-category', ISSUE_CATEGORIES);
  populateSelect('cat-priority', PRIORITY_LEVELS);

  // Photo upload
  const uploadZone = document.getElementById('uploadZone');
  const fileInput  = document.getElementById('photoInput');

  if (uploadZone) {
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));
  }

  // Form submit
  const form = document.getElementById('complaintForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    submitComplaint(session, form);
  });
}

function populateSelect(id, options) {
  const sel = document.getElementById(id);
  if (!sel) return;
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    sel.appendChild(o);
  });
}

function handleFiles(files) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  files.forEach(file => {
    if (!allowed.includes(file.type)) return;
    if (uploadedImages.length >= 5) return;
    
    // We now push the RAW FILE OBJECT
    uploadedImages.push(file); 
    renderPreviews();
  });
}

function renderPreviews() {
  const grid = document.getElementById('previewGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  uploadedImages.forEach((file, i) => {
    // Create a temporary URL to show the image on the screen before it uploads
    const tempUrl = URL.createObjectURL(file); 
    
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${tempUrl}" alt="Photo ${i+1}">
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

// ── DATABASE COMPLAINT SUBMISSION ──
async function submitComplaint(session, form) {
  const alertEl = document.getElementById('formAlert');
  if (alertEl) alertEl.style.display = 'none';

  const title    = form.title.value.trim();
  const dept     = document.getElementById('cat-dept').value;
  const category = document.getElementById('cat-category').value;
  const priority = document.getElementById('cat-priority').value;
  const block    = form.block.value.trim();
  const room     = form.room.value.trim();
  const desc     = form.desc.value.trim();

  if (!title || !dept || !category || !priority || !room || !desc) {
    if (alertEl) {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = 'Please fill all required fields.';
      alertEl.style.display = 'block';
    }
    return;
  }

  try {
    // 1. Create FormData instead of JSON
    const formData = new FormData();
    formData.append('enrollment', session.enrollment);
    formData.append('title', title);
    formData.append('department', dept);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('building', block);
    formData.append('room', room);
    formData.append('description', desc);

    // 2. Append all the raw files to the 'photos' field
    uploadedImages.forEach(file => {
      formData.append('photos', file);
    });

    // 3. Send the request 
    const response = await fetch('http://localhost:5000/api/complaints', {
      method: 'POST',
      body: formData // Note: No need to set Content-Type; browser does it automatically for FormData
    });

    const data = await response.json();

    if (data.success) {
      if (alertEl) {
        alertEl.className = 'alert alert-success';
        alertEl.textContent = `✅ Complaint filed successfully with photos!`;
        alertEl.style.display = 'block';
      }
      
      form.reset();
      uploadedImages = [];
      renderPreviews();

      setTimeout(() => { loadMyComplaints(session); }, 500);

    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error submitting complaint:', error);
    alert('Could not connect to the database server.');
  }
}

// ── DATABASE: MY COMPLAINTS LIST ────────────────────────────
async function loadMyComplaints(session) {
  const container = document.getElementById('myComplaintsList');
  if (!container) return;

  try {
    // Ask the backend for this specific student's complaints
    const response = await fetch(`http://localhost:5000/api/complaints/student/${session.enrollment}`);
    const data = await response.json();

    if (!data.success || !data.complaints.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>You haven't filed any complaints yet.</p>
        </div>`;
      
      // Update stats to zero
      setText('statTotal', 0);
      setText('statPending', 0);
      setText('statProgress', 0);
      setText('statResolved', 0);
      return;
    }

    const list = data.complaints;

    // Update the Stats at the top of the dashboard
    setText('statTotal',    list.length);
    setText('statPending',  list.filter(c => c.status === 'Pending').length);
    setText('statProgress', list.filter(c => c.status === 'In Progress').length);
    setText('statResolved', list.filter(c => c.status === 'Resolved').length);

    // Build the HTML for the list
    container.innerHTML = list.map(c => `
      <div class="complaint-item">
        <div class="complaint-item-top">
          <div>
            <div class="complaint-meta">
              <span class="complaint-id">#${c.id}</span>
              <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
              <span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span>
            </div>
            <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
          </div>
          <div style="font-size:0.78rem;color:var(--gray-400);white-space:nowrap">${formatDate(c.created_at)}</div>
        </div>
        <div class="complaint-desc">${escHtml(c.description)}</div>
        <div class="complaint-info-row">
          <span class="info-chip"><span class="icon">🏛️</span>${escHtml(c.department)}</span>
          <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
          <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
        </div>
        ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:10px;"><strong>HOD Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
      </div>
    `).join('');

  } catch (error) {
    console.error("Error loading complaints:", error);
    container.innerHTML = `<p style="color:red; text-align:center;">Could not load complaints from database.</p>`;
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
