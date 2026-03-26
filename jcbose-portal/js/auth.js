// auth.js – Handles login & signup for Student and HOD

// ── UTILS ────────────────────────────────────────
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

  // UX Bonus: Real-time number filtering & Auto-fill email
  const enrollmentInput = form.enrollment;
  const emailInput = form.email;
  if (enrollmentInput && emailInput) {
    enrollmentInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, ""); // Strip non-numbers
      if (this.value.length === 11) {
        emailInput.value = this.value + "@jcboseust.ac.in"; // Auto-fill email
      } else {
        emailInput.value = "";
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert("signupAlert");

    const name = form.fullName.value.trim();
    const enrollment = form.enrollment.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const dept = form.department.value;
    const year = form.year.value;
    const phone = form.phone.value.trim();
    const password = form.password.value;
    const confirm = form.confirmPassword.value;

    if (!name || !enrollment || !email || !dept || !year || !password) {
      return showError("signupAlert", "Please fill all required fields.");
    }

    // 1. Enforce exactly 11 digits for enrollment
    if (!/^\d{11}$/.test(enrollment)) {
      return showError(
        "signupAlert",
        "Enrollment number must be exactly 11 digits.",
      );
    }

    // 2. Enforce official university email format matching the enrollment
    const expectedEmail = `${enrollment}@jcboseust.ac.in`;
    if (email !== expectedEmail) {
      return showError(
        "signupAlert",
        `Please use your official university email: ${expectedEmail}`,
      );
    }

    if (password.length < 6) {
      return showError(
        "signupAlert",
        "Password must be at least 6 characters.",
      );
    }

    if (password !== confirm) {
      return showError("signupAlert", "Passwords do not match.");
    }

    if (studentExists(enrollment)) {
      return showError(
        "signupAlert",
        "An account with this enrollment number already exists.",
      );
    }

    saveStudent({
      name,
      enrollment,
      email,
      dept,
      year,
      phone,
      password,
      createdAt: new Date().toISOString(),
    });

    showSuccess(
      "signupAlert",
      "Account created successfully! Redirecting to login…",
    );
    setTimeout(() => {
      window.location.href = "student-login.html";
    }, 1500);
  });
}

// ── STUDENT LOGIN ─────────────────────────────────
function initStudentLogin() {
  const form = document.getElementById('studentLoginForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    hideAlert('loginAlert');

    // Make sure this says form.email.value, NOT form.enrollment.value
    const email    = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      return showError('loginAlert', 'Please enter your university email and password.');
    }

    // Enforce login format: 11 digits + @jcboseust.ac.in
    if (!/^\d{11}@jcboseust\.ac\.in$/.test(email)) {
      return showError('loginAlert', 'Please use your valid 11-digit university email.');
    }

    // Extract the 11-digit enrollment number from the email to check the database
    const enrollment = email.split('@')[0];

    const student = findStudent(enrollment, password);
    if (!student) {
      return showError('loginAlert', 'Invalid email or password. Please try again or register.');
    }

    setSession({ role: 'student', enrollment: student.enrollment, name: student.name, dept: student.dept, year: student.year, email: student.email });
    window.location.href = 'student-dashboard.html';
  });
}

// ── HOD SIGNUP ────────────────────────────────────
function initHODSignup() {
  const form = document.getElementById("hodSignupForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
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

    if (!name || !empId || !email || !dept || !password || !code) {
      return showError("hodSignupAlert", "Please fill all required fields.");
    }

    // Simple secret code for HOD registration (in real app: admin approval)
    if (code !== "JCBOSE@HOD2024") {
      return showError(
        "hodSignupAlert",
        "Invalid HOD registration code. Please contact admin.",
      );
    }

    if (password.length < 6) {
      return showError(
        "hodSignupAlert",
        "Password must be at least 6 characters.",
      );
    }

    if (password !== confirm) {
      return showError("hodSignupAlert", "Passwords do not match.");
    }

    if (hodExists(email)) {
      return showError(
        "hodSignupAlert",
        "An HOD account with this email already exists.",
      );
    }

    saveHOD({
      name,
      empId,
      email,
      dept,
      phone,
      password,
      createdAt: new Date().toISOString(),
    });

    showSuccess(
      "hodSignupAlert",
      "HOD account created successfully! Redirecting to login…",
    );
    setTimeout(() => {
      window.location.href = "hod-login.html";
    }, 1500);
  });
}

// ── HOD LOGIN ─────────────────────────────────────
function initHODLogin() {
  const form = document.getElementById("hodLoginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert("hodLoginAlert");

    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      return showError(
        "hodLoginAlert",
        "Please enter your email and password.",
      );
    }

    const hod = findHOD(email, password);
    if (!hod) {
      return showError("hodLoginAlert", "Invalid email or password.");
    }

    setSession({
      role: "hod",
      email: hod.email,
      name: hod.name,
      dept: hod.dept,
      empId: hod.empId,
    });
    window.location.href = "hod-dashboard.html";
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
