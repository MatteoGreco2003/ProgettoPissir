// ==========================================
// AUTENTICAZIONE - MOBISHARE
// Modulo per gestire login, registrazione e password reset
// ==========================================

// ===== DOM SELECTORS =====
const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// ===== MODALE SELECTORS =====
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const closeModalBtn = document.querySelector(".close");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const closeForgotBtn = document.getElementById("closeForgotBtn");

/* ========================================================================
   TOGGLE LOGIN / REGISTRAZIONE
   ======================================================================== */

/**
 * Attiva form registrazione e resetta login
 */
registerBtn.addEventListener("click", () => {
  container.classList.add("active");
  resetLoginForm();
});

/**
 * Attiva form login e resetta registrazione
 */
loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
  resetRegisterForm();
});

/* ========================================================================
   FUNZIONI DI RESET FORM
   ======================================================================== */

/**
 * Resetta form login, errori, password visibility e input errors
 */
function resetLoginForm() {
  loginForm.reset();

  // Resetta visibility password
  document.getElementById("loginPassword").type = "password";
  document.querySelectorAll(".login .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  clearErrors("login");
  clearInputErrors("login");
}

/**
 * Resetta form registrazione, errori, password visibility e input errors
 */
function resetRegisterForm() {
  registerForm.reset();

  // Resetta visibility password
  document.getElementById("registerPassword").type = "password";
  document.getElementById("confirmPassword").type = "password";
  document.querySelectorAll(".register .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  clearErrors("register");
  clearInputErrors("register");
}

/**
 * Resetta form recupero password, errori e messaggi di successo
 */
function resetForgotPasswordForm() {
  forgotPasswordForm.reset();
  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";
}

/* ========================================================================
   VALIDAZIONE FORM
   ======================================================================== */

/**
 * Valida formato email
 * @param {string} email - Email da validare
 * @returns {boolean} - True se valida
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida nome (minimo 2 caratteri, solo lettere e spazi)
 * @param {string} name - Nome da validare
 * @returns {boolean} - True se valido
 */
function isValidName(name) {
  const nameRegex =
    /^[a-zA-ZàáäâèéëêìíïîòóöôùúüûñçÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛÑÇ\s]{2,}$/;
  return nameRegex.test(name.trim());
}

/**
 * Valida password
 * Requisiti: minimo 8 caratteri, 1 maiuscola, 1 minuscola, 1 numero
 * @param {string} password - Password da validare
 * @returns {boolean} - True se valida
 */
function isValidPassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
}

/* ========================================================================
   GESTIONE MESSAGGI DI ERRORE
   ======================================================================== */

/**
 * Mostra messaggi di errore nel form
 * @param {string} formType - "login", "register" o "forgotPassword"
 * @param {array} errors - Array di stringhe con errori
 */
function showErrors(formType, errors) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";

  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = error;
    errorContainer.appendChild(errorDiv);
  });
}

/**
 * Mostra errori nella modale recupero password
 * @param {array} errors - Array di messaggi di errore
 */
function showErrorsForgotPass(errors) {
  const errorContainer = document.getElementById("forgotErrors");
  errorContainer.innerHTML = "";

  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = error;
    errorContainer.appendChild(errorDiv);
  });
}

/**
 * Pulisce i messaggi di errore di un form
 * @param {string} formType - "login" o "register"
 */
function clearErrors(formType) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";
}

/**
 * Aggiunge la classe di errore a un input
 * @param {string} inputId - ID dell'input
 */
function addInputError(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.classList.add("input-error");
  }
}

/**
 * Rimuove la classe di errore da tutti gli input del form
 * @param {string} formType - "login" o "register"
 */
function clearInputErrors(formType) {
  const form = formType === "login" ? loginForm : registerForm;
  const inputs = form.querySelectorAll("input");
  inputs.forEach((input) => {
    input.classList.remove("input-error");
  });
}

/* ========================================================================
   TOGGLE PASSWORD VISIBILITY
   ======================================================================== */

/**
 * Gestisce il toggle di visibilità password
 * Cambio icona: lucchetto (vuoto) -> occhio (con testo)
 */
document.querySelectorAll(".toggle-password").forEach((icon) => {
  const inputId = icon.getAttribute("data-input");
  const input = document.getElementById(inputId);

  /**
   * Aggiorna l'icona in base al contenuto dell'input
   */
  function updateIcon() {
    if (input.value.length > 0) {
      if (!icon.classList.contains("fa-eye")) {
        icon.classList.remove("fa-lock");
        icon.classList.add("fa-eye");
        icon.style.cursor = "pointer";
      }
    } else {
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-lock");
      input.type = "password";
      icon.style.cursor = "default";
    }
  }

  // Aggiorna icona quando l'utente digita
  input.addEventListener("input", updateIcon);

  // Toggle visibilità al click (solo se c'è testo)
  icon.addEventListener("click", () => {
    if (input.value.length > 0) {
      input.type = input.type === "password" ? "text" : "password";
    }
  });

  // Inizializza l'icona al caricamento
  updateIcon();
});

/* ========================================================================
   GESTIONE REGISTRAZIONE
   ======================================================================== */

/**
 * Submit form registrazione con validazione client-side
 */
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const firstName = document.getElementById("registerFirstName").value.trim();
  const lastName = document.getElementById("registerLastName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Pulisci errori precedenti
  clearErrors("register");
  clearInputErrors("register");

  let firstError = null;
  let firstErrorInput = null;

  // Validazione 1: Nome
  if (!isValidName(firstName)) {
    firstError = "Nome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerFirstName";
  }
  // Validazione 2: Cognome
  else if (!isValidName(lastName)) {
    firstError = "Cognome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerLastName";
  }
  // Validazione 3: Email
  else if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "registerEmail";
  }
  // Validazione 4: Password
  else if (!isValidPassword(password)) {
    firstError =
      "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)";
    firstErrorInput = "registerPassword";
  }
  // Validazione 5: Conferma password
  else if (password !== confirmPassword) {
    firstError = "Le password non corrispondono";
    firstErrorInput = "confirmPassword";
  }

  if (firstError) {
    showErrors("register", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    registerUser(firstName, lastName, email, password);
  }
});

/**
 * Registra un nuovo utente
 * Invia dati al backend e reindirizza al login
 * @param {string} firstName - Nome utente
 * @param {string} lastName - Cognome utente
 * @param {string} email - Email utente
 * @param {string} password - Password utente
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

      // Reindirizza al login
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
   GESTIONE LOGIN
   ======================================================================== */

/**
 * Submit form login con validazione client-side
 */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  clearErrors("login");
  clearInputErrors("login");

  let firstError = null;
  let firstErrorInput = null;

  // Validazione 1: Email
  if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "loginEmail";
  }
  // Validazione 2: Password
  else if (password.length === 0) {
    firstError = "Inserisci la password";
    firstErrorInput = "loginPassword";
  }

  if (firstError) {
    showErrors("login", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    loginUser(email, password);
  }
});

/**
 * Effettua login comunicando con il backend
 * Salva token e userInfo in localStorage, reindirizza in base al tipo utente
 * @param {string} email - Email utente
 * @param {string} password - Password utente
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
      // Salva token e user info in localStorage
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userType", data.user.stato_account);
      localStorage.setItem("userId", data.user.id_utente);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem(
        "userName",
        `${data.user.nome} ${data.user.cognome}`
      );
      localStorage.setItem("isAdmin", data.user.isAdmin);

      // Reindirizza in base al tipo utente
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
   GESTIONE MODALE RECUPERO PASSWORD
   ======================================================================== */

/**
 * Apri modale recupero password
 */
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordModal.style.display = "flex";
});

/**
 * Chiudi modale cliccando X
 */
closeModalBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

/**
 * Chiudi modale cliccando fuori dal contenuto
 */
window.addEventListener("click", (e) => {
  if (e.target === forgotPasswordModal) {
    forgotPasswordModal.style.display = "none";
    resetForgotPasswordForm();
  }
});

/**
 * Chiudi modale cliccando bottone Annulla
 */
closeForgotBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

/**
 * Richiedi reset password al backend
 * @param {string} email - Email utente
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
      document.getElementById("forgotSuccess").style.display = "block";
      forgotPasswordForm.reset();

      // Chiudi modale automaticamente dopo 3 secondi
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
 * Submit form recupero password
 */
forgotPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();

  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";

  if (!isValidEmail(email)) {
    showErrorsForgotPass(["Email non valida (es: user@example.com)"]);
    return;
  }

  requestPasswordReset(email);
});
