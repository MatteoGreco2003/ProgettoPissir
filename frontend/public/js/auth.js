// ==========================================
// AUTHENTICATION MODULE - MOBISHARE
// Handles login, registration, password recovery
// Client-side validation and form management
// ==========================================

/* ========================================================================
   DOM SELECTORS
   ======================================================================== */

// Main container and toggle buttons
const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");

// Form references
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// Modal elements
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const closeModalBtn = document.querySelector(".close");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const closeForgotBtn = document.getElementById("closeForgotBtn");

/* ========================================================================
   FORM TOGGLE: LOGIN <-> REGISTRATION
   ======================================================================== */

/**
 * Show registration form and hide login form
 * Resets login form state (clears inputs, errors, password visibility)
 */
registerBtn.addEventListener("click", () => {
  container.classList.add("active");
  resetLoginForm();
});

/**
 * Show login form and hide registration form
 * Resets registration form state (clears inputs, errors, password visibility)
 */
loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
  resetRegisterForm();
});

/* ========================================================================
   FORM RESET FUNCTIONS
   ======================================================================== */

/**
 * Reset login form: clears inputs, errors, password visibility
 */
function resetLoginForm() {
  loginForm.reset();

  // Reset password visibility to hidden (lock icon)
  document.getElementById("loginPassword").type = "password";
  document.querySelectorAll(".login .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  // Clear error messages and input error styling
  clearErrors("login");
  clearInputErrors("login");
}

/**
 * Reset registration form: clears inputs, errors, password visibility
 */
function resetRegisterForm() {
  registerForm.reset();

  // Reset all password fields to hidden
  document.getElementById("registerPassword").type = "password";
  document.getElementById("confirmPassword").type = "password";
  document.querySelectorAll(".register .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  // Clear error messages and input error styling
  clearErrors("register");
  clearInputErrors("register");
}

/**
 * Reset forgot password form: clears inputs, errors, and success message
 */
function resetForgotPasswordForm() {
  forgotPasswordForm.reset();
  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";
}

/* ========================================================================
   VALIDATION FUNCTIONS
   ======================================================================== */

/**
 * Validate email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate name: minimum 2 characters, only letters and spaces
 * Supports Italian accented characters (à, é, ù, etc.)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
function isValidName(name) {
  const nameRegex =
    /^[a-zA-ZàáäâèéëêìíïîòóöôùúüûñçÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛÑÇ\s]{2,}$/;
  return nameRegex.test(name.trim());
}

/**
 * Validate password strength
 * Requirements: min 8 characters, 1 uppercase, 1 lowercase, 1 digit
 * @param {string} password - Password to validate
 * @returns {boolean} - True if meets all requirements
 */
function isValidPassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
}

/* ========================================================================
   ERROR MESSAGE MANAGEMENT
   ======================================================================== */

/**
 * Display validation errors in form
 * @param {string} formType - "login", "register", or "forgotPassword"
 * @param {array} errors - Array of error message strings
 */
function showErrors(formType, errors) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";

  // Create error div for each error message
  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = "⚠️ " + error;
    errorContainer.appendChild(errorDiv);
  });
}

/**
 * Display errors in forgot password modal
 * @param {array} errors - Array of error message strings
 */
function showErrorsForgotPass(errors) {
  const errorContainer = document.getElementById("forgotErrors");
  errorContainer.innerHTML = "";

  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = "⚠️ " + error;
    errorContainer.appendChild(errorDiv);
  });
}

/**
 * Clear all error messages from form
 * @param {string} formType - "login" or "register"
 */
function clearErrors(formType) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";
}

/**
 * Add error styling to an input field
 * @param {string} inputId - ID of input to highlight
 */
function addInputError(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.classList.add("input-error");
  }
}

/**
 * Remove error styling from all inputs in a form
 * @param {string} formType - "login" or "register"
 */
function clearInputErrors(formType) {
  const form = formType === "login" ? loginForm : registerForm;
  const inputs = form.querySelectorAll("input");
  inputs.forEach((input) => {
    input.classList.remove("input-error");
  });
}

/* ========================================================================
   PASSWORD VISIBILITY TOGGLE
   ======================================================================== */

/**
 * Manage password visibility toggle on all password fields
 * Icon changes: lock (empty) -> eye (with text)
 * Click to toggle between password and text type
 */
document.querySelectorAll(".toggle-password").forEach((icon) => {
  const inputId = icon.getAttribute("data-input");
  const input = document.getElementById(inputId);

  /**
   * Update icon based on input value
   * Shows eye icon only when password has been entered
   */
  function updateIcon() {
    if (input.value.length > 0) {
      // Show eye icon when field has text
      if (!icon.classList.contains("fa-eye")) {
        icon.classList.remove("fa-lock");
        icon.classList.add("fa-eye");
        icon.style.cursor = "pointer";
      }
    } else {
      // Show lock icon when field is empty
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-lock");
      input.type = "password";
      icon.style.cursor = "default";
    }
  }

  // Update icon as user types
  input.addEventListener("input", updateIcon);

  // Toggle visibility on click (only if field has text)
  icon.addEventListener("click", () => {
    if (input.value.length > 0) {
      input.type = input.type === "password" ? "text" : "password";
    }
  });

  // Initialize icon on page load
  updateIcon();
});

/* ========================================================================
   REGISTRATION FORM HANDLING
   ======================================================================== */

/**
 * Registration form submission with client-side validation
 * Validates: firstName, lastName, email, password strength, password match
 * On success: sends data to backend and redirects
 */
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get form values
  const firstName = document.getElementById("registerFirstName").value.trim();
  const lastName = document.getElementById("registerLastName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Clear previous errors
  clearErrors("register");
  clearInputErrors("register");

  let firstError = null;
  let firstErrorInput = null;

  // Validation: first name
  if (!isValidName(firstName)) {
    firstError = "Nome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerFirstName";
  }
  // Validation: last name
  else if (!isValidName(lastName)) {
    firstError = "Cognome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerLastName";
  }
  // Validation: email format
  else if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "registerEmail";
  }
  // Validation: password strength
  else if (!isValidPassword(password)) {
    firstError =
      "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)";
    firstErrorInput = "registerPassword";
  }
  // Validation: password confirmation match
  else if (password !== confirmPassword) {
    firstError = "Le password non corrispondono";
    firstErrorInput = "confirmPassword";
  }

  // Display errors if validation failed
  if (firstError) {
    showErrors("register", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    // All validation passed, send registration request
    registerUser(firstName, lastName, email, password);
  }
});

/**
 * Send registration data to backend
 * On success: redirects to login page
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
async function registerUser(firstName, lastName, email, password) {
  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: firstName,
        cognome: lastName,
        email: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      registerForm.reset();
      // Redirect to login after successful registration
      window.location.href = "/";
    } else {
      showErrors("register", [data.error || "Errore di registrazione"]);
    }
  } catch (error) {
    console.error("Errore registrazione:", error);
    showErrors("register", ["Errore di connessione al server"]);
  }
}

/* ========================================================================
   LOGIN FORM HANDLING
   ======================================================================== */

/**
 * Login form submission with client-side validation
 * Validates: email format, password not empty
 * On success: sends credentials to backend, stores token and user data
 */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get form values
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  // Clear previous errors
  clearErrors("login");
  clearInputErrors("login");

  let firstError = null;
  let firstErrorInput = null;

  // Validation: email format
  if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "loginEmail";
  }
  // Validation: password not empty
  else if (password.length === 0) {
    firstError = "Inserisci la password";
    firstErrorInput = "loginPassword";
  }

  // Display errors if validation failed
  if (firstError) {
    showErrors("login", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    // All validation passed, send login request
    loginUser(email, password);
  }
});

/**
 * Send login credentials to backend
 * On success: stores token and user info in localStorage
 * Redirects based on user type (admin or regular user)
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
async function loginUser(email, password) {
  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store authentication data in localStorage
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userType", data.user.stato_account);
      localStorage.setItem("userId", data.user.id_utente);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem(
        "userName",
        `${data.user.nome} ${data.user.cognome}`
      );
      localStorage.setItem("isAdmin", data.user.isAdmin);

      // Redirect based on user role
      if (data.user.isAdmin) {
        window.location.href = "/home-admin";
      } else {
        window.location.href = "/home-utente";
      }
    } else {
      showErrors("login", [data.message || "Credenziali non valide"]);
    }
  } catch (error) {
    console.error("Errore login:", error);
    showErrors("login", ["Errore di connessione al server"]);
  }
}

/* ========================================================================
   FORGOT PASSWORD MODAL
   ======================================================================== */

/**
 * Open forgot password modal
 */
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordModal.style.display = "flex";
});

/**
 * Close modal on X button click
 */
closeModalBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

/**
 * Close modal when clicking outside the modal content
 */
window.addEventListener("click", (e) => {
  if (e.target === forgotPasswordModal) {
    forgotPasswordModal.style.display = "none";
    resetForgotPasswordForm();
  }
});

/**
 * Close modal on Cancel button click
 */
closeForgotBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

/**
 * Send password reset request to backend
 * Shows success message or error, auto-closes modal on success
 * @param {string} email - Email for password recovery
 */
async function requestPasswordReset(email) {
  try {
    const response = await fetch("/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });

    const data = await response.json();

    if (response.ok) {
      // Show success message
      document.getElementById("forgotSuccess").style.display = "block";
      forgotPasswordForm.reset();

      // Auto-close modal after 3 seconds
      setTimeout(() => {
        forgotPasswordModal.style.display = "none";
        document.getElementById("forgotSuccess").style.display = "none";
      }, 3000);
    } else {
      showErrorsForgotPass([data.message || "Errore nella richiesta"]);
    }
  } catch (error) {
    console.error("Errore:", error);
    showErrorsForgotPass(["Errore di connessione al server"]);
  }
}

/**
 * Forgot password form submission
 * Validates email and sends password recovery request
 */
forgotPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();

  // Clear previous messages
  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";

  // Validate email
  if (!isValidEmail(email)) {
    showErrorsForgotPass(["Email non valida (es: user@example.com)"]);
    return;
  }

  // Email valid, request password reset
  requestPasswordReset(email);
});
