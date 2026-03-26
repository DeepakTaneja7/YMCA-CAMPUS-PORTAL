// Override sidebar for HOD to also filter by status
document.addEventListener('DOMContentLoaded', () => {
  const session = getSession();
  if (!session) return;

  // Wire up filtered sections
  const pendingContainer  = document.getElementById('pendingContainer');
  const progressContainer = document.getElementById('progressContainer');
  const resolvedContainer = document.getElementById('resolvedContainer');

  function renderFiltered(container, status) {
    if (!container) return;
    let list = getComplaintsByDept(session.dept).filter(c => c.status === status);
    if (!list.length) {
      const labels = { Pending: 'No pending complaints.', 'In Progress': 'No complaints in progress.', Resolved: 'No resolved complaints yet.' };
      container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>${labels[status]||'No complaints.'}</p></div>`;
      return;
    }
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
          <div style="font-size:0.78rem;color:var(--gray-400)">${timeAgo(c.createdAt)}</div>
        </div>
        <div class="complaint-desc">${escHtml(c.description)}</div>
        <div class="complaint-info-row">
          <span class="info-chip"><span class="icon">👤</span>${escHtml(c.studentName)} (${escHtml(c.studentEnrollment)})</span>
          <span class="info-chip"><span class="icon">🚪</span>Room: ${escHtml(c.room)}</span>
          <span class="info-chip"><span class="icon">🔧</span>${escHtml(c.category)}</span>
        </div>
        ${c.remark ? `<div style="background:var(--gray-100);border-radius:8px;padding:10px 14px;font-size:0.84rem;color:var(--gray-600)"><strong>Remark:</strong> ${escHtml(c.remark)}</div>` : ''}
      </div>
    `).join('');
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
});