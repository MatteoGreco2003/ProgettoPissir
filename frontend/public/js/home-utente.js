// ==========================================
// HOME UTENTE - MOBISHARE
// ==========================================

// ===== DOM ELEMENTS =====
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const navItems = document.querySelectorAll(".nav-item:not(.logout-btn)");
const logoutBtn = document.getElementById("logoutBtn");
const pageSections = document.querySelectorAll(".page-section");
const snackbarElement = document.getElementById("snackbar");

// ===== USER DATA =====
let userData = {};
let userRides = [];
let transactions = [];

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();
  setupEventListeners();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Toggle sidebar
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Close sidebar when clicking outside
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });

  // Navigation items
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.getAttribute("data-page");
      navigateTo(page);
      sidebar.classList.remove("active");
    });
  });

  // Logout
  logoutBtn.addEventListener("click", logout);

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", filterVehicles);
  });

  // Recharge form
  document
    .getElementById("rechargeForm")
    .addEventListener("submit", rechargeCredit);
}

// ===== NAVIGATION =====
function navigateTo(pageName) {
  // Hide all sections
  pageSections.forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  document.getElementById(pageName).classList.add("active");

  // Update active nav item
  navItems.forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-page") === pageName) {
      item.classList.add("active");
    }
  });

  // Load data based on page
  if (pageName === "profile") {
    loadProfileData();
  } else if (pageName === "credit") {
    loadCreditData();
  } else if (pageName === "homepage") {
    loadHomepageData();
  }
}

// ===== DATA LOADING =====
async function loadUserData() {
  try {
    const response = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) throw new Error("Errore nel caricamento utente");

    userData = await response.json();
    updateUserGreeting();
    loadHomepageData();
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nel caricamento dei dati", "error");
    redirectToLogin();
  }
}

function updateUserGreeting() {
  const userName = document.getElementById("userName");
  userName.textContent = `Ciao, ${userData.nome || "Utente"}`;
}

async function loadHomepageData() {
  try {
    const [parkingsRes, vehiclesRes] = await Promise.all([
      fetch("/api/parkings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
      fetch("/api/vehicles/available", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    ]);

    const parkings = await parkingsRes.json();
    const vehicles = await vehiclesRes.json();

    renderParkings(parkings);
    renderVehicles(vehicles);
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nel caricamento dati", "error");
  }
}

async function loadProfileData() {
  try {
    const response = await fetch("/api/rides/my-rides", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    userRides = await response.json();

    // Popola i campi profilo
    document.getElementById("profileNome").value = userData.nome || "";
    document.getElementById("profileCognome").value = userData.cognome || "";
    document.getElementById("profileEmail").value = userData.email || "";
    document.getElementById("profileId").value = userData.id_utente || "";

    // Calcola statistiche
    const totalDistance = userRides.reduce(
      (sum, ride) => sum + (parseFloat(ride.km_percorsi) || 0),
      0
    );
    const totalSpent = userRides.reduce(
      (sum, ride) => sum + (parseFloat(ride.costo_corsa) || 0),
      0
    );

    document.getElementById("totalRides").textContent = userRides.length;
    document.getElementById("totalDistance").textContent =
      totalDistance.toFixed(1) + " km";
    document.getElementById("totalSpent").textContent =
      "€" + totalSpent.toFixed(2);
    document.getElementById("loyaltyPoints").textContent =
      userData.punti_fedelta || "0";
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nel caricamento profilo", "error");
  }
}

async function loadCreditData() {
  try {
    // Aggiorna credito
    document.getElementById("creditAmount").textContent =
      "€" + (userData.credito || "0.00");

    const creditStatus = document.getElementById("creditStatus");
    if (userData.credito >= 4) {
      creditStatus.className = "credit-badge credit-badge--success";
      creditStatus.innerHTML =
        '<i class="fas fa-check-circle"></i> Credito Sufficiente';
    } else {
      creditStatus.className = "credit-badge credit-badge--warning";
      creditStatus.innerHTML =
        '<i class="fas fa-exclamation-circle"></i> Credito Basso';
    }

    // Carica transazioni
    const response = await fetch("/api/transactions", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    transactions = await response.json();
    renderTransactions(transactions);
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nel caricamento credito", "error");
  }
}

// ===== RENDERING =====
function renderParkings(parkings) {
  const grid = document.getElementById("parkingGrid");
  grid.innerHTML = "";

  parkings.forEach((parking) => {
    const card = document.createElement("div");
    card.className = `parking-card ${
      parking.posti_liberi > 0
        ? "parking-card--available"
        : "parking-card--unavailable"
    }`;

    card.innerHTML = `
      <div class="parking-name">${parking.nome}</div>
      <div class="parking-count ${
        parking.posti_liberi > 0 ? "" : "parking-count--empty"
      }">
        ${parking.posti_liberi || "0"}
      </div>
      <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">posti liberi</div>
    `;

    grid.appendChild(card);
  });
}

function renderVehicles(vehicles) {
  const grid = document.getElementById("vehiclesGrid");
  const activeTab = document
    .querySelector(".tab-btn.active")
    .getAttribute("data-tab");

  const filtered =
    activeTab === "all"
      ? vehicles
      : vehicles.filter((v) => v.tipo === activeTab);

  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-secondary);">Nessun mezzo disponibile</div>';
    return;
  }

  filtered.forEach((vehicle) => {
    const card = document.createElement("div");
    card.className = "vehicle-card";

    const batteryClass =
      vehicle.stato_batteria > 50
        ? "vehicle-battery--good"
        : "vehicle-battery--warning";

    const vehicleIcon = vehicle.tipologia.toLowerCase().includes("monopattino")
      ? "fas fa-scooter"
      : "fas fa-bicycle";

    card.innerHTML = `
      <div class="vehicle-header">
        <i class="vehicle-icon ${vehicleIcon}"></i>
        <div class="vehicle-info">
          <div class="vehicle-id">${vehicle.id_mezzo}</div>
          <div class="vehicle-type">${vehicle.tipologia}</div>
        </div>
        <div class="vehicle-battery ${batteryClass}">
          ${vehicle.stato_batteria}%
        </div>
      </div>
      <div class="vehicle-details">
        <div class="detail-row">
          <span class="detail-label">Tipo:</span>
          <span class="detail-value">${vehicle.tipo}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Km totali:</span>
          <span class="detail-value">${vehicle.km_totali} km</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Parcheggio:</span>
          <span class="detail-value">${vehicle.nome_parcheggio || "N/A"}</span>
        </div>
      </div>
      <div class="vehicle-actions">
        <button class="vehicle-btn" 
          ${
            vehicle.stato_attuatore !== "Prelevabile" ||
            vehicle.stato_batteria < 20
              ? "disabled"
              : ""
          }
          onclick="reserveVehicle('${vehicle.id_mezzo}')">
          <i class="fas fa-unlock"></i>
          ${
            vehicle.stato_attuatore === "Prelevabile"
              ? "Prenota"
              : "Non Disponibile"
          }
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function renderTransactions(transactionsList) {
  const container = document.getElementById("transactionsList");
  container.innerHTML = "";

  if (transactionsList.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">Nessuna transazione</div>';
    return;
  }

  transactionsList.forEach((transaction) => {
    const isCredit = transaction.tipo_transazione === "Ricarica";
    const item = document.createElement("div");
    item.className = "transaction-item";

    item.innerHTML = `
      <div class="transaction-icon ${
        isCredit ? "transaction-icon--credit" : "transaction-icon--debit"
      }">
        <i class="fas ${isCredit ? "fa-plus-circle" : "fa-minus-circle"}"></i>
      </div>
      <div class="transaction-details">
        <div class="transaction-type">${transaction.tipo_transazione}</div>
        <div class="transaction-date">${formatDate(
          transaction.data_transazione
        )}</div>
      </div>
      <div class="transaction-amount ${
        isCredit ? "transaction-amount--credit" : "transaction-amount--debit"
      }">
        ${isCredit ? "+" : "-"}€${Math.abs(
      parseFloat(transaction.importo) || 0
    ).toFixed(2)}
      </div>
    `;

    container.appendChild(item);
  });
}

// ===== ACTIONS =====
function filterVehicles(event) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");

  // Ricarica veicoli
  loadHomepageData();
}

async function reserveVehicle(vehicleId) {
  try {
    if (userData.credito < 1) {
      showSnackbar("Credito insufficiente. Minimo richiesto: 1€", "warning");
      navigateTo("credit");
      return;
    }

    const response = await fetch("/api/rides/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ id_mezzo: vehicleId }),
    });

    if (!response.ok) throw new Error("Errore nella prenotazione");

    showSnackbar("Mezzo prenotato con successo!", "success");
    loadHomepageData();
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nella prenotazione", "error");
  }
}

async function rechargeCredit(event) {
  event.preventDefault();

  const amount = document.getElementById("rechargeAmount").value;
  const method = document.getElementById("paymentMethod").value;

  if (!amount || !method) {
    showSnackbar("Seleziona importo e metodo di pagamento", "warning");
    return;
  }

  try {
    const response = await fetch("/api/transactions/recharge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ importo: amount, metodo_pagamento: method }),
    });

    if (!response.ok) throw new Error("Errore nella ricarica");

    showSnackbar(`Credito ricaricato di €${amount}!`, "success");
    document.getElementById("rechargeForm").reset();
    loadCreditData();
  } catch (error) {
    console.error("Errore:", error);
    showSnackbar("Errore nella ricarica", "error");
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "/";
}

// ===== UTILITIES =====
function showSnackbar(message, type = "success") {
  snackbarElement.textContent = message;
  snackbarElement.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbarElement.classList.remove("show");
  }, 3000);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("it-IT");
}

function redirectToLogin() {
  window.location.href = "/";
}
