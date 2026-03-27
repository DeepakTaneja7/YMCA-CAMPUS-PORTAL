// hod-dashboard.js 

document.addEventListener('DOMContentLoaded', () => {
  const pendingContainer  = document.getElementById('pendingContainer');
  const progressContainer = document.getElementById('progressContainer');
  const resolvedContainer = document.getElementById('resolvedContainer');

  function renderFiltered(container, status) {
    if (!container) return;
    
    // Grab the data from the global array fetched in hod.js
    let list = typeof allDeptComplaints !== 'undefined' ? allDeptComplaints.filter(c => c.status === status) : [];
    
    if (!list.length) {
      const labels = { Pending: 'No pending complaints.', 'In Progress': 'No complaints in progress.', Resolved: 'No resolved complaints yet.' };
      container.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><p>${labels[status]||'No complaints.'}</p></div>`;
      return;
    }
    
    container.innerHTML = list.map(c => {
      // --- THE NEW PHOTO LOGIC ---
      let photoHtml = '';
      try {
        // Parse the JSON array of Cloudinary URLs
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
      // ---------------------------

      return `
      <div class="complaint-item">
        <div class="complaint-item-top">
          <div>
            <div class="complaint-meta">
              <span class="complaint-id">#${c.id}</span>
              <span class="badge badge-${statusClass(c.status)}">${c.status}</span>
              <span class="badge badge-${(c.priority || 'medium').toLowerCase()}">${c.priority}</span>
            </div>
            <div class="complaint-title" style="margin-top:6px">${escHtml(c.title)}</div>
          </div>
          
          <div style="font-size:0.78rem;color:var(--gray-400)">${formatDate(c.created_at)}</div>
        </div>
        
        <div class="complaint-desc">${escHtml(c.description)}</div>
        
        <div class="complaint-info-row">
          <span class="info-chip"><span class="icon">👤</span>${escHtml(c.studentName || 'Student')} (${escHtml(c.student_enrollment)})</span>
          <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room_no)}</span>
          <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
        </div>
        
        ${photoHtml}
        
        ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600);margin-top:10px"><strong>Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
      </div>
    `}).join('');
  }

  // Re-render filtered views when those sections become visible
  document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const s = item.dataset.section;
      if (s === 'pending')    renderFiltered(pendingContainer,  'Pending');
      if (s === 'inprogress') renderFiltered(progressContainer, 'In Progress');
      if (s === 'resolved')   renderFiltered(resolvedContainer, 'Resolved');
    });
  });

  function statusClass(s) {
    return { Pending:'pending', 'In Progress':'progress', Resolved:'resolved', Rejected:'rejected' }[s]||'pending';
  }

  function escHtml(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  
  function formatDate(dateString) {
      if(!dateString) return '';
      const d = new Date(dateString);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
});