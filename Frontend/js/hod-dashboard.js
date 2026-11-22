// hod-dashboard.js – Filtered sidebar views (Overdue, Pending, In Progress, Resolved)

function renderFilteredHodTab(containerId, filterFn, emptyIcon, emptyText) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list =
    typeof allDeptComplaints !== 'undefined'
      ? sortHodList(allDeptComplaints.filter(filterFn), 'smart')
      : [];

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">${emptyIcon}</div>
        <p>${emptyText}</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(buildHodComplaintCard).join('');
}

function renderAllHodTabs() {
  renderFilteredHodTab(
    'overdueContainer',
    (c) => isComplaintOverdue(c),
    '✅',
    'No overdue complaints right now.'
  );
  renderFilteredHodTab(
    'pendingContainer',
    (c) => c.status === 'Pending',
    '⏳',
    'No pending complaints.'
  );
  renderFilteredHodTab(
    'progressContainer',
    (c) => c.status === 'In Progress',
    '🔄',
    'No complaints in progress.'
  );
  renderFilteredHodTab(
    'resolvedContainer',
    (c) => c.status === 'Resolved',
    '✅',
    'No resolved complaints yet.'
  );
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-item[data-section]').forEach((item) => {
    item.addEventListener('click', () => {
      const s = item.dataset.section;
      if (['overdue', 'pending', 'inprogress', 'resolved'].includes(s)) {
        renderAllHodTabs();
      }
    });
  });
});