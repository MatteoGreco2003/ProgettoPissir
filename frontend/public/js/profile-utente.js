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
const balanceContainer = document.querySelector(".balance-container");
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

// Loyalty points elements
const userLoyaltyPoints = document.getElementById("userLoyaltyPoints");
const userLoyaltyValue = document.getElementById("userLoyaltyValue");
const loyaltyProgressBar = document.getElementById("loyaltyProgressBar");
const loyaltyProgressText = document.getElementById("loyaltyProgressText");

// ===== RIDES HISTORY ELEMENTS =====
const noRidesMessage = document.getElementById("noRidesMessage");
const ridesHistoryContainer = document.getElementById("ridesHistoryContainer");
const ridesHistoryBody = document.getElementById("ridesHistoryBody");
const ridesPagination = document.getElementById("ridesPagination");

// Pagination state
let currentRidesPage = 0;
const ridesPerPage = 5;
let totalRides = 0;

// ===== USER DATA (GLOBALE) =====
let userData = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadUserProfile();

  // Carica statistiche e cronologia SOLO se NON admin
  if (document.getElementById("userTotalRides")) {
    loadRideStatistics();
    loadRideHistory(ridesPerPage, 0);
  }
});

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
  // Toggle sidebar on mobile
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Close sidebar quando click fuori
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });

  // ===== Modify profile modal events - SOLO SE UTENTE (non admin) =====
  if (modifyProfileBtn) {
    modifyProfileBtn.addEventListener("click", openModifyProfileModal);
  }
  if (modalProfileClose) {
    modalProfileClose.addEventListener("click", closeModifyProfileModal);
  }
  if (modalProfileCancel) {
    modalProfileCancel.addEventListener("click", closeModifyProfileModal);
  }
  if (modalProfileSave) {
    modalProfileSave.addEventListener("click", saveProfileChanges);
  }

  // Close modals on overlay click
  if (modifyProfileModal) {
    modifyProfileModal.addEventListener("click", (e) => {
      if (
        e.target === modifyProfileModal ||
        e.target.classList.contains("modal-overlay")
      ) {
        closeModifyProfileModal();
      }
    });
  }
  // Modify password modal events
  modifyPasswordBtn.addEventListener("click", openModifyPasswordModal);
  modalPasswordClose.addEventListener("click", closeModifyPasswordModal);
  modalPasswordCancel.addEventListener("click", closeModifyPasswordModal);
  modalPasswordSave.addEventListener("click", savePasswordChanges);

  modifyPasswordModal.addEventListener("click", (e) => {
    if (
      e.target === modifyPasswordModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeModifyPasswordModal();
    }
  });
}

// ===== LOAD USER PROFILE FROM API =====
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

// ===== DISPLAY USER PROFILE DATA =====
function displayUserProfile() {
  if (!userData) return;

  // Nome e Cognome
  if (userNome) userNome.textContent = userData.nome || "N/A";
  if (userCognome) userCognome.textContent = userData.cognome || "N/A";

  // Email
  if (userEmail) userEmail.textContent = userData.email || "N/A";

  // Data registrazione formattata DD/MM/YYYY
  if (userDataReg) {
    const dataReg = new Date(userData.data_registrazione);
    const dataFormattata = dataReg.toLocaleDateString("it-IT");
    userDataReg.textContent = dataFormattata;
  }

  // Saldo con stato dinamico
  if (userBalance && balanceContainer) {
    const saldo = parseFloat(userData.saldo || 0);
    userBalance.textContent = `€ ${saldo.toFixed(2)}`;

    // Reset classi stato saldo
    balanceContainer.classList.remove(
      "balance-container--danger",
      "balance-container--warning",
      "balance-container--ok"
    );

    userBalance.classList.remove(
      "balance-amount--danger",
      "balance-amount--warning",
      "balance-amount--ok"
    );

    // Assegna classe in base al saldo
    if (saldo <= 0) {
      balanceContainer.classList.add("balance-container--danger");
      userBalance.classList.add("balance-amount--danger");
    } else if (saldo > 0 && saldo <= 1) {
      balanceContainer.classList.add("balance-container--warning");
      userBalance.classList.add("balance-amount--warning");
    } else {
      balanceContainer.classList.add("balance-container--ok");
      userBalance.classList.add("balance-amount--ok");
    }
  }

  // ✅ PUNTI FEDELTÀ - SOLO SE UTENTE
  if (
    userLoyaltyPoints &&
    userLoyaltyValue &&
    loyaltyProgressBar &&
    loyaltyProgressText
  ) {
    const punti = userData.punti || 0;
    userLoyaltyPoints.textContent = punti;

    // 1 punto = €0.05 di sconto
    const valoreSconto = punti * 0.05;
    userLoyaltyValue.textContent = `€ ${valoreSconto.toFixed(2)}`;

    // Progress bar verso 100 punti (€5,00)
    const percentuale = Math.min((punti / 100) * 100, 100);
    loyaltyProgressBar.style.width = `${percentuale}%`;

    const puntiRimanenti = Math.max(100 - punti, 0);
    loyaltyProgressText.textContent = `${punti} / 100 punti verso € 5,00 di sconto`;
  }

  // Stato account con badge dinamico
  if (userStatus) {
    const statusMap = {
      attivo: "Attivo",
      sospeso: "Sospeso",
      in_attesa_approvazione: "In attesa di approvazione",
      eliminato: "Eliminato",
    };
    userStatus.textContent = statusMap[userData.stato_account] || "N/A";
    userStatus.className = `status-badge status-${userData.stato_account}`;
  }
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

      const vehicleNameFormatted = formatVehicleName(stats.ultimo_mezzo);

      // Aggiorna gli elementi statistici SOLO se esistono
      const userTotalRides = document.getElementById("userTotalRides");
      const userLastVehicle = document.getElementById("userLastVehicle");
      const userTotalSpent = document.getElementById("userTotalSpent");
      const userTotalKm = document.getElementById("userTotalKm");

      if (userTotalRides) userTotalRides.textContent = stats.corse_totali;
      if (userLastVehicle) userLastVehicle.textContent = vehicleNameFormatted;
      if (userTotalSpent)
        userTotalSpent.textContent = `€ ${stats.spesa_totale.toFixed(2)}`;
      if (userTotalKm)
        userTotalKm.textContent = `${(stats.km_totali ?? 0).toFixed(1)} km`;
    } else {
      console.warn("⚠️ Errore caricamento statistiche");
    }
  } catch (error) {
    console.error("❌ Errore statistiche:", error);
  }
}

// ===== LOAD RIDE HISTORY WITH PAGINATION =====
async function loadRideHistory(limit = 10, offset = 0) {
  try {
    const response = await fetch(
      `/rides/history?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      totalRides = data.total;

      // Se ci sono corse, mostra tabella e paginazione
      if (data.rides && data.rides.length > 0) {
        renderRideHistory(data.rides);
        renderRidesPagination(data.total, limit, offset);
        noRidesMessage.classList.add("hidden");
        ridesHistoryContainer.classList.remove("hidden");
      } else {
        // Altrimenti mostra messaggio vuoto
        noRidesMessage.classList.remove("hidden");
        ridesHistoryContainer.classList.add("hidden");
      }
    } else {
      console.warn("⚠️ Errore caricamento cronologia corse");
    }
  } catch (error) {
    console.error("❌ Errore cronologia corse:", error);
  }
}

// ===== RENDER RIDE HISTORY TABLE =====
function renderRideHistory(rides) {
  ridesHistoryBody.innerHTML = rides
    .map((ride) => {
      const dataInizio = new Date(ride.data_ora_inizio).toLocaleDateString(
        "it-IT"
      );
      const vehicleName = formatVehicleName(ride.vehicle.tipo_mezzo);
      const vehicleIcon = getVehicleIcon(ride.vehicle.tipo_mezzo);

      return `
        <tr class="ride-row">
          <td class="ride-data">${dataInizio}</td>
          <td class="ride-mezzo">
            <i class="fas ${vehicleIcon} ride-icon"></i>
            ${vehicleName}
          </td>
          <td class="ride-durata">${ride.durata_minuti} min</td>
          <td class="ride-distanza">${parseFloat(ride.km_percorsi).toFixed(
            1
          )} km</td>
          <td class="ride-costo">€ ${parseFloat(ride.costo_originale).toFixed(
            2
          )}</td>
          <td class="ride-sconto">
            ${
              parseFloat(ride.sconto_punti) > 0
                ? `<span class="discount-badge">-€ ${parseFloat(
                    ride.sconto_punti
                  ).toFixed(2)}</span>`
                : "-"
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

// ===== GET VEHICLE ICON =====
function getVehicleIcon(tipoMezzo) {
  const icons = {
    monopattino: "fa-person-skating",
    bicicletta_muscolare: "fa-bicycle",
    bicicletta_elettrica: "fa-bolt",
  };
  return icons[tipoMezzo] || "fa-bicycle";
}

// ===== RENDER RIDES PAGINATION =====
function renderRidesPagination(total, limit, offset) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.ceil(offset / limit) + 1;

  ridesPagination.innerHTML = "";

  // Container flex per il layout
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-container";

  // Bottone precedente
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn pagination-btn--nav";
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Indietro';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    loadRideHistory(limit, (currentPage - 2) * limit);
  });
  paginationContainer.appendChild(prevBtn);

  // Testo pagina
  const pageTextBtn = document.createElement("button");
  pageTextBtn.className = "pagination-btn pagination-btn--text";
  pageTextBtn.textContent = `Pagina ${currentPage} di ${totalPages}`;
  pageTextBtn.disabled = true;
  paginationContainer.appendChild(pageTextBtn);

  // Bottone successivo
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn pagination-btn--nav";
  nextBtn.innerHTML = 'Avanti <i class="fas fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    loadRideHistory(limit, currentPage * limit);
  });
  paginationContainer.appendChild(nextBtn);

  ridesPagination.appendChild(paginationContainer);
}

// ===== AGGIORNA NAVBAR CON DATI UTENTE =====
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

  if (modifyProfileModal) {
    modifyProfileModal.classList.remove("hidden");
  }
}

function closeModifyProfileModal() {
  if (modifyProfileModal) {
    modifyProfileModal.classList.add("hidden");
  }

  clearProfileErrors();
}

// ===== FUNZIONE PER PULIRE ERRORI PROFILE =====
function clearProfileErrors() {
  const errorContainer = document.getElementById("profileErrorContainer");
  errorContainer.innerHTML = "";

  // Rimuovi classe errore dai campi
  if (inputNome) inputNome.classList.remove("input-error");
  if (inputCognome) inputCognome.classList.remove("input-error");
}

// ===== FUNZIONE PER MOSTRARE ERRORI PROFILE =====
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
    if (field === "nome" && inputNome) inputNome.classList.add("input-error");
    if (field === "cognome" && inputCognome)
      inputCognome.classList.add("input-error");
  });
}

// ===== SAVE PROFILE CHANGES =====
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

// ===== SAVE PASSWORD CHANGES =====
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
     * Se input ha contenuto → mostra occhio (eye)
     * Se input vuoto → mostra lucchetto (lock)
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

// ===== UTILITY FUNCTIONS =====

/**
 * Mostra una snackbar notifica
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo: 'success', 'error', 'warning'
 */
function showSnackbar(message, type = "success") {
  snackbarElement.textContent = message;
  snackbarElement.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbarElement.classList.remove("show");
  }, 3000);
}

/**
 * Formatta il nome del mezzo per la visualizzazione
 * @param {string} tipoMezzo - Tipo di mezzo (monopattino, bicicletta_muscolare, bicicletta_elettrica)
 * @returns {string} Nome formattato del mezzo
 */
function formatVehicleName(tipoMezzo) {
  if (tipoMezzo === "N/A" || !tipoMezzo) {
    return "Nessuno";
  }

  const vehicleNames = {
    monopattino: "Monopattino Elettrico",
    bicicletta_muscolare: "Bicicletta Muscolare",
    bicicletta_elettrica: "Bicicletta Elettrica",
  };

  return vehicleNames[tipoMezzo] || tipoMezzo;
}
