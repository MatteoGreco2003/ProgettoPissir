// ==========================================
// HOME UTENTE - MOBISHARE (HOMEPAGE ONLY)
// ==========================================

// ===== DOM ELEMENTS =====
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const snackbarElement = document.getElementById("snackbar");

// ===== MOCK DATA =====
const mockParkings = [
  { id: 1, nome: "Centro", posti_liberi: 8 },
  { id: 2, nome: "Stazione", posti_liberi: 3 },
  { id: 3, nome: "Università", posti_liberi: 0 },
  { id: 4, nome: "Parco Nord", posti_liberi: 12 },
  { id: 5, nome: "Ospedale", posti_liberi: 2 },
  { id: 6, nome: "Mall", posti_liberi: 15 },
];

const mockVehicles = [
  {
    id_mezzo: "BIKE-001",
    tipologia: "Bici Muscolare",
    tipo: "Muscolare",
    stato_batteria: 100,
    km_totali: 150,
    nome_parcheggio: "Centro",
    stato_attuatore: "Prelevabile",
  },
  {
    id_mezzo: "EBIKE-001",
    tipologia: "E-Bike",
    tipo: "Elettrico",
    stato_batteria: 75,
    km_totali: 250,
    nome_parcheggio: "Stazione",
    stato_attuatore: "Prelevabile",
  },
  {
    id_mezzo: "SCOOTER-001",
    tipologia: "Monopattino Elettrico",
    tipo: "Elettrico",
    stato_batteria: 45,
    km_totali: 320,
    nome_parcheggio: "Università",
    stato_attuatore: "Prelevabile",
  },
  {
    id_mezzo: "BIKE-002",
    tipologia: "Bici Muscolare",
    tipo: "Muscolare",
    stato_batteria: 100,
    km_totali: 80,
    nome_parcheggio: "Parco Nord",
    stato_attuatore: "Prelevabile",
  },
  {
    id_mezzo: "EBIKE-002",
    tipologia: "E-Bike",
    tipo: "Elettrico",
    stato_batteria: 20,
    km_totali: 400,
    nome_parcheggio: "Centro",
    stato_attuatore: "Prelevabile",
  },
];

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadHomepageData();
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

  // Tab buttons (filtro mezzi)
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", filterVehicles);
  });
}

// ===== DATA LOADING =====

function loadHomepageData() {
  renderParkings(mockParkings);
  renderVehicles(mockVehicles);
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
      '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--light-text);">Nessun mezzo disponibile</div>';
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

// ===== ACTIONS =====

function filterVehicles(event) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");
  renderVehicles(mockVehicles);
}

function reserveVehicle(vehicleId) {
  console.log(`🚲 Tentativo di prenotazione: ${vehicleId}`);
  showSnackbar("✅ Mezzo prenotato con successo!", "success");
}

// ===== UTILITIES =====

function showSnackbar(message, type = "success") {
  snackbarElement.textContent = message;
  snackbarElement.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbarElement.classList.remove("show");
  }, 3000);
}
