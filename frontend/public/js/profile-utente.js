// ==========================================
// PROFILO UTENTE - MOBISHARE
// ==========================================

// ===== DOM ELEMENTS =====
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const snackbarElement = document.getElementById("snackbar");

// Profile elements
const userNome = document.getElementById("userNome");
const userCognome = document.getElementById("userCognome");
const userEmail = document.getElementById("userEmail");
const userDataReg = document.getElementById("userDataReg");
const userBalance = document.getElementById("userBalance");
const userStatus = document.getElementById("userStatus");

// Modify profile modal
const modifyProfileBtn = document.getElementById("modifyProfileBtn");
const modifyProfileModal = document.getElementById("modifyProfileModal");
const modalProfileClose = document.getElementById("modalProfileClose");
const modalProfileCancel = document.getElementById("modalProfileCancel");
const modalProfileSave = document.getElementById("modalProfileSave");
const inputNome = document.getElementById("inputNome");
const inputCognome = document.getElementById("inputCognome");

// Modify password modal
const modifyPasswordBtn = document.getElementById("modifyPasswordBtn");
const modifyPasswordModal = document.getElementById("modifyPasswordModal");
const modalPasswordClose = document.getElementById("modalPasswordClose");
const modalPasswordCancel = document.getElementById("modalPasswordCancel");
const modalPasswordSave = document.getElementById("modalPasswordSave");
let currentPassword = document.getElementById("currentPassword");
let newPassword = document.getElementById("newPassword");
let confirmPassword = document.getElementById("confirmPassword");

// ===== USER DATA (GLOBALE) =====
let userData = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadUserProfile();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Toggle sidebar on mobile
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });

  // Modify profile modal
  modifyProfileBtn.addEventListener("click", openModifyProfileModal);
  modalProfileClose.addEventListener("click", closeModifyProfileModal);
  modalProfileCancel.addEventListener("click", closeModifyProfileModal);
  modalProfileSave.addEventListener("click", saveProfileChanges);

  // Modify password modal
  modifyPasswordBtn.addEventListener("click", openModifyPasswordModal);
  modalPasswordClose.addEventListener("click", closeModifyPasswordModal);
  modalPasswordCancel.addEventListener("click", closeModifyPasswordModal);
  modalPasswordSave.addEventListener("click", savePasswordChanges);

  // Close modals on overlay click
  modifyProfileModal.addEventListener("click", (e) => {
    if (
      e.target === modifyProfileModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeModifyProfileModal();
    }
  });

  modifyPasswordModal.addEventListener("click", (e) => {
    if (
      e.target === modifyPasswordModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeModifyPasswordModal();
    }
  });
}

// ===== LOAD USER PROFILE =====
async function loadUserProfile() {
  try {
    const response = await fetch("/users/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      userData = await response.json();
      displayUserProfile();
      loadRideStatistics();
    } else {
      console.error("❌ Errore caricamento profilo:", response.status);
      showSnackbar("Errore nel caricamento del profilo", "error");
    }
  } catch (error) {
    console.error("❌ Errore di connessione:", error);
    showSnackbar("Errore di connessione", "error");
  }
}

// ===== DISPLAY USER PROFILE =====
function displayUserProfile() {
  if (!userData) return;

  // Nome e Cognome
  userNome.textContent = userData.nome || "N/A";
  userCognome.textContent = userData.cognome || "N/A";

  // Email
  userEmail.textContent = userData.email || "N/A";

  // Data registrazione (formato DD/MM/YYYY)
  const dataReg = new Date(userData.data_registrazione);
  const dataFormattata = dataReg.toLocaleDateString("it-IT");
  userDataReg.textContent = dataFormattata;

  // Saldo
  userBalance.textContent = `€ ${parseFloat(userData.saldo || 0).toFixed(2)}`;

  // Stato account
  const statusMap = {
    attivo: "Attivo",
    sospeso: "Sospeso",
    in_attesa_approvazione: "In attesa di approvazione",
    eliminato: "Eliminato",
  };
  userStatus.textContent = statusMap[userData.stato_account] || "N/A";
  userStatus.className = `status-badge status-${userData.stato_account}`;
}

// ===== LOAD RIDE STATISTICS =====
async function loadRideStatistics() {
  try {
    const response = await fetch("/rides/statistics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      const stats = await response.json();

      const vehicleNameCapitalized =
        stats.ultimo_mezzo === "N/A"
          ? "N/A"
          : stats.ultimo_mezzo.charAt(0).toUpperCase() +
            stats.ultimo_mezzo.slice(1);

      document.getElementById("userTotalRides").textContent =
        stats.corse_totali;
      document.getElementById("userLastVehicle").textContent =
        vehicleNameCapitalized;
      document.getElementById(
        "userTotalSpent"
      ).textContent = `€ ${stats.spesa_totale.toFixed(2)}`;
    } else {
      console.warn("⚠️ Errore caricamento statistiche");
    }
  } catch (error) {
    console.error("❌ Errore statistiche:", error);
  }
}

// ===== AGGIORNA NAVBAR =====
function updateNavbar() {
  const userNameNavbar = document.getElementById("userNameNavbar");
  const userInitial = document.getElementById("userInitial");

  if (userNameNavbar && userData) {
    userNameNavbar.textContent = `${userData.nome} ${userData.cognome}`;
  }

  if (userInitial && userData && userData.nome) {
    userInitial.textContent = userData.nome.charAt(0).toUpperCase();
  }
}

// ===== MODIFY PROFILE MODAL =====
function openModifyProfileModal() {
  if (!userData) return;

  inputNome.value = userData.nome || "";
  inputCognome.value = userData.cognome || "";

  // Pulisci errori precedenti
  clearProfileErrors();

  modifyProfileModal.classList.remove("hidden");
}

function closeModifyProfileModal() {
  modifyProfileModal.classList.add("hidden");
  clearProfileErrors();
}

// ===== FUNZIONE PER PULIRE ERRORI =====
function clearProfileErrors() {
  const errorContainer = document.getElementById("profileErrorContainer");
  errorContainer.innerHTML = "";

  // Rimuovi classe errore dai campi
  inputNome.classList.remove("input-error");
  inputCognome.classList.remove("input-error");
}

// ===== FUNZIONE PER MOSTRARE ERRORI =====
function showProfileError(errorMessage, fieldsWithError = []) {
  const errorContainer = document.getElementById("profileErrorContainer");

  // Crea il messaggio di errore
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <span>⚠️ ${errorMessage}</span>
  `;

  errorContainer.appendChild(errorDiv);

  // Aggiungi classe errore ai campi interessati
  fieldsWithError.forEach((field) => {
    if (field === "nome") inputNome.classList.add("input-error");
    if (field === "cognome") inputCognome.classList.add("input-error");
  });
}

async function saveProfileChanges() {
  const nome = inputNome.value.trim();
  const cognome = inputCognome.value.trim();

  // Pulisci errori precedenti
  clearProfileErrors();

  // Validazioni
  let hasError = false;

  if (!nome) {
    showProfileError("Inserisci il nome", ["nome"]);
    hasError = true;
  } else if (nome.length < 2) {
    showProfileError("Nome non valido (minimo 2 caratteri)", ["nome"]);
    hasError = true;
  }

  if (!cognome) {
    showProfileError("Inserisci il cognome", ["cognome"]);
    hasError = true;
  } else if (cognome.length < 2) {
    showProfileError("Cognome non valido (minimo 2 caratteri)", ["cognome"]);
    hasError = true;
  }

  // Se ci sono errori, fermarsi qui
  if (hasError) {
    return;
  }

  // Se passa le validazioni, procedi col salvataggio
  closeModifyProfileModal();
  showSnackbar("Aggiornamento profilo in corso...", "success");

  try {
    const response = await fetch("/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        nome,
        cognome,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      userData = {
        ...userData,
        nome: data.user.nome,
        cognome: data.user.cognome,
      };
      displayUserProfile();
      updateNavbar();
      showSnackbar("✅ Profilo aggiornato con successo", "success");
    } else {
      const errorData = await response.json();
      showSnackbar(errorData.error || "Errore nell'aggiornamento", "error");
    }
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore di connessione", "error");
  }
}

// ===== FUNZIONE PER PULIRE ERRORI PASSWORD =====
function clearPasswordErrors() {
  const errorContainer = document.getElementById("passwordErrorContainer");
  errorContainer.innerHTML = "";

  // Rimuovi classe errore dai campi
  currentPassword.classList.remove("input-error");
  newPassword.classList.remove("input-error");
  confirmPassword.classList.remove("input-error");
}

// ===== FUNZIONE PER MOSTRARE ERRORI PASSWORD =====
function showPasswordError(errorMessage, fieldsWithError = []) {
  const errorContainer = document.getElementById("passwordErrorContainer");

  // Crea il messaggio di errore
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <span>⚠️ ${errorMessage}</span>
  `;

  errorContainer.appendChild(errorDiv);

  // Aggiungi classe errore ai campi interessati
  fieldsWithError.forEach((field) => {
    if (field === "current") currentPassword.classList.add("input-error");
    if (field === "new") newPassword.classList.add("input-error");
    if (field === "confirm") confirmPassword.classList.add("input-error");
  });
}

let passwordToggleSetup = false;

// ===== MODIFY PASSWORD MODAL =====
function openModifyPasswordModal() {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  clearPasswordErrors();

  passwordToggleSetup = false;
  setupPasswordToggle();

  modifyPasswordModal.classList.remove("hidden");
}

function closeModifyPasswordModal() {
  modifyPasswordModal.classList.add("hidden");
  clearPasswordErrors();
  passwordToggleSetup = false;
}

async function savePasswordChanges() {
  const current = currentPassword.value.trim();
  const newPass = newPassword.value.trim();
  const confirm = confirmPassword.value.trim();

  // Pulisci errori precedenti
  clearPasswordErrors();

  // Validazioni
  let hasError = false;

  if (!current) {
    showPasswordError("Inserisci la password attuale", ["current"]);
    hasError = true;
  } else if (!newPass) {
    showPasswordError("Inserisci la nuova password", ["new"]);
    hasError = true;
  } else if (newPass.length < 8) {
    showPasswordError(
      "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)",
      ["new"]
    );
    hasError = true;
  } else if (!hasError && newPass !== confirm) {
    showPasswordError("Le password non corrispondono", ["confirm"]);
    hasError = true;
  }

  // Se ci sono errori, fermarsi qui
  if (hasError) {
    return;
  }

  closeModifyPasswordModal();
  showSnackbar("Aggiornamento password in corso...", "success");

  try {
    const response = await fetch("/users/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        currentPassword: current,
        newPassword: newPass,
      }),
    });

    if (response.ok) {
      showSnackbar("✅ Password modificata con successo", "success");
      // Resetta i campi
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
    } else {
      const errorData = await response.json();
      showSnackbar(errorData.error || "Errore nel cambio password", "error");
    }
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore di connessione", "error");
  }
}

// ===== TOGGLE PASSWORD VISIBILITY =====
function setupPasswordToggle() {
  if (passwordToggleSetup) {
    return;
  }

  const passwordInputs = [currentPassword, newPassword, confirmPassword];

  passwordInputs.forEach((input) => {
    const wrapper = input.closest(".password-input-wrapper");
    const icon = wrapper ? wrapper.querySelector(".password-icon") : null;

    if (!input || !icon) {
      console.warn(`⚠️ Input o icon non trovati per:`, input?.id);
      return;
    }

    // 🔥 RIMUOVI I LISTENER VECCHI CON CLONE
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // Riassegna le variabili globali
    if (input.id === "currentPassword") {
      currentPassword = newInput;
    } else if (input.id === "newPassword") {
      newPassword = newInput;
    } else if (input.id === "confirmPassword") {
      confirmPassword = newInput;
    }

    // Cerca di nuovo wrapper e icon
    const newWrapper = newInput.closest(".password-input-wrapper");
    const newIcon = newWrapper
      ? newWrapper.querySelector(".password-icon")
      : null;

    /**
     * Aggiorna l'icona in base al contenuto dell'input
     */
    function updateIcon() {
      if (newInput.value.length > 0) {
        newIcon.classList.remove("fa-lock");
        newIcon.classList.add("fa-eye");
        newIcon.style.cursor = "pointer";
      } else {
        newIcon.classList.remove("fa-eye");
        newIcon.classList.add("fa-lock");
        newInput.type = "password";
        newIcon.style.cursor = "default";
      }
    }

    // Event: Aggiorna icona quando l'utente digita
    newInput.addEventListener("input", updateIcon);

    // Event: Toggle visibilità al click sull'icona
    newIcon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (newInput.value.length > 0) {
        newInput.type = newInput.type === "password" ? "text" : "password";
      }
    });

    // Inizializza
    updateIcon();
  });

  // Segna come setup
  passwordToggleSetup = true;
}

// ===== UTILITIES =====
function showSnackbar(message, type = "success") {
  snackbarElement.textContent = message;
  snackbarElement.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbarElement.classList.remove("show");
  }, 3000);
}
