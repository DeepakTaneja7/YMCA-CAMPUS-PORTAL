// auth.js – Handles login & signup for Student and HOD

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = "alert alert-error";
  el.textContent = msg;
  el.style.display = "block";
}

function showSuccess(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = "alert alert-success";
  el.textContent = msg;
  el.style.display = "block";
}

function hideAlert(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = "none";
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Please wait…" : btn.dataset.label;
}

// ── TOGGLE PASSWORD VISIBILITY ────────────────────
function initPasswordToggles() {
  document.querySelectorAll(".toggle-pwd").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input =
        btn.previousElementSibling || btn.parentElement.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "🙈" : "👁️";
    });
  });
}

// ── STUDENT SIGNUP ────────────────────────────────
function initStudentSignup() {
  const form = document.getElementById("studentSignupForm");
  if (!form) return;

  const enrollmentInput = form.enrollment;
  const emailInput = form.email;
  if (enrollmentInput && emailInput) {
    enrollmentInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, ""); 
      if (this.value.length === 11) {
        emailInput.value = this.value + "@jcboseust.ac.in"; 
      } else {
        emailInput.value = "";
      }
    });
  }

  form.addEventListener('submit', async (e) => { 
    e.preventDefault();
    hideAlert('signupAlert');

    const name        = form.fullName.value.trim();
    const enrollment  = form.enrollment.value.trim();
    const email       = form.email.value.trim().toLowerCase();
    const dept        = form.department.value;
    const year        = form.year.value;
    const phone       = form.phone.value.trim();
    const password    = form.password.value;
    const confirm     = form.confirmPassword.value;

    if (!name || !enrollment || !email || !dept || !year || !password) {
      return showError('signupAlert', 'Please fill all required fields.');
    }
    if (password !== confirm) {
      return showError('signupAlert', 'Passwords do not match.');
    }

    // --- NEW: STRICT PASSWORD VALIDATION ---
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return showError('signupAlert', 'Password must be 8+ characters with uppercase, lowercase, number, and special character.');
    }
    // ---------------------------------------

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name, enrollment, email, department: dept, year, phone, password
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('signupAlert', 'Account created successfully! Redirecting...');
        setTimeout(() => { window.location.href = 'student-login.html'; }, 1500);
      } else {
        showError('signupAlert', data.message);
      }
    } catch (error) {
      showError('signupAlert', 'Server connection failed. Is your backend running?');
    }
  });
}

// ── STUDENT LOGIN ─────────────────────────────────
function initStudentLogin() {
  const form = document.getElementById('studentLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('loginAlert');

    const enrollment = form.enrollment.value.trim();
    const password   = form.password.value;

    if (!enrollment || !password) {
      return showError('loginAlert', 'Please enter both fields.');
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save the user data into the session (using the helper in constants.js)
        setSession({ role: 'student', ...data.user });
        window.location.href = 'student-dashboard.html';
      } else {
        showError('loginAlert', data.message);
      }
    } catch (error) {
      console.error("Connection Error:", error);
      showError('loginAlert', 'Could not connect to server.');
    }
  });
}

// ── HOD SIGNUP ────────────────────────────────────
function initHODSignup() {
  const form = document.getElementById("hodSignupForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("hodSignupAlert");

    const name = form.fullName.value.trim();
    const empId = form.empId.value.trim().toUpperCase();
    const email = form.email.value.trim().toLowerCase();
    const dept = form.department.value;
    const phone = form.phone.value.trim(); 
    const password = form.password.value;
    const confirm = form.confirmPassword.value;
    const code = form.secretCode.value.trim();

    if (!name || !empId || !email || !dept || !phone || !password || !code) {
      return showError("hodSignupAlert", "Please fill all required fields.");
    }
    if (code !== "JCBOSE@HOD2024") {
      return showError("hodSignupAlert", "Invalid HOD registration code.");
    }
    if (password !== confirm) {
      return showError("hodSignupAlert", "Passwords do not match.");
    }

    // --- NEW: STRICT PASSWORD VALIDATION ---
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return showError("hodSignupAlert", "Password must be 8+ characters with uppercase, lowercase, number, and special character.");
    }
    // ---------------------------------------

    try {
      const response = await fetch('http://localhost:5000/api/auth/hod/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId, name, email, department: dept, phone, password })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("hodSignupAlert", "HOD Account created! Redirecting...");
        setTimeout(() => { window.location.href = "hod-login.html"; }, 1500);
      } else {
        showError("hodSignupAlert", data.message);
      }
    } catch (error) {
      showError("hodSignupAlert", "Server connection failed.");
    }
  });
}

// ── HOD LOGIN ─────────────────────────────────────
async function initHODLogin() {
  const form = document.getElementById("hodLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("hodLoginAlert");

    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    try {
      const response = await fetch('http://localhost:5000/api/auth/hod/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // This uses your constants.js helper to save the session
        setSession({ role: "hod", ...data.user });
        window.location.href = "hod-dashboard.html";
      } else {
        showError("hodLoginAlert", data.message);
      }
    } catch (error) {
      showError("hodLoginAlert", "Could not connect to server.");
    }
  });
}

// ── POPULATE DEPARTMENT DROPDOWNS ─────────────────
function populateDeptDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  DEPARTMENTS.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

// ── INIT ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();
  populateDeptDropdown("department");
  initStudentSignup();
  initStudentLogin();
  initHODSignup();
  initHODLogin();
});
