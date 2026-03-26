// ── DEPARTMENTS LIST ──────────────────────────────
const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Applied Sciences',
  'Management Studies',
  'MBA',
  'MCA',
  'Administration',
  'Library',
  'Hostel',
  'Sports Complex',
  'Canteen',
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

// ── DATE FORMATTING HELPERS (You will need these for the dashboard!) ──
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
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