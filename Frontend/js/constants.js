// ── API BASE URL ──────────────────────────────────
const API_BASE = 'https://ymca-campus-portal.onrender.com';

// ── DEPARTMENTS LIST ──────────────────────────────
const DEPARTMENTS = [
  'Computer Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Bvoc',
  'MBA',
  'Administration',
  'Library',
  'Hostel',
  'Cafeteria',
  'CV Raman Block',
  'Shakuntalam',
  'Auditorium',
  'Other',
];

const ISSUE_CATEGORIES = [
  'Electrical (Fan / Light / AC)',
  'Plumbing (Water / Tap / Drain)',
  'Furniture (Chair / Table / Bench)',
  'Window / Door / Glass',
  'Projector / Smart Board',
  'Computer / Lab Equipment',
  'Ceiling / Wall / Floor',
  'Washroom / Toilet',
  'Lift / Escalator',
  'Network / Wi-Fi',
  'Other',
];

const PRIORITY_LEVELS = ['Low', 'Medium', 'High'];

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

const SLA_HOURS = {
  High: 4,
  Medium: 24,
  Low: 48,
};

// ── SESSION HELPERS ───────────────────────────────
function setSession(user) {
  sessionStorage.setItem('jcbose_session', JSON.stringify(user));
}

function getSession() {
  return JSON.parse(sessionStorage.getItem('jcbose_session') || 'null');
}

function clearSession() {
  sessionStorage.removeItem('jcbose_session');
}

function requireSession(role, redirectTo) {
  const s = getSession();
  if (!s || s.role !== role) {
    window.location.href = redirectTo;
    return null;
  }
  return s;
}

// ── DATE & SLA FORMATTING HELPERS ─────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDurationFromMinutes(totalMins) {
  const absMins = Math.max(1, Math.abs(Math.round(totalMins)));
  const days = Math.floor(absMins / 1440);
  const hours = Math.floor((absMins % 1440) / 60);
  const mins = absMins % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function isComplaintOverdue(c) {
  if (!c) return false;
  if (c.status === 'Resolved' || c.status === 'Rejected') return false;
  if (c.is_overdue !== undefined && c.is_overdue !== null) return Boolean(Number(c.is_overdue));
  if (!c.due_at) return false;
  return new Date(c.due_at).getTime() < Date.now();
}

function getSlaBadgeHtml(c) {
  if (!c) return '';

  if (c.status === 'Resolved') {
    const resolvedTime = c.resolved_at ? ` · ${formatDate(c.resolved_at)}` : '';
    return `<span class="sla-chip sla-chip-resolved">✅ Resolved${resolvedTime}</span>`;
  }

  if (c.status === 'Rejected') {
    return `<span class="sla-chip sla-chip-neutral">Closed</span>`;
  }

  const minsRemaining =
    c.sla_minutes_remaining !== undefined && c.sla_minutes_remaining !== null
      ? Number(c.sla_minutes_remaining)
      : c.due_at
        ? Math.round((new Date(c.due_at).getTime() - Date.now()) / 60000)
        : null;

  if (minsRemaining === null) return '';

  if (minsRemaining < 0) {
    return `<span class="sla-chip sla-chip-overdue">🚨 Overdue by ${formatDurationFromMinutes(minsRemaining)}</span>`;
  }

  if (minsRemaining <= 60) {
    return `<span class="sla-chip sla-chip-warning">⏰ Due in ${formatDurationFromMinutes(minsRemaining)}</span>`;
  }

  return `<span class="sla-chip sla-chip-ok">⏱️ SLA: ${formatDurationFromMinutes(minsRemaining)} left</span>`;
}

function parsePhotosArray(photos) {
  if (!photos) return [];
  try {
    const arr = typeof photos === 'string' ? JSON.parse(photos) : photos;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.form-label').forEach((label) => {
    if (label.innerHTML.includes('*')) {
      label.innerHTML = label.innerHTML.replace(
        '*',
        '<span style="color: #dc2626; font-weight: bold;">*</span>'
      );
    }
  });
});