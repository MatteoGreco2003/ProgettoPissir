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
    punti: 0,
  },
  map: null,
  markers: {},
  activeRideBanner: null,
  accountBanner: null,
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
  setupFeedbackModalListeners();
  initMap();
  loadUserProfile();

  // Usa Singleton MQTT (connessione persistente)
  MQTTManager.init();

  // Ascolta messaggi MQTT da questa pagina
  setupMQTTListener();
});

// ===== STOP REFRESH QUANDO CHIUDI LA PAGINA =====
window.addEventListener("beforeunload", () => {
  stopAutoRefresh();
});

// ===== SETUP MQTT LISTENER =====
function setupMQTTListener() {
  document.addEventListener("mqtt-message", (event) => {
    const { topic, payload } = event.detail;

    try {
      const msg = JSON.parse(payload);

      if (msg.level !== undefined && msg.id_mezzo !== undefined) {
        const idMezzo = msg.id_mezzo;
        const newBattery = msg.level;

        console.log(`⚡ MQTT Home: Mezzo ${idMezzo} batteria ${newBattery}%`);

        // Aggiorna nel state
        const vehicle = state.vehicles.find((v) => v.id_mezzo === idMezzo);
        if (vehicle) {
          vehicle.stato_batteria = newBattery;

          // Aggiorna nella griglia dei veicoli
          updateVehicleInGrid(vehicle);

          // Aggiorna nella mappa
          updateVehicleInMap(vehicle);

          // Aggiorna il banner se c'è una corsa attiva
          if (
            state.activeRideBanner &&
            state.activeRideBanner.id_mezzo === idMezzo
          ) {
            renderTopBanner();
          }
        }
      }
    } catch (error) {
      console.error("❌ Errore parsing MQTT:", error);
    }
  });
}

// Aggiorna batteria nella griglia
function updateVehicleInGrid(vehicle) {
  const vehicleCard = document.querySelector(
    `[data-vehicle-id="${vehicle.id_mezzo}"]`
  );
  if (vehicleCard) {
    const batteryElement = vehicleCard.querySelector(".vehicle-battery");
    if (batteryElement) {
      batteryElement.innerHTML = `<i class="fas fa-bolt"></i> ${vehicle.stato_batteria}%`;
    }
  }
}

// Aggiorna batteria nella mappa
function updateVehicleInMap(vehicle) {
  const parking = state.parkings.find(
    (p) => p.id_parcheggio === vehicle.id_parcheggio
  );
  if (parking) {
    const vehiclesInParking = state.vehicles.filter(
      (v) => v.id_parcheggio === parking.id_parcheggio
    );
    const marker = state.markers[parking.id_parcheggio];
    if (marker) {
      const popupContent = createParkingPopup(parking, vehiclesInParking);
      marker.setPopupContent(popupContent);
    }
  }
}

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

      loadHomepageData();
    } else {
      console.error("❌ Errore caricamento profilo:", response.status);
      showSnackbar("❌ Errore nel caricamento del profilo", "error");
    }
  } catch (error) {
    console.error("❌ Errore di connessione:", error);
    showSnackbar("❌ Errore di connessione", "error");
  }
}

// Controlla corsa attiva e stato account
async function checkActiveRideAndStatus() {
  try {
    const res = await fetch("/rides/active", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();

    if (data.id_corsa) {
      // Corsa attiva presente
      state.activeRideBanner = {
        id_corsa: data.id_corsa,
        id_mezzo: data.id_mezzo,
        tipo_mezzo: data.tipo_mezzo,
        parcheggio_inizio: data.parcheggio_inizio,
        data_ora_inizio: data.data_ora_inizio,
        durata_minuti: data.durata_corrente_minuti || 0,
        km_percorsi: parseFloat(data.km_percorsi) || 0,
        costo_stimato: data.costo_stimato || 0,
        stato_corsa: data.stato_corsa,
      };
      state.accountBanner = null;
    } else {
      state.activeRideBanner = null;
      buildAccountBanner();
    }

    renderTopBanner();
  } catch (err) {
    console.error("❌ Errore checkActiveRide:", err);
  }
}

// Costruisce il banner account/credito
function buildAccountBanner() {
  const saldo = state.user.credito || 0;
  const stato = state.user.stato || "attivo";

  // Account sospeso CON ricarica in attesa
  if (stato === "in_attesa_approvazione") {
    state.accountBanner = {
      type: "pending_approval",
      title: "Account in attesa di approvazione",
      message: "Attendi l'approvazione del gestore.",
      showRechargeButton: true,
    };
    return;
  }

  // Account sospeso (per debito)
  if (stato === "sospeso" || stato === "suspended") {
    state.accountBanner = {
      type: "blocked",
      title: "Account sospeso",
      message: "Ricarica il saldo e attendi l'approvazione del gestore.",
      showRechargeButton: true,
    };
    return;
  }

  // Credito basso
  if (saldo < 1) {
    state.accountBanner = {
      type: "low_credit",
      title: "Credito insufficiente",
      message: `Devi avere almeno €1.00 per iniziare una corsa.`,
      showRechargeButton: true,
    };
    return;
  }

  state.accountBanner = null;
}

// Renderizza il banner in alto
function renderTopBanner() {
  const container = document.getElementById("topBannerContainer");
  if (!container) return;

  container.innerHTML = "";

  if (state.activeRideBanner) {
    const b = state.activeRideBanner;

    let tipoIcon = "🚲";
    let tipoLabel = "Bicicletta Muscolare";
    if (b.tipo_mezzo === "monopattino") {
      tipoIcon = "🛴";
      tipoLabel = "Monopattino";
    } else if (b.tipo_mezzo === "bicicletta_elettrica") {
      tipoIcon = "⚡";
      tipoLabel = "Bicicletta Elettrica";
    }

    const dataOra = new Date(b.data_ora_inizio);
    const dataFormattata = dataOra.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const oraFormattata = dataOra.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let batteryHTML = "";
    if (b.tipo_mezzo !== "bicicletta_muscolare") {
      const vehicle = state.vehicles.find((v) => v.id_mezzo === b.id_mezzo);
      const battery = vehicle ? vehicle.stato_batteria : 0;
      let batteryClass = "battery-good";
      if (battery < 20) batteryClass = "battery-critical";
      else if (battery < 50) batteryClass = "battery-warning";

      batteryHTML = `<div class="top-banner__battery-badge ${batteryClass}">🔋 ${battery}%</div>`;
    }

    // Se batteria è esaurita, mostra avviso
    const avviso =
      b.stato_corsa === "sospesa_batteria_esaurita"
        ? `<div class="top-banner__warning-box">
            <span>🛑</span>
            <p>Batteria esaurita! Procedi al pagamento.</p>
          </div>`
        : "";

    container.innerHTML = `
      <div class="top-banner ${
        b.stato_corsa === "sospesa_batteria_esaurita"
          ? "top-banner--warning"
          : ""
      }">
        
        <!-- HEADER: MEZZO + PARCHEGGIO + DATETIME -->
        <div class="top-banner__header">
          <div class="top-banner__mezzo-info">
            <span class="top-banner__mezzo-icon">${tipoIcon}</span>
            <span class="top-banner__mezzo-tipo">${tipoLabel}</span>
            ${batteryHTML}
          </div>
          <div class="top-banner__location-datetime">
            <div class="top-banner__parking">📍 ${b.parcheggio_inizio}</div>
            <div class="top-banner__datetime">
              <span>📅 ${dataFormattata}</span>
              <span>🕐 ${oraFormattata}</span>
            </div>
          </div>
        </div>

        <!-- STATS: DURATA | COSTO | KM -->
        <div class="top-banner__stats">
          <div class="top-banner__stat">
            <span class="top-banner__stat-label">Durata Stimata</span>
            <span class="top-banner__stat-value">⏱️ ${b.durata_minuti}m</span>
          </div>
          <div class="top-banner__stat">
            <span class="top-banner__stat-label">Costo Stimato</span>
            <span class="top-banner__stat-value costo">€${parseFloat(
              b.costo_stimato || 0
            ).toFixed(2)}</span>
          </div>
          <div class="top-banner__stat">
            <span class="top-banner__stat-label">Chilometri Stimati</span>
            <span class="top-banner__stat-value">🗺️ ${b.km_percorsi.toFixed(
              2
            )}</span>
          </div>
        </div>

        <!-- AVVISO (se batteria esaurita) -->
        ${avviso}

        <!-- BUTTON RIGHT -->
        <div class="top-banner__right">
          <button class="top-banner__btn" onclick="window.location.href='/ride?ride_id=${
            b.id_corsa
          }'">
            ${
              b.stato_corsa === "sospesa_batteria_esaurita"
                ? "Paga"
                : "Continua"
            }
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (state.accountBanner) {
    const a = state.accountBanner;
    const isWaitingApproval = a.type === "pending_approval";

    container.innerHTML = `
      <div id="accountBanner" ${
        isWaitingApproval
          ? 'class="top-banner top-banner--warning pending-approval"'
          : 'class="top-banner top-banner--warning"'
      }>
        <div class="top-banner__header ">
          <span class="top-banner__label">${a.title}</span>
          <span>${a.message}</span>
        </div>
        ${
          !isWaitingApproval
            ? `<div class="top-banner__right">
               <button class="top-banner__btn" onclick="window.location.href='/credit'">
                Ricarica
               </button>
             </div>`
            : ""
        }
    </div>
  `;
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
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

  // Filter buttons (filtro mezzi nella card)
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", filterVehiclesByType);
  });

  const filterSelect = document.getElementById("filterSelect");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      state.currentFilter = e.target.value;
      updateFilterUI();
      renderVehicles(state.vehicles);
    });
  }

  //Window resize listener per sincronizzare filtri
  window.addEventListener("resize", () => {
    syncFilterUI();
  });

  const reservationModalClose = reservationModal.querySelector(".modal-close");
  reservationModalClose.addEventListener("click", closeReservationModal);
  confirmReservationBtn.addEventListener("click", confirmReservation);
  cancelReservationBtn.addEventListener("click", closeReservationModal);

  reservationModal.addEventListener("click", (e) => {
    if (
      e.target === reservationModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeReservationModal();
    }
  });

  // ===== CONTROLLA SE C'È UN FEEDBACK IN SOSPESO =====
  const pendingFeedback = sessionStorage.getItem("pendingFeedback");
  if (pendingFeedback) {
    try {
      const rideData = JSON.parse(pendingFeedback);
      sessionStorage.removeItem("pendingFeedback");

      setTimeout(() => {
        openFeedbackModal(rideData);
      }, 500);
    } catch (error) {
      console.error("❌ Errore parsing feedback:", error);
    }
  }
}

// ===== FEEDBACK MODAL STATE =====
let feedbackState = {
  isOpen: false,
  rideData: null,
  selectedRating: 0,
  comment: "",
};

// ===== SETUP FEEDBACK MODAL EVENT LISTENERS =====
function setupFeedbackModalListeners() {
  const feedbackModal = document.getElementById("feedbackModal");
  const feedbackModalClose = document.getElementById("feedbackModalClose");
  const skipFeedbackBtn = document.getElementById("skipFeedback");
  const submitFeedbackBtn = document.getElementById("submitFeedback");
  const feedbackStars = document.querySelectorAll(".feedback-star");
  const feedbackComment = document.getElementById("feedbackComment");

  feedbackModalClose.addEventListener("click", closeFeedbackModal);
  skipFeedbackBtn.addEventListener("click", closeFeedbackModal);

  feedbackModal.addEventListener("click", (e) => {
    if (
      e.target === feedbackModal ||
      e.target.classList.contains("modal-overlay")
    ) {
      closeFeedbackModal();
    }
  });

  feedbackStars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.getAttribute("data-rating"));
      setFeedbackRating(rating);
    });

    star.addEventListener("mouseenter", () => {
      const rating = parseInt(star.getAttribute("data-rating"));
      feedbackStars.forEach((s) => {
        const sRating = parseInt(s.getAttribute("data-rating"));
        if (sRating <= rating) {
          s.style.color = "var(--primary-teal)";
        } else {
          s.style.color = "rgba(33, 128, 141, 0.3)";
        }
      });
    });
  });

  const starsContainer = document.getElementById("feedbackStars");
  starsContainer.addEventListener("mouseleave", () => {
    feedbackStars.forEach((s) => {
      const sRating = parseInt(s.getAttribute("data-rating"));
      if (sRating <= feedbackState.selectedRating) {
        s.classList.add("active");
        s.style.color = "#ffc107";
      } else {
        s.classList.remove("active");
        s.style.color = "rgba(33, 128, 141, 0.3)";
      }
    });
  });

  feedbackComment.addEventListener("input", (e) => {
    feedbackState.comment = e.target.value;
    const charCount = e.target.value.length;
    document.getElementById("feedbackCharCount").textContent = charCount;
  });

  submitFeedbackBtn.addEventListener("click", submitFeedback);
}

// ===== IMPOSTA RATING STELLE =====
function setFeedbackRating(rating) {
  feedbackState.selectedRating = rating;

  const feedbackStars = document.querySelectorAll(".feedback-star");
  const ratingTexts = ["Pessimo", "Cattivo", "Medio", "Buono", "Eccellente"];

  feedbackStars.forEach((star) => {
    const starRating = parseInt(star.getAttribute("data-rating"));
    if (starRating <= rating) {
      star.classList.add("active");
      star.style.color = "#ffc107";
    } else {
      star.classList.remove("active");
      star.style.color = "rgba(33, 128, 141, 0.3)";
    }
  });

  document.getElementById("feedbackRatingText").textContent =
    ratingTexts[rating - 1];
}

// ===== APRI MODAL FEEDBACK =====
function openFeedbackModal(rideData) {
  feedbackState.rideData = rideData;
  feedbackState.selectedRating = 0;
  feedbackState.comment = "";
  feedbackState.isOpen = true;

  document.getElementById("feedbackComment").value = "";
  document.getElementById("feedbackCharCount").textContent = "0";
  document.getElementById("feedbackRatingText").textContent =
    "Seleziona una valutazione";

  document.querySelectorAll(".feedback-star").forEach((star) => {
    star.classList.remove("active");
    star.style.color = "rgba(33, 128, 141, 0.3)";
  });

  const tipoMezzoLabel =
    rideData.tipo_mezzo === "monopattino"
      ? "Monopattino"
      : rideData.tipo_mezzo === "bicicletta_elettrica"
      ? "Bicicletta Elettrica"
      : "Bicicletta Muscolare";

  document.getElementById("feedbackMezzoType").textContent = tipoMezzoLabel;
  document.getElementById("feedbackDistanza").textContent =
    (rideData.km_percorsi || 0).toFixed(2) + " km";
  document.getElementById("feedbackDurata").textContent =
    rideData.durata_minuti + " min";
  document.getElementById("feedbackCosto").textContent =
    "€" + parseFloat(rideData.costo_finale || 0).toFixed(2);

  const feedbackModal = document.getElementById("feedbackModal");
  feedbackModal.classList.remove("hidden");
}

// ===== CHIUDI MODAL FEEDBACK =====
function closeFeedbackModal() {
  feedbackState.isOpen = false;
  feedbackState.rideData = null;
  feedbackState.selectedRating = 0;
  feedbackState.comment = "";

  const feedbackModal = document.getElementById("feedbackModal");
  feedbackModal.classList.add("hidden");
}

// ===== INVIA FEEDBACK AL BACKEND =====
async function submitFeedback() {
  if (feedbackState.selectedRating === 0) {
    showSnackbar("❌ Seleziona una valutazione!", "error");
    return;
  }

  if (!feedbackState.rideData) {
    showSnackbar("❌ Errore: dati corsa mancanti", "error");
    return;
  }

  const submitBtn = document.getElementById("submitFeedback");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio...';

  try {
    const response = await fetch("/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        id_mezzo: feedbackState.rideData.id_mezzo,
        rating: feedbackState.selectedRating,
        commento: feedbackState.comment || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Errore nell'invio del feedback");
    }

    const data = await response.json();

    showSnackbar(
      "✅ Grazie per il tuo feedback! " +
        "⭐".repeat(feedbackState.selectedRating),
      "success"
    );
    closeFeedbackModal();
  } catch (error) {
    console.error("❌ Errore invio feedback:", error.message);
    showSnackbar(
      "❌ Errore nell'invio del feedback: " + error.message,
      "error"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Invia Feedback';
  }
}

// ===== SINCRONIZZAZIONE FILTRI TRA SELECT E BUTTONS =====
function updateFilterUI() {
  filterButtons.forEach((btn) => {
    if (btn.getAttribute("data-filter") === state.currentFilter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const filterSelect = document.getElementById("filterSelect");
  if (filterSelect) {
    filterSelect.value = state.currentFilter;
  }
}

function syncFilterUI() {
  updateFilterUI();
}

// ===== MAP INITIALIZATION =====
function initMap() {
  // Centra sulla Novara
  const defaultLat = 45.4458;
  const defaultLng = 8.6158;

  state.map = L.map("parkingMap", {
    scrollWheelZoom: false,
  }).setView([defaultLat, defaultLng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(state.map);
}

// ===== DATA LOADING =====
function loadHomepageData() {
  showLoading(true);

  fetch("/parking/data")
    .then((res) => res.json())
    .then((data) => {
      state.parkings = data.parkings || [];

      return fetch("/vehicles/data");
    })
    .then((res) => res.json())
    .then((data) => {
      state.vehicles = data.vehicles || [];

      renderParkingsOnMap(state.parkings);
      renderParkings(state.parkings);
      renderVehicles(state.vehicles);
      showLoading(false);

      checkActiveRideAndStatus();

      startAutoRefresh(15000);
      startBannerRefresh(15000);
    })
    .catch((error) => {
      console.error("❌ Errore caricamento dati:", error);
      showSnackbar("❌ Errore nel caricamento dei dati", "error");
      showLoading(false);
    });
}

// ===== AUTO REFRESH DATI =====
function startAutoRefresh(interval = 15000) {
  refreshInterval = setInterval(() => {
    const hasActiveRide = state.vehicles.some((v) => v.stato === "in_uso");

    if (hasActiveRide) {
      refreshVehicleData();
      refreshUserCredit();
    } else {
      stopAutoRefresh();
      setTimeout(() => {
        startAutoRefresh(interval);
      }, 10000);
    }
  }, interval);
}

// Auto-refresh banner corsa attiva ogni 15 secondi
function startBannerRefresh(interval = 15000) {
  setInterval(() => {
    // Aggiorna solo se c'è una corsa attiva
    if (state.activeRideBanner) {
      checkActiveRideAndStatus();
    }
  }, interval);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function refreshUserCredit() {
  try {
    const response = await fetch("/users/me", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();
      state.user.credito = parseFloat(userData.saldo || 0);
      state.user.stato = userData.stato_account || "attivo";
    }
  } catch (error) {
    console.error("❌ Errore refresh credito:", error);
  }
}

function refreshVehicleData() {
  Promise.all([
    fetch("/vehicles/data").then((res) => res.json()),
    fetch("/parking/data").then((res) => res.json()),
  ])
    .then(([vehiclesData, parkingsData]) => {
      state.vehicles = vehiclesData.vehicles || [];
      state.parkings = parkingsData.parkings || [];

      renderVehicles(state.vehicles);
      renderParkings(state.parkings);
      renderParkingsOnMap(state.parkings);
    })
    .catch((error) => {
      console.error("❌ Errore refresh dati:", error);
    });
}

// ===== RENDERING - MAPPA PARCHEGGI CON LEAFLET =====
function renderParkingsOnMap(parkings) {
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

    const marker = L.marker([parking.latitudine, parking.longitudine], {
      icon: icon,
    }).addTo(state.map);

    const popupContent = createParkingPopup(parking, vehiclesInParking);
    marker.bindPopup(popupContent, {
      maxWidth: 330,
      maxHeight: 200,
    });

    state.markers[parking.id_parcheggio] = marker;

    marker.on("click", () => {
      showParkingDetails(parking, vehiclesInParking);
    });
  });
}

// ===== RENDERING - PARCHEGGI NELLA GRIGLIA =====
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

      // Se è bicicletta muscolare, spazio vuoto per mantenere allineamento
      const batteryHTML =
        v.tipo_mezzo === "bicicletta_muscolare"
          ? `<span style="width: 48px;"></span>`
          : `<span class="battery-badge ${batteryClass}">${v.stato_batteria}%</span>`;

      return `
        <div style="
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        ">
          <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;">${icon} ${
        v.codice_identificativo
      }</span>
          <span class="vehicle-status ${statusClass}" style="flex-shrink: 0; white-space: nowrap;">${formatVehicleStatus(
        v.stato
      )}</span>
          <span style="flex-shrink: 0; white-space: nowrap; width: 48px; text-align: right;">
            ${batteryHTML}
          </span>
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
    non_prelevabile: "status-unavailable",
  };
  return statusMap[stato] || "status-available";
}

function getBatteryClass(batteria) {
  if (batteria >= 50) return "battery-good";
  if (batteria >= 20) return "battery-warning";
  return "battery-critical";
}

// ===== RENDERING - LISTA MEZZI =====
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
  card.setAttribute("data-vehicle-id", vehicle.id_mezzo);

  let batteryClass = "vehicle-battery--good";
  if (vehicle.stato_batteria < 20) {
    batteryClass = "vehicle-battery--critical";
  } else if (vehicle.stato_batteria < 50) {
    batteryClass = "vehicle-battery--warning";
  }

  let vehicleIcon = "fas fa-bicycle";
  let vehicleLabel = "Bicicletta Muscolare";

  if (vehicle.tipo_mezzo === "monopattino") {
    vehicleIcon = "fas fa-person-skating";
    vehicleLabel = "Monopattino Elettrico";
  } else if (vehicle.tipo_mezzo === "bicicletta_elettrica") {
    vehicleIcon = "fas fa-bolt";
    vehicleLabel = "Bicicletta Elettrica";
  }

  const isDisabled =
    vehicle.stato !== "disponibile" ||
    (vehicle.tipo_mezzo !== "bicicletta_muscolare" &&
      vehicle.stato_batteria < 20);
  const buttonText =
    vehicle.stato === "disponibile" ? "Prenota" : "Non Disponibile";

  const lockIcon = isDisabled ? "fas fa-lock" : "fas fa-lock-open";

  const parking = state.parkings.find(
    (p) => p.id_parcheggio === vehicle.id_parcheggio
  );

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
              : vehicle.stato === "non_prelevabile"
              ? "🟠 Non prelevabile"
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

// ===== FILTERING - FILTRI MEZZI =====
function filterVehiclesByType(event) {
  filterButtons.forEach((btn) => btn.classList.remove("active"));
  event.target.closest(".filter-btn").classList.add("active");
  state.currentFilter = event.target
    .closest(".filter-btn")
    .getAttribute("data-filter");

  updateFilterUI();
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

// ===== LOGIC - PRENOTAZIONE =====
async function reserveVehicle(vehicle) {
  // 1: Verifica stato account
  if (state.user.stato === "sospeso") {
    showSnackbar("❌ Account sospeso! Ricaricare il saldo e attendi.", "error");
    return;
  }

  // 2: Verifica stato account
  if (state.user.stato === "in_attesa_approvazione") {
    showSnackbar(
      "❌ Account in attesa di approvazione! Attendi l'approvazione del gestore.",
      "error"
    );
    return;
  }

  // 3: Verifica credito
  if (state.user.credito < 1) {
    showSnackbar("❌ Credito insufficiente! Ricarica il tuo saldo.", "error");
    return;
  }

  // 4: Verifica corsa attiva
  const activeRide = await getActiveRide();
  if (activeRide) {
    showSnackbar("❌ Hai già una corsa attiva! Termina quella prima.", "error");
    return;
  }

  // Salva mezzo e apri modal
  state.selectedVehicle = vehicle;
  openReservationModal(vehicle);
}

async function getActiveRide() {
  try {
    const response = await fetch("/rides/active", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      console.error("❌ Errore backend:", response.status);
      return null;
    }

    const data = await response.json();

    if ("activeRide" in data) {
      return data.activeRide;
    }

    if (data.id_corsa) {
      return data;
    }

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
  const batteryText = vehicle.stato_batteria
    ? `${vehicle.stato_batteria}%`
    : "Non Presente";
  document.getElementById("summaryBattery").textContent = batteryText;
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

  const confirmBtn = document.getElementById("confirmReservation");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Caricamento...";

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
      state.activeRideId = data.id_corsa;
      state.selectedVehicle = null;

      closeReservationModal();
      showSnackbar(`✅ Mezzo prenotato! Iniziando la corsa...`, "success");

      // Reindirizza a RideUI dopo 800ms
      setTimeout(() => {
        window.location.href = `/ride?ride_id=${data.id_corsa}`;
      }, 800);
    })
    .catch((error) => {
      console.error("❌ Errore prenotazione:", error.message);

      confirmBtn.disabled = false;
      confirmBtn.textContent = "Conferma";
    });
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
    non_prelevabile: "Non prelevabile",
  };
  return statusMap[stato] || stato;
}
