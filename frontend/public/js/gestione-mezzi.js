// Variabili Paginazione
const ITEMS_PER_PAGE = 7;
let currentPage = 1;
let paginationContainer = document.getElementById("paginationContainer");

let vehicles = [];
let allVehicles = [];
let allParkings = [];
let currentVehicleId = null;
let currentEditVehicleId = null;
let currentFeedbackVehicleId = null;
let currentFeedbacks = [];
let currentDetailVehicleId = null;

const vehiclesTableBody = document.getElementById("vehiclesTableBody");
const searchInput = document.getElementById("searchInput");
const parkingFilter = document.getElementById("parkingFilter");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");
const snackbar = document.getElementById("snackbar");

const vehicleDetailModal = document.getElementById("vehicleDetailModal");
const vehicleDetailBody = document.getElementById("vehicleDetailBody");
const closeVehicleDetailBtn = document.getElementById("closeVehicleDetailBtn");

const addVehicleModal = document.getElementById("addVehicleModal");
const addVehicleForm = document.getElementById("addVehicleForm");
const tipoMezzoInput = document.getElementById("tipoMezzoInput");
const parcheggio = document.getElementById("parcheggio");
const codiceInput = document.getElementById("codiceInput");
const addErrors = document.getElementById("addErrors");
const cancelAddVehicleBtn = document.getElementById("cancelAddVehicleBtn");
const confirmAddVehicleBtn = document.getElementById("confirmAddVehicleBtn");

const editVehicleModal = document.getElementById("editVehicleModal");
const editVehicleForm = document.getElementById("editVehicleForm");
const editVehicleCode = document.getElementById("editVehicleCode");
const editVehicleType = document.getElementById("editVehicleType");
const editVehicleStatus = document.getElementById("editVehicleStatus");
const editParcheggio = document.getElementById("editParcheggio");
const batteryGroupEdit = document.getElementById("batteryGroupEdit");
const editBatterySlider = document.getElementById("editBatterySlider");
const editBatteryPercentage = document.getElementById("editBatteryPercentage");
const editBatteryInfo = document.getElementById("editBatteryInfo");
const closeEditVehicleBtn = document.getElementById("closeEditVehicleBtn");
const cancelEditVehicleBtn = document.getElementById("cancelEditVehicleBtn");
const confirmEditVehicleBtn = document.getElementById("confirmEditVehicleBtn");

const deleteVehicleModal = document.getElementById("deleteVehicleModal");
const deleteVehicleType = document.getElementById("deleteVehicleType");
const deleteVehicleCode = document.getElementById("deleteVehicleCode");
const cancelDeleteVehicleBtn = document.getElementById(
  "cancelDeleteVehicleBtn"
);
const confirmDeleteVehicleBtn = document.getElementById(
  "confirmDeleteVehicleBtn"
);

const feedbackVehicleModal = document.getElementById("feedbackVehicleModal");
const feedbackVehicleTitle = document.getElementById("feedbackVehicleTitle");
const feedbackVehicleRating = document.getElementById("feedbackVehicleRating");
const feedbackVehicleBody = document.getElementById("feedbackVehicleBody");
const closeFeedbackVehicleBtn = document.getElementById(
  "closeFeedbackVehicleBtn"
);
const closeFeedbackVehicleBtnFooter = document.getElementById(
  "closeFeedbackVehicleBtnFooter"
);

const modalCloseButtons = document.querySelectorAll(".modal-close");

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadParkings();
  loadAllVehicles();
  loadVehicleStatistics();

  // Inizializza MQTT
  MQTTManager.init();

  // Setup MQTT Listener
  setupMQTTListener();

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

function setupMQTTListener() {
  document.addEventListener("mqtt-message", (event) => {
    const { topic, payload } = event.detail;

    try {
      const msg = JSON.parse(payload);

      if (msg.level !== undefined && msg.id_mezzo !== undefined) {
        const idMezzo = msg.id_mezzo;
        const newBattery = msg.level;

        console.log(`⚡ MQTT Admin: Mezzo ${idMezzo} batteria ${newBattery}%`);

        // Aggiorna batteria ovunque si usa
        const vehicle = allVehicles.find((v) => v.id_mezzo === idMezzo);
        if (vehicle) {
          vehicle.stato_batteria = newBattery;

          updateVehicleInTable(vehicle);

          if (currentDetailVehicleId === idMezzo) {
            updateVehicleInDetailModal(vehicle);
          }
        }
      }
    } catch (error) {
      console.error("❌ Errore parsing MQTT:", error);
    }
  });
}

function updateVehicleInTable(vehicle) {
  const rows = vehiclesTableBody.querySelectorAll("tr");

  rows.forEach((row) => {
    const codeCell = row.querySelector("td:first-child");
    if (codeCell && codeCell.textContent === vehicle.codice_identificativo) {
      const batteryCell = row.querySelector("td:nth-child(5)");

      if (batteryCell) {
        if (vehicle.tipo_mezzo === "bicicletta_muscolare") {
          batteryCell.innerHTML =
            '<span style="color: var(--light-text);">NON PRESENTE</span>';
        } else {
          const batteryClass = getBatteryClass(vehicle.stato_batteria);
          batteryCell.innerHTML = `
            <div class="battery-indicator">
              <div class="battery-bar">
                <div class="battery-fill ${batteryClass}" 
                     style="width: ${vehicle.stato_batteria}%"></div>
              </div>
              <span class="battery-text">${vehicle.stato_batteria}%</span>
            </div>
          `;
        }
      }
    }
  });
}

function updateVehicleInDetailModal(vehicle) {
  const detailBody = document.getElementById("vehicleDetailBody");
  const allRows = detailBody.querySelectorAll(".detail-row");
  let batteryRow = null;

  allRows.forEach((row) => {
    if (row.textContent.includes("Batteria")) {
      batteryRow = row;
    }
  });

  if (batteryRow) {
    if (vehicle.tipo_mezzo === "bicicletta_muscolare") {
      batteryRow.innerHTML = `
        <span class="detail-label">Batteria:</span>
        <span class="detail-value">Non presente</span>
      `;
    } else {
      const batteryClass = getBatteryClass(vehicle.stato_batteria);
      batteryRow.innerHTML = `
        <span class="detail-label">Batteria:</span>
        <div class="battery-indicator">
          <div class="battery-bar">
            <div class="battery-fill ${batteryClass}" 
                 style="width: ${vehicle.stato_batteria}%"></div>
          </div>
          <span class="battery-text">${vehicle.stato_batteria}%</span>
        </div>
      `;
    }
  }
}

function setupEventListeners() {
  searchInput.addEventListener("input", filterVehicles);
  parkingFilter.addEventListener("change", filterVehicles);
  typeFilter.addEventListener("change", filterVehicles);
  statusFilter.addEventListener("change", filterVehicles);

  modalCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });
  closeVehicleDetailBtn.addEventListener("click", closeAllModals);
  closeEditVehicleBtn.addEventListener("click", closeAllModals);
  closeFeedbackVehicleBtn.addEventListener("click", closeAllModals);
  closeFeedbackVehicleBtnFooter.addEventListener("click", closeAllModals);

  cancelAddVehicleBtn.addEventListener("click", closeAllModals);
  confirmAddVehicleBtn.addEventListener("click", confirmAddVehicle);

  cancelEditVehicleBtn.addEventListener("click", closeAllModals);
  confirmEditVehicleBtn.addEventListener("click", confirmEditVehicle);
  editBatterySlider.addEventListener("input", (e) => {
    editBatteryPercentage.value = e.target.value;
    updateEditBatteryInfo(parseInt(e.target.value));
  });
  editBatteryPercentage.addEventListener("input", (e) => {
    const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
    editBatterySlider.value = value;
    editBatteryPercentage.value = value;
    updateEditBatteryInfo(value);
  });
  const maintenanceToggle = document.getElementById("editMaintenanceToggle");
  if (maintenanceToggle) {
    maintenanceToggle.addEventListener("change", updateMaintenanceStatus);
    maintenanceToggle.addEventListener("change", updateEditModalDisabledState);
  }

  cancelDeleteVehicleBtn.addEventListener("click", closeAllModals);
  confirmDeleteVehicleBtn.addEventListener("click", confirmDelete);

  const modals = [
    vehicleDetailModal,
    addVehicleModal,
    editVehicleModal,
    deleteVehicleModal,
    feedbackVehicleModal,
  ];
  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-overlay")) {
        closeAllModals();
      }
    });
  });
}

async function loadAllVehicles() {
  try {
    const response = await fetch("/vehicles/data", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento mezzi");

    const data = await response.json();
    allVehicles = data.vehicles;
    vehicles = [...allVehicles];

    renderVehicles();
    renderPagination();
    updateStats();
    await loadParkingOptions();
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

async function loadParkings() {
  try {
    const response = await fetch("/parking/data", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento parcheggi");

    const data = await response.json();

    parcheggio.innerHTML = "";
    editParcheggio.innerHTML = "";

    data.parkings
      .filter((parking) => parking.posti_liberi > 0)
      .forEach((parking) => {
        const option1 = document.createElement("option");
        option1.value = parking.id_parcheggio;
        option1.textContent = `${parking.nome}`;
        parcheggio.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = parking.id_parcheggio;
        option2.textContent = `${parking.nome}`;
        editParcheggio.appendChild(option2);
      });
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

async function loadVehicleStatistics() {
  try {
    const response = await fetch("/statistics/vehicles", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento statistiche");

    const data = await response.json();

    const sortedVehicles = data.veicoli.sort(
      (a, b) => parseFloat(b.ricavo_totale) - parseFloat(a.ricavo_totale)
    );

    // Prendi i top 5
    const topVehicles = sortedVehicles.slice(0, 5);
    renderVehiclePerformance(topVehicles);
  } catch (error) {
    console.error("❌ Errore:", error);
    document.getElementById("vehiclePerformanceContainer").innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>Errore caricamento statistiche</p>
      </div>
    `;
  }
}

function renderVehiclePerformance(vehicles) {
  if (vehicles.length === 0) {
    document.getElementById("vehiclePerformanceContainer").innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>Nessun dato disponibile</p>
      </div>
    `;
    return;
  }

  const rankingEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const html = vehicles
    .map(
      (vehicle, index) => `
      <div class="perf-card" style="animation-delay: ${index * 50}ms;">
        <div class="perf-card-header">
          <div class="perf-card-badge">${rankingEmojis[index]}</div>
          <div class="perf-card-info">
            <div class="perf-card-code">${vehicle.codice_identificativo}</div>
          </div>
        </div>
        
        <div class="perf-metric">
          <div class="perf-metric-value">💰 €${parseFloat(
            vehicle.ricavo_totale
          ).toFixed(2)}</div>
          <div class="perf-metric-label">Ricavo Totale</div>
        </div>
        
        <div class="perf-metric">
          <div class="perf-metric-value">🚴 ${vehicle.corse_totali}</div>
          <div class="perf-metric-label">Corse Completate</div>
        </div>
        
        <div class="perf-metric">
          <div class="perf-metric-value">⏱️ ${
            vehicle.durata_media_minuti
          }m</div>
          <div class="perf-metric-label">Durata Media</div>
        </div>
      </div>
    `
    )
    .join("");

  document.getElementById("vehiclePerformanceContainer").innerHTML = html;
}

async function loadParkingOptions() {
  try {
    const firstOption = parkingFilter.options[0];
    parkingFilter.innerHTML = "";
    parkingFilter.appendChild(firstOption.cloneNode(true));

    const response = await fetch("/parking/data", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Errore caricamento parcheggi");
    }

    const data = await response.json();

    data.parkings.forEach((parking) => {
      const option = document.createElement("option");
      option.value = parking.id_parcheggio;
      option.textContent = parking.nome;
      parkingFilter.appendChild(option);
    });
  } catch (error) {
    console.error("❌ Errore caricamento parcheggi:", error);
  }
}

function renderVehicles() {
  vehicles = sortVehicles(vehicles);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVehicles = vehicles.slice(startIndex, endIndex);

  if (vehicles.length === 0) {
    vehiclesTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <p>Nessun mezzo trovato</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  vehiclesTableBody.innerHTML = paginatedVehicles
    .map(
      (vehicle) => `
    <tr>
      <td>${vehicle.codice_identificativo || "N/A"}</td>
      <td>
        <span class="type-badge type-${vehicle.tipo_mezzo}">
          ${formatTipoMezzo(vehicle.tipo_mezzo)}
        </span>
      </td>
      <td>${vehicle.parking?.nome || "N/A"}</td>
      <td>
        <span class="status-badge status-${vehicle.stato}">
          ${formatStato(vehicle.stato)}
        </span>
      </td>
      <td>
        ${
          vehicle.tipo_mezzo === "bicicletta_muscolare"
            ? '<span style="color: var(--light-text);">NON PRESENTE</span>'
            : `
              <div class="battery-indicator">
                <div class="battery-bar">
                  <div class="battery-fill ${getBatteryClass(
                    vehicle.stato_batteria
                  )}" 
                       style="width: ${vehicle.stato_batteria}%"></div>
                </div>
                <span class="battery-text">${vehicle.stato_batteria}%</span>
              </div>
            `
        }
      </td>
      <td>
        <div class="rating-cell" onclick="openFeedbackModal(${
          vehicle.id_mezzo
        }, '${vehicle.codice_identificativo}')" style="cursor: pointer;">
          <span id="rating-${
            vehicle.id_mezzo
          }" class="rating-stars">⭐ Caricamento...</span>
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewVehicleDetail(${
            vehicle.id_mezzo
          })" title="Visualizza dettagli">
            <i class="fas fa-eye"></i>
          </button>
          
          <button class="btn-action btn-edit" ${
            vehicle.stato === "in_uso" ? "disabled" : ""
          } onclick="openEditVehicleModal(${vehicle.id_mezzo}, '${
        vehicle.tipo_mezzo
      }', ${vehicle.id_parcheggio}, '${vehicle.stato}', ${
        vehicle.stato_batteria || "null"
      })" title="${
        vehicle.stato === "in_uso"
          ? "Mezzo in uso - Non modificabile"
          : "Modifica mezzo"
      }">
  <i class="fas fa-pencil"></i>
</button>

<button class="btn-action btn-delete" ${
        vehicle.stato === "in_uso" ? "disabled" : ""
      } onclick="openDeleteModal(${vehicle.id_mezzo}, '${
        vehicle.tipo_mezzo
      }', '${vehicle.codice_identificativo}')" title="${
        vehicle.stato === "in_uso"
          ? "Mezzo in uso - Non eliminabile"
          : "Elimina mezzo"
      }">
  <i class="fas fa-trash"></i>
</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  paginatedVehicles.forEach((vehicle) => {
    loadVehicleRating(vehicle.id_mezzo);
  });
}

async function loadVehicleRating(vehicleId) {
  try {
    const response = await fetch(`/feedback/vehicle/${vehicleId}/rating`);

    if (!response.ok) throw new Error("Errore caricamento rating");

    const data = await response.json();
    const ratingElement = document.getElementById(`rating-${vehicleId}`);

    if (ratingElement) {
      if (data.total_feedbacks === 0) {
        ratingElement.innerHTML = `<span style="color: var(--light-text);">Nessun feedback</span>`;
      } else {
        const avgRating = data.average_rating;
        ratingElement.innerHTML = `<span style="margin-left: 8px; font-size: 12px; color: var(--light-text);">${avgRating}/5 (${data.total_feedbacks})</span>`;
      }
    }
  } catch (error) {
    console.error("❌ Errore caricamento rating:", error);
  }
}

function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = "";

  for (let i = 0; i < fullStars; i++) {
    stars += "⭐";
  }

  if (hasHalfStar && fullStars < 5) {
    stars += "⭐";
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars += "☆";
  }

  return stars;
}

async function openFeedbackModal(vehicleId, vehicleCode) {
  currentFeedbackVehicleId = vehicleId;

  try {
    feedbackVehicleTitle.textContent = `Feedback - ${vehicleCode}`;

    const ratingResponse = await fetch(`/feedback/vehicle/${vehicleId}/rating`);
    const ratingData = await ratingResponse.json();

    if (ratingData.total_feedbacks === 0) {
      showSnackbar("Nessun feedback per questo mezzo", "info");
      return;
    }

    const feedbackResponse = await fetch(`/feedback/vehicle/${vehicleId}`);
    const feedbackData = await feedbackResponse.json();
    currentFeedbacks = feedbackData.feedbacks || [];

    renderFeedbacksList();
    feedbackVehicleModal.classList.remove("hidden");
  } catch (error) {
    console.error("❌ Errore caricamento feedback:", error);
  }
}

function renderFeedbacksList() {
  if (currentFeedbacks.length === 0) {
    feedbackVehicleBody.innerHTML =
      '<p style="text-align: center; color: var(--light-text);">Nessun feedback</p>';
    return;
  }

  feedbackVehicleBody.innerHTML = currentFeedbacks
    .map(
      (feedback, index) => `
    <div class="feedback-item" data-feedback-index="${index}">
      <div class="feedback-header">
        <div class="feedback-user">
          <strong>${feedback.user?.nome || "Utente Eliminato"} ${
        feedback.user?.cognome || ""
      }</strong>
          <span class="feedback-rating">${feedback.rating}/5</span>
        </div>
        <div class="feedback-date">
          ${formatDataBreve(feedback.data_ora)}
        </div>
      </div>
      ${
        feedback.commento
          ? `<div class="feedback-comment">${escapeHtml(
              feedback.commento
            )}</div>`
          : ""
      }
      <div class="feedback-actions">
        <button class="btn-feedback-delete" onclick="removeFeedback(${index})" title="Elimina feedback">
          Elimina
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

async function removeFeedback(index) {
  try {
    const feedbackToDelete = currentFeedbacks[index];
    const feedbackId = feedbackToDelete.id || feedbackToDelete.id_feedback;

    if (!feedbackId) {
      showSnackbar("❌ Errore: ID feedback non trovato", "error");
      return;
    }

    const deleteBtn = document.querySelector(
      `[data-feedback-index="${index}"] button`
    );
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Eliminazione...';
    }

    const response = await fetch(`/feedback/admin/${feedbackId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Errore durante l'eliminazione");
    }

    currentFeedbacks.splice(index, 1);
    renderFeedbacksList();

    if (currentFeedbackVehicleId) {
      loadVehicleRating(currentFeedbackVehicleId);
    }

    showSnackbar("✅ Feedback eliminato!", "success");
  } catch (error) {
    console.error("❌ Errore:", error);

    const deleteBtn = document.querySelector(
      `[data-feedback-index="${index}"] button`
    );
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = "Elimina";
    }
  }
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatDataBreve(data) {
  const date = new Date(data);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderPagination() {
  const totalPages = Math.ceil(vehicles.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button class="pagination-btn ${currentPage === 1 ? "disabled" : ""}" 
      onclick="goToPage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  }>
      <i class="fas fa-chevron-left"></i> Indietro
    </button>
  `;

  html += `
    <div class="pagination-info">
      Pagina ${currentPage} di ${totalPages}
    </div>
  `;

  html += `
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

function goToPage(page) {
  const totalPages = Math.ceil(vehicles.length / ITEMS_PER_PAGE);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderVehicles();
    renderPagination();
  }
}

function filterVehicles() {
  const searchTerm = searchInput.value.toLowerCase();
  const parkingValue = parkingFilter.value;
  const typeValue = typeFilter.value;
  const statusValue = statusFilter.value;

  vehicles = allVehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.codice_identificativo?.toLowerCase().includes(searchTerm) ||
      vehicle.id_mezzo.toString().includes(searchTerm);
    const matchesParking =
      !parkingValue || vehicle.id_parcheggio?.toString() === parkingValue;
    const matchesType = !typeValue || vehicle.tipo_mezzo === typeValue;
    const matchesStatus = !statusValue || vehicle.stato === statusValue;

    return matchesSearch && matchesParking && matchesType && matchesStatus;
  });

  currentPage = 1;
  renderVehicles();
  renderPagination();
}

async function viewVehicleDetail(vehicleId) {
  currentDetailVehicleId = vehicleId;

  try {
    const response = await fetch(`/vehicles/${vehicleId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento dettagli");

    const data = await response.json();
    const vehicle = data.vehicle;

    const detailHTML = `
      <div class="vehicle-detail-info">
        <div class="detail-section">
          <h3>Informazioni Generali</h3>
          
          <div class="detail-row">
            <span class="detail-label">Codice:</span>
            <span class="detail-value">${vehicle.codice_identificativo}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Tipo:</span>
            <span class="detail-value">${formatTipoMezzo(
              vehicle.tipo_mezzo
            )}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Parcheggio:</span>
            <span class="detail-value">${vehicle.parking?.nome || "N/A"}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Stato e Batteria</h3>
          <div class="detail-row">
            <span class="detail-label">Stato:</span>
            <span class="status-badge status-${vehicle.stato}">
              ${formatStato(vehicle.stato)}
            </span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Batteria:</span>
            ${
              vehicle.tipo_mezzo === "bicicletta_muscolare"
                ? '<span class="detail-value">Non presente</span>'
                : `<div class="battery-indicator">
                  <div class="battery-bar">
                    <div class="battery-fill ${getBatteryClass(
                      vehicle.stato_batteria
                    )}" 
                         style="width: ${vehicle.stato_batteria}%"></div>
                  </div>
                  <span class="battery-text">${vehicle.stato_batteria}%</span>
                </div>`
            }
          </div>
        </div>

        <div class="detail-section">
          <h3>Informazioni</h3>
          <div class="detail-row">
            <span class="detail-label">Tariffa:</span>
            <span class="detail-value">€${parseFloat(
              vehicle.tariffa_minuto
            ).toFixed(2)}/min</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data Creazione:</span>
            <span class="detail-value">${formatData(vehicle.creato_il)}</span>
          </div>
        </div>
      </div>
    `;

    vehicleDetailBody.innerHTML = detailHTML;
    vehicleDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

function clearAddErrors() {
  addErrors.innerHTML = "";
}

function showAddErrorsInModal(errorMessages) {
  addErrors.innerHTML = `<div class="error-message">${errorMessages}</div>`;
}

async function refreshParkingDropdowns() {
  try {
    const response = await fetch("parking/data", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento parcheggi");

    const data = await response.json();

    parcheggio.innerHTML = "";
    editParcheggio.innerHTML = "";

    data.parkings
      .filter((parking) => parking.posti_liberi > 0)
      .forEach((parking) => {
        const option1 = document.createElement("option");
        option1.value = parking.id_parcheggio;
        option1.textContent = `${parking.nome}`;
        parcheggio.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = parking.id_parcheggio;
        option2.textContent = `${parking.nome}`;
        editParcheggio.appendChild(option2);
      });
  } catch (error) {
    console.error("❌ Errore aggiornamento parcheggi:", error);
  }
}

function openAddVehicleModal() {
  addVehicleForm.reset();
  clearAddErrors();
  refreshParkingDropdowns();
  addVehicleModal.classList.remove("hidden");
}

async function confirmAddVehicle() {
  clearAddErrors();

  const tipo_mezzo = tipoMezzoInput.value?.trim();
  const id_parcheggio = parcheggio.value?.trim();
  const codice_identificativo = codiceInput.value?.trim();

  const errors = [];

  if (!tipo_mezzo) {
    errors.push("Seleziona un tipo di mezzo");
  }

  if (!id_parcheggio) {
    errors.push("Seleziona un parcheggio");
  }

  if (!codice_identificativo || codice_identificativo.length < 2) {
    errors.push("Il codice deve avere almeno 2 caratteri");
  }

  if (errors.length > 0) {
    showAddErrorsInModal(errors[0]);
    return;
  }

  try {
    confirmAddVehicleBtn.disabled = true;
    confirmAddVehicleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Creazione...';

    const response = await fetch("/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        tipo_mezzo,
        id_parcheggio: parseInt(id_parcheggio),
        codice_identificativo: codice_identificativo || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      if (error.errors && Array.isArray(error.errors)) {
        showAddErrorsInModal(error.errors[0]);
        return;
      }

      if (error.error) {
        showAddErrorsInModal(error.error);
        return;
      }

      throw new Error("Errore durante la creazione del mezzo");
    }

    const data = await response.json();
    showSnackbar("✅ Mezzo creato con successo!", "success");
    closeAllModals();

    resetFilters();
    loadAllVehicles();
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmAddVehicleBtn.disabled = false;
    confirmAddVehicleBtn.innerHTML = "Crea Mezzo";
  }
}

async function openEditVehicleModal(
  vehicleId,
  tipoMezzo,
  idParcheggio,
  stato,
  statoBatteria
) {
  currentEditVehicleId = vehicleId;

  const vehicle = allVehicles.find((v) => v.id_mezzo === vehicleId);
  editVehicleCode.textContent = vehicle.codice_identificativo;
  editVehicleType.textContent = formatTipoMezzo(tipoMezzo);
  editVehicleStatus.textContent = formatStato(stato);

  refreshParkingDropdowns();

  editParcheggio.value = idParcheggio;
  const batteryAttualeFromDB = vehicle.stato_batteria;

  const maintenanceToggle = document.getElementById("editMaintenanceToggle");
  const maintenanceStatus = document.getElementById("editMaintenanceStatus");
  const maintenanceWrapper = document.querySelector(
    ".maintenance-toggle-wrapper"
  );
  const maintenanceLabel = document.getElementById("editMaintenanceLabel");

  maintenanceToggle.disabled = false;
  maintenanceWrapper.classList.remove("disabled");

  if (stato === "disponibile" || stato === "in_manutenzione") {
    maintenanceWrapper.style.display = "block";
    maintenanceToggle.checked = false;
  } else {
    maintenanceWrapper.style.display = "none";
    maintenanceLabel.style.display = "none";
  }

  if (stato === "in_manutenzione") {
    maintenanceToggle.checked = true;
    updateMaintenanceStatus();
  }

  if (maintenanceToggle.checked) {
    maintenanceStatus.innerHTML = `
      <span style="color: #ff6b6b; font-weight: 600; font-size: 13px;">
        🔧 In manutenzione
      </span>
    `;
    maintenanceStatus.classList.add("active");
  } else {
    maintenanceStatus.innerHTML = `
      <span style="color: var(--light-text); font-weight: 500; font-size: 13px;">
        ✅ Non in manutenzione
      </span>
    `;
    maintenanceStatus.classList.remove("active");
  }

  updateEditModalDisabledState();

  try {
    const response = await fetch(`/vehicles/${vehicleId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento report");

    const data = await response.json();
    const reportInLavorazione = data.report_in_lavorazione || 0;

    if (stato === "in_manutenzione" && reportInLavorazione > 0) {
      maintenanceToggle.disabled = true;
      maintenanceWrapper.classList.add("disabled");
      maintenanceStatus.innerHTML = `
        <span style="color: var(--error-red); font-weight: bold; font-size: 13px;">
          C'è ${reportInLavorazione} report in lavorazione
        </span>
      `;
    } else if (stato === "disponibile") {
      maintenanceToggle.disabled = false;
      maintenanceWrapper.classList.remove("disabled");
      updateMaintenanceStatus();
    }
  } catch (error) {
    console.error("❌ Errore caricamento report:", error);
    if (stato === "disponibile") {
      maintenanceToggle.disabled = false;
      maintenanceWrapper.classList.remove("disabled");
      updateMaintenanceStatus();
    }
  }

  if (tipoMezzo === "bicicletta_muscolare" || statoBatteria === 100) {
    batteryGroupEdit.style.display = "none";
  } else {
    batteryGroupEdit.style.display = "block";
    const minValue = batteryAttualeFromDB;

    editBatterySlider.min = minValue;
    editBatterySlider.max = 100;
    editBatteryPercentage.min = minValue;
    editBatteryPercentage.max = 100;

    requestAnimationFrame(() => {
      editBatterySlider.value = minValue;
      editBatteryPercentage.value = minValue;
      updateEditBatteryInfo(minValue);
    });
  }

  editVehicleModal.classList.remove("hidden");
}

function updateMaintenanceStatus() {
  const maintenanceToggle = document.getElementById("editMaintenanceToggle");
  const maintenanceStatus = document.getElementById("editMaintenanceStatus");

  if (maintenanceToggle.disabled) {
    return;
  }

  if (maintenanceToggle.checked) {
    maintenanceStatus.innerHTML = `
      <span style="color: #ff6b6b; font-weight: 600; font-size: 13px;">
        🔧 In manutenzione
      </span>
    `;
    maintenanceStatus.classList.add("active");
  } else {
    maintenanceStatus.innerHTML = `
      <span style="color: var(--light-text); font-weight: 500; font-size: 13px;">
        ✅ Non in manutenzione
      </span>
    `;
    maintenanceStatus.classList.remove("active");
  }
}

function updateEditBatteryInfo(value) {
  let info = "";
  if (value <= 20) {
    info = "⚠️ Batteria bassa - Mezzo non prelevabile";
  } else if (value < 50) {
    info = "📍 Batteria media - Disponibile";
  } else if (value < 80) {
    info = "🔋 Batteria buona - Disponibile";
  } else {
    info = "✅ Batteria carica - Disponibile";
  }
  editBatteryInfo.textContent = info;
}

async function confirmEditVehicle() {
  const idParcheggio = editParcheggio.value;
  const maintenanceToggle = document.getElementById("editMaintenanceToggle");
  const isInMaintenance = maintenanceToggle.checked;

  const vehicle = allVehicles.find((v) => v.id_mezzo === currentEditVehicleId);
  const tipoMezzo = vehicle.tipo_mezzo;
  const stato = isInMaintenance ? "in_manutenzione" : "disponibile";
  const batteriaPrecedente = vehicle.stato_batteria;

  let statoBatteria = undefined;
  let needsRecharge = false;

  if (tipoMezzo !== "bicicletta_muscolare" && batteriaPrecedente !== 100) {
    statoBatteria = parseInt(editBatteryPercentage.value);

    if (statoBatteria !== batteriaPrecedente) {
      needsRecharge = true;
    }
  }

  try {
    confirmEditVehicleBtn.disabled = true;
    confirmEditVehicleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';

    if (needsRecharge) {
      const response = await fetch(
        `/vehicles/${currentEditVehicleId}/recharge-battery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            nuova_percentuale_batteria: statoBatteria,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore ricarica batteria");
      }

      const data = await response.json();
      showSnackbar(
        data.avviso || "✅ Batteria ricaricata con successo!",
        "success"
      );
    } else {
      const body = {
        tipo_mezzo: tipoMezzo,
        id_parcheggio: parseInt(idParcheggio),
        stato: stato,
      };

      const response = await fetch(`/vehicles/${currentEditVehicleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore modifica mezzo");
      }

      showSnackbar("✅ Mezzo modificato con successo!", "success");
    }

    closeAllModals();

    resetFilters();
    loadAllVehicles();
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmEditVehicleBtn.disabled = false;
    confirmEditVehicleBtn.innerHTML = "Salva";
  }
}

function openDeleteModal(vehicleId, tipo, code) {
  currentVehicleId = vehicleId;
  deleteVehicleType.textContent = formatTipoMezzo(tipo);
  deleteVehicleCode.textContent = code;
  deleteVehicleModal.classList.remove("hidden");
}

async function confirmDelete() {
  try {
    confirmDeleteVehicleBtn.disabled = true;
    confirmDeleteVehicleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Eliminazione...';

    const response = await fetch(`/vehicles/${currentVehicleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore eliminazione");

    showSnackbar("✅ Mezzo eliminato con successo!", "success");
    closeAllModals();

    loadAllVehicles();
    loadVehicleStatistics();
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmDeleteVehicleBtn.disabled = false;
    confirmDeleteVehicleBtn.innerHTML = "Elimina";
  }
}

function updateStats() {
  document.getElementById("statDisponibili").textContent = allVehicles.filter(
    (v) => v.stato === "disponibile"
  ).length;
  document.getElementById("statInUso").textContent = allVehicles.filter(
    (v) => v.stato === "in_uso"
  ).length;
  document.getElementById("statManutenzione").textContent = allVehicles.filter(
    (v) => v.stato === "in_manutenzione"
  ).length;
  document.getElementById("statNonPrelevabili").textContent =
    allVehicles.filter((v) => v.stato === "non_prelevabile").length;
}

function closeAllModals() {
  currentDetailVehicleId = null;
  vehicleDetailModal.classList.add("hidden");
  addVehicleModal.classList.add("hidden");
  editVehicleModal.classList.add("hidden");
  deleteVehicleModal.classList.add("hidden");
  feedbackVehicleModal.classList.add("hidden");
}

function showSnackbar(message, type = "success") {
  snackbar.textContent = message;
  snackbar.className = `snackbar show`;
  if (type === "error") snackbar.classList.add("snackbar--error");
  if (type === "warning") snackbar.classList.add("snackbar--warning");

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3000);
}

function formatTipoMezzo(tipo) {
  const map = {
    monopattino: "Monopattino",
    bicicletta_muscolare: "Bicicletta Muscolare",
    bicicletta_elettrica: "Bicicletta Elettrica",
  };
  return map[tipo] || tipo;
}

function formatStato(stato) {
  const map = {
    disponibile: "Disponibile",
    in_uso: "In Uso",
    in_manutenzione: "In Manutenzione",
    non_prelevabile: "Non Prelevabile",
  };
  return map[stato] || stato;
}

function getBatteryClass(battery) {
  if (battery <= 20) return "critical";
  if (battery <= 50) return "low";
  return "";
}

function formatData(data) {
  const date = new Date(data);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortVehicles(vehiclesToSort) {
  return vehiclesToSort.sort((a, b) => {
    const typeOrder = {
      bicicletta_muscolare: 1,
      monopattino: 2,
      bicicletta_elettrica: 3,
    };

    const typeA = typeOrder[a.tipo_mezzo] || 999;
    const typeB = typeOrder[b.tipo_mezzo] || 999;

    if (typeA !== typeB) {
      return typeA - typeB;
    }

    if (a.tipo_mezzo === "bicicletta_muscolare") {
      return 0;
    }

    const batteryA = a.stato_batteria || 0;
    const batteryB = b.stato_batteria || 0;

    return batteryA - batteryB;
  });
}

function resetFilters() {
  searchInput.value = "";
  parkingFilter.value = "";
  typeFilter.value = "";
  statusFilter.value = "";
  currentPage = 1;
}

function updateEditModalDisabledState() {
  const maintenanceToggle = document.getElementById("editMaintenanceToggle");
  const isInMaintenance = maintenanceToggle.checked;

  if (isInMaintenance) {
    editParcheggio.disabled = true;
    editParcheggio.style.opacity = "0.5";
    editParcheggio.style.cursor = "not-allowed";

    editBatterySlider.disabled = true;
    editBatteryPercentage.disabled = true;
    batteryGroupEdit.style.opacity = "0.5";
    batteryGroupEdit.style.cursor = "not-allowed";
  } else {
    editParcheggio.disabled = false;
    editParcheggio.style.opacity = "1";
    editParcheggio.style.cursor = "pointer";

    editBatterySlider.disabled = false;
    editBatteryPercentage.disabled = false;
    batteryGroupEdit.style.opacity = "1";
    batteryGroupEdit.style.cursor = "auto";
  }
}
