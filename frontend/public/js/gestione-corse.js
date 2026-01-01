// ===== PAGINATION VARIABLES =====
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let paginationContainer = document.getElementById("paginationContainer");
let currentTab = "today";
let allRides = [];

// ===== DOM ELEMENTS =====
const ridesTableBody = document.getElementById("ridesTableBody");
const snackbar = document.getElementById("snackbar");
const rideDetailModal = document.getElementById("rideDetailModal");
const rideDetailBody = document.getElementById("rideDetailBody");
const modalOverlay = document.querySelector(".modal-overlay");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadRidesToday();
  setupModalClosing();

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    });
  }
});

// ===== SETUP MODAL CLOSING =====
function setupModalClosing() {
  // Chiude cliccando sul background
  if (modalOverlay) {
    modalOverlay.addEventListener("click", closeAllModals);
  }

  // Chiude cliccando sulla X
  const modalClose = document.querySelector(".modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", closeAllModals);
  }

  // Chiude pressando ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });
}

// ===== LOAD RIDES TODAY =====
async function loadRidesToday() {
  try {
    const response = await fetch("/rides/today", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento corse");

    const data = await response.json();
    allRides = (data.rides || []).filter((r) => r.stato_corsa === "completata");

    renderRides();
    renderPagination();
    updateStats("today");
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore caricamento corse", "error");
  }
}

// ===== LOAD COMPLETED RIDES =====
async function loadCompletedRides() {
  try {
    const response = await fetch("/rides/all-completed", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento corse");

    const data = await response.json();
    allRides = data.rides || [];

    renderRides();
    renderPagination();
    updateStats("completed");
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore caricamento corse", "error");
  }
}

// ===== CHANGE TAB =====
function changeTab(tab) {
  currentTab = tab;
  currentPage = 1;

  if (tab === "today") {
    loadRidesToday();
  } else {
    loadCompletedRides();
  }
}

// ===== APPLY FILTERS =====
function applyFilters() {
  currentPage = 1;
  renderRides();
  renderPagination();
}

// ===== GET FILTERED RIDES =====
function getFilteredRides() {
  let filtered = allRides;

  const vehicleFilter = document.getElementById("vehicleFilter").value;
  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();

  if (vehicleFilter) {
    filtered = filtered.filter((r) => r.vehicle?.tipo_mezzo === vehicleFilter);
  }

  if (searchInput) {
    filtered = filtered.filter(
      (r) =>
        r.id_corsa.toString().includes(searchInput) ||
        r.id_utente.toString().includes(searchInput) ||
        r.parkingInizio?.nome.toLowerCase().includes(searchInput) ||
        r.parkingFine?.nome.toLowerCase().includes(searchInput)
    );
  }

  return filtered;
}

// ===== FORMAT VEHICLE TYPE =====
function formatVehicleType(tipo) {
  const map = {
    bicicletta_muscolare: "Bicicletta Muscolare",
    bicicletta_elettrica: "Bicicletta Elettrica",
    monopattino: "Monopattino Elettrico",
  };
  return map[tipo] || tipo;
}

// ===== FORMAT DATE =====
function formatDate(date) {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===== HELPER: Calcola costo effettivo (costo - sconto punti) =====
function calculateEffectiveCost(ride) {
  const costoOriginale = parseFloat(ride.costo || 0);
  const puntiUsati = parseInt(ride.punti_fedeltà_usati || 0);
  const valorePunto = 0.05; // 1 punto = 0.05€
  const sconto = puntiUsati * valorePunto;
  return Math.max(0, costoOriginale - sconto);
}

// ===== RENDER RIDES TABLE =====
function renderRides() {
  const filtered = getFilteredRides();
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRides = filtered.slice(startIndex, endIndex);

  if (filtered.length === 0) {
    ridesTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <p>Nessuna corsa trovata</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  ridesTableBody.innerHTML = paginatedRides
    .map((ride) => {
      const costEffettivo = calculateEffectiveCost(ride);
      return `
    <tr>
      <td><span class="badge">${formatVehicleType(
        ride.vehicle?.tipo_mezzo
      )}</span></td>
      <td>${ride.parkingInizio?.nome || "N/A"}</td>
      <td>${ride.parkingFine?.nome || "N/A"}</td>
      <td>${ride.durata_minuti || "-"} min</td>
      <td><strong>€${costEffettivo.toFixed(2)}</strong></td>
      <td>${parseFloat(ride.km_percorsi || 0).toFixed(2)} km</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewRideDetail(${
            ride.id_corsa
          })" title="Dettagli">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
}

// ===== VIEW RIDE DETAIL =====
async function viewRideDetail(rideId) {
  try {
    const ride = allRides.find((r) => r.id_corsa === rideId);

    if (!ride) {
      showSnackbar("Corsa non trovata", "error");
      return;
    }

    // Formatta nome e cognome
    const nomeUtente = ride.user
      ? `${ride.user.nome} ${ride.user.cognome}`.trim()
      : `Utente #${ride.id_utente}`;

    // Calcola costo effettivo
    const costoOriginale = parseFloat(ride.costo || 0);
    const costEffettivo = calculateEffectiveCost(ride);
    const puntiUsati = parseInt(ride.punti_fedeltà_usati || 0);
    const sconto = costoOriginale - costEffettivo;

    rideDetailBody.innerHTML = `
      <!-- SEZIONE: INFORMAZIONI GENERALI -->
      <div class="detail-section">
        <h3 class="detail-section-title">Informazioni Utente</h3>
        <div class="detail-row">
          <span class="detail-label">Utente:</span>
          <span class="detail-value">${nomeUtente}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tipo Mezzo:</span>
          <span class="detail-value">${formatVehicleType(
            ride.vehicle?.tipo_mezzo
          )}</span>
        </div>
      </div>

      <!-- SEZIONE: PERCORSO -->
      <div class="detail-section">
        <h3 class="detail-section-title">Percorso</h3>
        <div class="detail-row">
          <span class="detail-label">Data e Ora Inizio:</span>
          <span class="detail-value">${formatDate(ride.data_ora_inizio)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data e Ora Fine:</span>
          <span class="detail-value">${
            ride.data_ora_fine ? formatDate(ride.data_ora_fine) : "In corso"
          }</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Parcheggio Inizio:</span>
          <span class="detail-value">${ride.parkingInizio?.nome || "N/A"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Parcheggio Fine:</span>
          <span class="detail-value">${ride.parkingFine?.nome || "N/A"}</span>
        </div>
      </div>

      <!-- SEZIONE: DETTAGLI CORSA -->
      <div class="detail-section">
        <h3 class="detail-section-title">Dettagli Corsa</h3>
        <div class="detail-row">
          <span class="detail-label">Durata:</span>
          <span class="detail-value">${ride.durata_minuti || "-"} minuti</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Distanza:</span>
          <span class="detail-value">${parseFloat(
            ride.km_percorsi || 0
          ).toFixed(2)} km</span>
        </div>
        ${
          sconto > 0
            ? `
        <div class="detail-row">
          <span class="detail-label">Costo Originale:</span>
          <span class="detail-value">€${costoOriginale.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Punti Fedeltà Usati:</span>
          <span class="detail-value">${puntiUsati}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Importo Pagato:</span>
          <span class="detail-value">€${costEffettivo.toFixed(2)}</span>
        </div>
      `
            : `
        <div class="detail-row">
          <span class="detail-label">Costo:</span>
          <span class="detail-value">€${costEffettivo.toFixed(2)}</span>
        </div>
      `
        }
      </div>
    `;

    rideDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore caricamento dettagli", "error");
  }
}

// ===== RENDER PAGINATION =====
function renderPagination() {
  const filtered = getFilteredRides();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let html = `
    <button class="pagination-btn ${currentPage === 1 ? "disabled" : ""}"
      onclick="goToPage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  }>
      <i class="fas fa-chevron-left"></i> Indietro
    </button>
    <div class="pagination-info">Pagina ${currentPage} di ${totalPages}</div>
    <button class="pagination-btn ${
      currentPage === totalPages ? "disabled" : ""
    }"
      onclick="goToPage(${currentPage + 1})" ${
    currentPage === totalPages ? "disabled" : ""
  }>
      Avanti <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationContainer.innerHTML = html;
}

// ===== GO TO PAGE =====
function goToPage(page) {
  const filtered = getFilteredRides();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderRides();
    renderPagination();
    window.scrollTo(0, 0);
  }
}

// ===== UPDATE STATS =====
function updateStats(tab) {
  const rides = allRides;

  if (rides.length === 0) {
    document.getElementById("ridesTodayCount").textContent = "0";
    document.getElementById("revenueToday").textContent = "0.00";
    document.getElementById("avgDuration").textContent = "0 min";
    document.getElementById("totalKm").textContent = "0";

    updateStatsLabels(tab);
    return;
  }

  const totalRides = rides.length;
  // ← CAMBIATO: Usa il costo effettivo
  const totalRevenue = rides.reduce(
    (sum, r) => sum + calculateEffectiveCost(r),
    0
  );
  const avgDuration = Math.round(
    rides.reduce((sum, r) => sum + (r.durata_minuti || 0), 0) / totalRides
  );
  const totalKm = rides.reduce(
    (sum, r) => sum + (parseFloat(r.km_percorsi) || 0),
    0
  );

  document.getElementById("ridesTodayCount").textContent = totalRides;
  document.getElementById("revenueToday").textContent = `${totalRevenue.toFixed(
    2
  )}`;
  document.getElementById("avgDuration").textContent = `${avgDuration} min`;
  document.getElementById("totalKm").textContent = `${totalKm.toFixed(2)}`;

  updateStatsLabels(tab);
}

// ===== UPDATE STATS LABELS =====
function updateStatsLabels(tab) {
  const firstCardLabel = document.querySelectorAll(".stat-label")[0];
  const secondCardLabel = document.querySelectorAll(".stat-label")[1];

  if (tab === "today") {
    firstCardLabel.textContent = "CORSE DI OGGI";
    secondCardLabel.textContent = "RICAVO DI OGGI";
  } else {
    firstCardLabel.textContent = "CORSE";
    secondCardLabel.textContent = "RICAVO";
  }
}

// ===== CLOSE ALL MODALS =====
function closeAllModals() {
  rideDetailModal.classList.add("hidden");
}

// ===== SNACKBAR =====
function showSnackbar(message, type = "success") {
  snackbar.textContent = message;
  snackbar.className = `snackbar show`;
  if (type === "error") snackbar.classList.add("snackbar--error");

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3000);
}
