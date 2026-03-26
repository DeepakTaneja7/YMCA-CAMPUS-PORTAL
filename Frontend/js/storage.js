// storage.js – Shared data helpers using localStorage

const DB = {
  STUDENTS: 'jcbose_students',
  HODS:     'jcbose_hods',
  COMPLAINTS: 'jcbose_complaints',
  SESSION:  'jcbose_session',
};

// ── STUDENTS ──────────────────────────────────────
function getStudents() {
  return JSON.parse(localStorage.getItem(DB.STUDENTS) || '[]');
}

function saveStudent(student) {
  const students = getStudents();
  students.push(student);
  localStorage.setItem(DB.STUDENTS, JSON.stringify(students));
}

function findStudent(enrollment, password) {
  return getStudents().find(s => s.enrollment === enrollment && s.password === password);
}

function studentExists(enrollment) {
  return getStudents().some(s => s.enrollment === enrollment);
}

// ── HODs ──────────────────────────────────────────
function getHODs() {
  return JSON.parse(localStorage.getItem(DB.HODS) || '[]');
}

function saveHOD(hod) {
  const hods = getHODs();
  hods.push(hod);
  localStorage.setItem(DB.HODS, JSON.stringify(hods));
}

function findHOD(email, password) {
  return getHODs().find(h => h.email === email && h.password === password);
}

function hodExists(email) {
  return getHODs().some(h => h.email === email);
}

// ── COMPLAINTS ────────────────────────────────────
function getComplaints() {
  return JSON.parse(localStorage.getItem(DB.COMPLAINTS) || '[]');
}

function saveComplaint(complaint) {
  const list = getComplaints();
  complaint.id = 'CMP-' + Date.now();
  complaint.createdAt = new Date().toISOString();
  complaint.status = 'Pending';
  complaint.remark = '';
  complaint.updatedAt = null;
  list.unshift(complaint);
  localStorage.setItem(DB.COMPLAINTS, JSON.stringify(list));
  return complaint.id;
}

function updateComplaint(id, fields) {
  const list = getComplaints();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return false;
  Object.assign(list[idx], fields, { updatedAt: new Date().toISOString() });
  localStorage.setItem(DB.COMPLAINTS, JSON.stringify(list));
  return true;
}

function getComplaintsByStudent(enrollment) {
  return getComplaints().filter(c => c.studentEnrollment === enrollment);
}

function getComplaintsByDept(dept) {
  return getComplaints().filter(c => c.department === dept);
}

// ── SESSION ───────────────────────────────────────
function setSession(user) {
  sessionStorage.setItem(DB.SESSION, JSON.stringify(user));
}

function getSession() {
  return JSON.parse(sessionStorage.getItem(DB.SESSION) || 'null');
}

function clearSession() {
  sessionStorage.removeItem(DB.SESSION);
}

function requireSession(role, redirectTo) {
  const s = getSession();
  if (!s || s.role !== role) {
    window.location.href = redirectTo;
    return null;
  }
  return s;
}

// ── DATE FORMAT ───────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
