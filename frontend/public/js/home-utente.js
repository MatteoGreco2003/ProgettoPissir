// ==========================================
// HOME UTENTE - MOBISHARE (HOMEPAGE)
// ==========================================

// ===== STATE MANAGEMENT =====
let state = {
  currentFilter: "all",
  selectedVehicle: null,
  isLoading: false,
  parkings: [],
  vehicles: [],
  activeRideId: null,
  user: {
    credito: 0,
    id: null,
    stato: "attivo",
    punti: 0, // ✅ AGGIUNTO
  },
  map: null,
  markers: {},
};

// ===== DOM ELEMENTS =====
const parkingGrid = document.getElementById("parkingGrid");
const vehiclesGrid = document.getElementById("vehiclesGrid");
const filterButtons = document.querySelectorAll(".filter-btn");
const snackbarElement = document.getElementById("snackbar");
const reservationModal = document.getElementById("reservationModal");
const modalClose = document.getElementById("modalClose");
const confirmReservationBtn = document.getElementById("confirmReservation");
const cancelReservationBtn = document.getElementById("cancelReservation");
const loadingSpinner = document.getElementById("loadingSpinner");

// ===== AUTO REFRESH =====
let refreshInterval = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initMap();
  loadUserProfile(); // ✅ CARICA DATI UTENTE PRIMA DI TUTTO
});

// ===== STOP REFRESH QUANDO CHIUDI LA PAGINA =====
window.addEventListener("beforeunload", () => {
  stopAutoRefresh();
});

// ===== CARICA PROFILO UTENTE DAL BACKEND =====
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
      const userData = await response.json();
      state.user = {
        credito: parseFloat(userData.saldo || 0),
        id: userData.id_utente,
        stato: userData.stato_account || "attivo",
        punti: userData.punti || 0,
      };

      loadHomepageData(); // ✅ Carica dati dopo aver preso l'utente
    } else {
      console.error("❌ Errore caricamento profilo:", response.status);
      showSnackbar("❌ Errore nel caricamento del profilo", "error");
    }
  } catch (error) {
    console.error("❌ Errore di connessione:", error);
    showSnackbar("❌ Errore di connessione", "error");
  }
}

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

  // ✅ Filter buttons (filtro mezzi nella card)
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", filterVehiclesByType);
  });

  // ✅ NUOVO: Select filter per responsive
  const filterSelect = document.getElementById("filterSelect");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      state.currentFilter = e.target.value;
      renderVehicles(state.vehicles);
    });
  }

  // ✅ AGGIORNATO: Modal buttons per reservation
  const reservationModalClose = reservationModal.querySelector(".modal-close");
  reservationModalClose.addEventListener("click", closeReservationModal);
  confirmReservationBtn.addEventListener("click", confirmReservation);
  cancelReservationBtn.addEventListener("click", closeReservationModal);

  // ✅ Chiudi modal cliccando sull'overlay
  reservationModal.addEventListener("click", (e) => {
    if (
      e.target === reservationModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeReservationModal();
    }
  });
}

// ===== MAP INITIALIZATION =====
function initMap() {
  // Centra sulla Novara (provincia di Matteo)
  const defaultLat = 45.4458;
  const defaultLng = 8.6158;

  state.map = L.map("parkingMap", {
    scrollWheelZoom: false,
  }).setView([defaultLat, defaultLng], 13);

  // OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(state.map);
}

// ===== DATA LOADING =====
function loadHomepageData() {
  showLoading(true);

  // Carica parcheggi dal backend
  fetch("/parking/data")
    .then((res) => res.json())
    .then((data) => {
      state.parkings = data.parkings || [];

      // Carica veicoli dal backend
      return fetch("/vehicles/data");
    })
    .then((res) => res.json())
    .then((data) => {
      state.vehicles = data.vehicles || [];

      // Rendering
      renderParkingsOnMap(state.parkings);
      renderParkings(state.parkings);
      renderVehicles(state.vehicles);
      showLoading(false);
      startAutoRefresh(30000); // ✅ SPOSTA QUI
    })
    .catch((error) => {
      console.error("❌ Errore caricamento dati:", error);
      showSnackbar("❌ Errore nel caricamento dei dati", "error");
      showLoading(false);
    });
}

// ===== AUTO REFRESH DATI =====
function startAutoRefresh(interval = 30000) {
  refreshInterval = setInterval(() => {
    const hasActiveRide = state.vehicles.some((v) => v.stato === "in_uso");

    if (hasActiveRide) {
      refreshVehicleData();
    } else {
      stopAutoRefresh();
      setTimeout(() => {
        startAutoRefresh(interval);
      }, 15000);
    }
  }, interval);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function refreshVehicleData() {
  fetch("/vehicles/data")
    .then((res) => res.json())
    .then((data) => {
      state.vehicles = data.vehicles || [];
      renderVehicles(state.vehicles);
      renderParkingsOnMap(state.parkings);

      const hasActiveRide = state.vehicles.some((v) => v.stato === "in_uso");
      if (!hasActiveRide) {
        stopAutoRefresh();
      }
    })
    .catch((error) => {
      console.error("❌ Errore refresh dati:", error);
    });
}

// ===== RENDERING - 1️⃣ MAPPA PARCHEGGI CON LEAFLET =====
function renderParkingsOnMap(parkings) {
  // Rimuovi marker precedenti
  Object.values(state.markers).forEach((marker) => {
    state.map.removeLayer(marker);
  });
  state.markers = {};

  parkings.forEach((parking) => {
    if (!parking.latitudine || !parking.longitudine) return;

    const vehiclesInParking = state.vehicles.filter(
      (v) => v.id_parcheggio === parking.id_parcheggio
    );
    const disponibili = parking.capacita - vehiclesInParking.length;
    const isAvailable = disponibili > 0;

    // Crea icona personalizzata
    const iconColor = isAvailable ? "#21808d" : "#c01527";
    const icon = L.divIcon({
      html: `
        <div style="
          background: ${iconColor};
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          cursor: pointer;
        ">
          ${disponibili}
        </div>
      `,
      className: "custom-div-icon",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    // Crea marker
    const marker = L.marker([parking.latitudine, parking.longitudine], {
      icon: icon,
    }).addTo(state.map);

    // Popup con lista veicoli
    const popupContent = createParkingPopup(parking, vehiclesInParking);
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      maxHeight: 400,
    });

    // Salva riferimento marker
    state.markers[parking.id_parcheggio] = marker;

    // Click per mostrare dettagli
    marker.on("click", () => {
      showParkingDetails(parking, vehiclesInParking);
    });
  });
}

// ===== RENDERING - 1️⃣ PARCHEGGI NELLA GRIGLIA =====
function renderParkings(parkings) {
  parkingGrid.innerHTML = "";

  parkings.forEach((parking) => {
    const card = document.createElement("div");
    const vehiclesInParking = state.vehicles.filter(
      (v) => v.id_parcheggio === parking.id_parcheggio
    );
    const disponibili = parking.capacita - vehiclesInParking.length;
    const isAvailable = disponibili > 0;

    card.className = `parking-card ${
      isAvailable ? "parking-card--available" : "parking-card--unavailable"
    }`;

    card.innerHTML = `
      <div class="parking-name">${parking.nome}</div>
      <div class="parking-count ${!isAvailable ? "parking-count--empty" : ""}">
        ${disponibili}
      </div>
      <div class="parking-label">posti liberi</div>
    `;

    if (isAvailable) {
      card.addEventListener("click", () =>
        showParkingDetails(parking, vehiclesInParking)
      );
    }

    parkingGrid.appendChild(card);
  });
}

function createParkingPopup(parking, vehicles) {
  const disponibili = parking.capacita - vehicles.length;

  let vehiclesList = vehicles
    .map((v) => {
      const statusClass = getVehicleStatusClass(v.stato);
      const batteryClass = getBatteryClass(v.stato_batteria);
      const icon = v.tipo_mezzo === "monopattino" ? "🛴" : "🚲";

      return `
        <div style="
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>${icon} ${v.codice_identificativo}</span>
          <span class="vehicle-status ${statusClass}">${formatVehicleStatus(
        v.stato
      )}</span>
          <span class="battery-badge ${batteryClass}">${
        v.stato_batteria
      }%</span>
        </div>
      `;
    })
    .join("");

  if (vehicles.length === 0) {
    vehiclesList = `
      <div style="padding: 12px; text-align: center; color: #999;">
        Nessun mezzo disponibile
      </div>
    `;
  }

  return `
    <div style="padding: 12px; min-width: 280px;">
      <h3 style="margin: 0 0 8px 0; color: #135482;">
        <i class="fas fa-map-marker-alt"></i> ${parking.nome}
      </h3>
      <div style="
        background: #f5f5f5;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 12px;
      ">
        <div style="display: flex; justify-content: space-between;">
          <span><strong>Capacità:</strong> ${parking.capacita}</span>
          <span><strong>Occupati:</strong> ${vehicles.length}</span>
          <span><strong>Disponibili:</strong> ${disponibili}</span>
        </div>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #666;">
          Mezzi in parcheggio:
        </div>
        ${vehiclesList}
      </div>
    </div>
  `;
}

function getVehicleStatusClass(stato) {
  const statusMap = {
    disponibile: "status-available",
    in_uso: "status-in-use",
    in_manutenzione: "status-maintenance",
  };
  return statusMap[stato] || "status-available";
}

function getBatteryClass(batteria) {
  if (batteria >= 50) return "battery-good";
  if (batteria >= 20) return "battery-warning";
  return "battery-critical";
}

// ===== RENDERING - 3️⃣ LISTA MEZZI =====
function renderVehicles(vehicles) {
  const filtered = getVehiclesByType(state.currentFilter);
  vehiclesGrid.innerHTML = "";

  if (filtered.length === 0) {
    vehiclesGrid.innerHTML = `
      <div class="no-vehicles" style="
        grid-column: 1/-1;
        padding: 20px 20px;
        text-align: center;
        color: var(--light-text);
      ">
        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
        <p style="margin: 0; font-size: 16px; font-weight: 500;">
          Nessun mezzo disponibile in questa categoria
        </p>
      </div>
    `;
    return;
  }

  filtered.forEach((vehicle) => {
    const card = createVehicleCard(vehicle);
    vehiclesGrid.appendChild(card);
  });
}

function createVehicleCard(vehicle) {
  const card = document.createElement("div");
  card.className = "vehicle-card";

  // Determina classe batteria
  let batteryClass = "vehicle-battery--good";
  if (vehicle.stato_batteria < 20) {
    batteryClass = "vehicle-battery--critical";
  } else if (vehicle.stato_batteria < 50) {
    batteryClass = "vehicle-battery--warning";
  }

  // Icona mezzo e tipo visualizzato
  let vehicleIcon = "fas fa-bicycle";
  let vehicleLabel = "Bicicletta Muscolare";

  if (vehicle.tipo_mezzo === "monopattino") {
    vehicleIcon = "fas fa-person-skating";
    vehicleLabel = "Monopattino Elettrico";
  } else if (vehicle.tipo_mezzo === "bicicletta_elettrica") {
    vehicleIcon = "fas fa-bolt";
    vehicleLabel = "Bicicletta Elettrica";
  }

  // Disabilitazione
  const isDisabled =
    vehicle.stato !== "disponibile" || vehicle.stato_batteria < 20;
  const buttonText =
    vehicle.stato === "disponibile" ? "Prenota" : "Non Disponibile";

  const lockIcon = isDisabled ? "fas fa-lock" : "fas fa-lock-open";

  // Cerca il parcheggio associato
  const parking = state.parkings.find(
    (p) => p.id_parcheggio === vehicle.id_parcheggio
  );

  // ✅ NUOVO: Nascondi batteria se bicicletta muscolare
  const showBattery = vehicle.tipo_mezzo !== "bicicletta_muscolare";
  const batteryHTML = showBattery
    ? `<div class="vehicle-battery ${batteryClass}">
        <i class="fas fa-bolt"></i>
        ${vehicle.stato_batteria}%
      </div>`
    : "";

  card.innerHTML = `
    <div class="vehicle-header">
      <i class="vehicle-icon ${vehicleIcon} ${
    vehicle.tipo_mezzo === "monopattino" ? "scooter" : ""
  }"></i>
      <div class="vehicle-info">
        <div class="vehicle-id">${vehicle.codice_identificativo}</div>
        <div class="vehicle-type">${vehicleLabel}</div>
      </div>
      ${batteryHTML}
    </div>
    <div class="vehicle-details">
      <div class="detail-row">
        <span class="detail-label">Tipo:</span>
        <span class="detail-value">${vehicleLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Stato:</span>
        <span class="detail-value" style="text-transform: capitalize;">
          ${
            vehicle.stato === "disponibile"
              ? "🟢 Disponibile"
              : vehicle.stato === "in_uso"
              ? "🔵 In uso"
              : "🟠 Manutenzione"
          }
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Parcheggio:</span>
        <span class="detail-value">${parking?.nome || "N/A"}</span>
      </div>
    </div>
    <div class="vehicle-actions">
      <button class="vehicle-btn" ${isDisabled ? "disabled" : ""}>
        <i class="${lockIcon}"></i>
        ${buttonText}
      </button>
    </div>
  `;

  if (!isDisabled) {
    card.querySelector(".vehicle-btn").addEventListener("click", () => {
      reserveVehicle(vehicle);
    });
  }

  return card;
}

// ===== FILTERING - 2️⃣ FILTRI MEZZI =====
function filterVehiclesByType(event) {
  filterButtons.forEach((btn) => btn.classList.remove("active"));
  event.target.closest(".filter-btn").classList.add("active");
  state.currentFilter = event.target
    .closest(".filter-btn")
    .getAttribute("data-filter");
  renderVehicles(state.vehicles);
}

function getVehiclesByType(filter) {
  if (filter === "all") {
    return state.vehicles;
  }

  return state.vehicles.filter((v) => {
    if (filter === "bicicletta_muscolare")
      return v.tipo_mezzo === "bicicletta_muscolare";
    if (filter === "monopattini") return v.tipo_mezzo === "monopattino";
    if (filter === "bicicletta_elettrica")
      return v.tipo_mezzo === "bicicletta_elettrica";
    return true;
  });
}

// ===== LOGIC - 4️⃣ PRENOTAZIONE =====
async function reserveVehicle(vehicle) {
  // ✅ Gate 1: Verifica credito
  if (state.user.credito < 1) {
    showSnackbar("❌ Credito insufficiente! Ricarica il tuo saldo.", "error");
    return;
  }

  // ✅ Gate 2: Verifica stato account
  if (state.user.stato !== "attivo") {
    showSnackbar("❌ Account sospeso! Ricaricare il saldo e attendi.", "error");
    return;
  }

  // ✅ Gate 3: Verifica corsa attiva
  const activeRide = await getActiveRide();
  if (activeRide) {
    showSnackbar("❌ Hai già una corsa attiva! Termina quella prima.", "error");
    return;
  }

  // ✅ Se tutto ok: Salva mezzo e apri modal
  state.selectedVehicle = vehicle;
  openReservationModal(vehicle);
}

// ✅ AGGIORNA: Verifica se c'è una corsa attiva dal backend
async function getActiveRide() {
  try {
    const response = await fetch("/rides/active", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();

      // ✅ NUOVO: Controlla il campo activeRide, non l'intero oggetto
      if (data.activeRide) {
        return data.activeRide; // Ritorna solo il ride
      } else {
        return null;
      }
    }

    // Se errore del server
    console.error("❌ Errore backend:", response.status);
    return null;
  } catch (error) {
    console.error("❌ Errore connessione:", error);
    return null;
  }
}

// ===== MODAL HANDLING =====
function openReservationModal(vehicle) {
  const parking = state.parkings.find(
    (p) => p.id_parcheggio === vehicle.id_parcheggio
  );

  document.getElementById("summaryVehicleId").textContent =
    vehicle.codice_identificativo;
  document.getElementById("summaryVehicleType").textContent =
    vehicle.tipo_mezzo === "monopattino"
      ? "Monopattino Elettrico"
      : vehicle.tipo_mezzo === "bicicletta_elettrica"
      ? "Bicicletta Elettrica"
      : "Bicicletta Muscolare";
  document.getElementById(
    "summaryBattery"
  ).textContent = `${vehicle.stato_batteria}%`;
  document.getElementById("summaryParking").textContent =
    parking?.nome || "N/A";

  reservationModal.classList.remove("hidden");
}

function closeReservationModal() {
  reservationModal.classList.add("hidden");
  state.selectedVehicle = null;
}

function confirmReservation() {
  if (!state.selectedVehicle) return;

  // ✅ Disabilita il bottone durante il caricamento
  const confirmBtn = document.getElementById("confirmReservation");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Caricamento...";

  // ✅ POST al backend per creare prenotazione
  fetch("/rides/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      id_mezzo: state.selectedVehicle.id_mezzo,
    }),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((data) => {
          throw new Error(data.error || "Errore sconosciuto");
        });
      }
      return res.json();
    })
    .then((data) => {
      // ✅ Salva l'ID della corsa nello state
      state.activeRideId = data.id_corsa;
      state.selectedVehicle = null;

      closeReservationModal();
      showSnackbar(`✅ Mezzo prenotato! Iniziando la corsa...`, "success");

      // ✅ Reindirizza a RideUI dopo 800ms
      setTimeout(() => {
        window.location.href = `/ride?ride_id=${data.id_corsa}`;
      }, 800);
    })
    .catch((error) => {
      console.error("❌ Errore prenotazione:", error.message);

      // ✅ Re-abilita il bottone
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Conferma";
    });
}

// ===== NUOVO: MOSTRA ERRORE IN DIV =====
function showReservationError(message) {
  const errorDiv = document.getElementById("reservationError");

  // Riempi il contenuto
  errorDiv.innerHTML = `
    <div style="
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      gap: 10px;
      align-items: center;
    ">
      <i class="fas fa-exclamation-triangle" style="font-size: 16px; flex-shrink: 0;"></i>
      <div style="font-size: 13px;">
        ${message}
      </div>
    </div>
  `;

  // Mostra la div
  errorDiv.classList.remove("hidden");
}

// ===== UTILITIES =====
function showSnackbar(message, type = "success") {
  snackbarElement.textContent = message;
  snackbarElement.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbarElement.classList.remove("show");
  }, 3500);
}

function showLoading(show) {
  state.isLoading = show;
  if (show) {
    loadingSpinner.classList.remove("hidden");
    vehiclesGrid.innerHTML = "";
  } else {
    loadingSpinner.classList.add("hidden");
  }
}

function showParkingDetails(parking, vehicles) {
  if (vehicles.length === 1) {
    showSnackbar(`📍 ${parking.nome}: 1 mezzo nel parcheggio`, "success");
  } else {
    const message = `📍 ${parking.nome}: ${vehicles.length} mezzi nel parcheggio`;
    showSnackbar(message, "success");
  }
}

// ===== UTILITY - FORMATTAZIONE STATO =====
function formatVehicleStatus(stato) {
  const statusMap = {
    disponibile: "Disponibile",
    in_uso: "In uso",
    in_manutenzione: "In manutenzione",
  };
  return statusMap[stato] || stato;
}
