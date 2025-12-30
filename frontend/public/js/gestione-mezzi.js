// ===== PAGINATION VARIABLES =====
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let paginationContainer = document.getElementById("paginationContainer");

// ===== STATO GLOBALE =====
let vehicles = [];
let allVehicles = [];
let currentVehicleId = null;
let currentEditVehicleId = null;

// ===== DOM ELEMENTS =====
const vehiclesTableBody = document.getElementById("vehiclesTableBody");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");
const snackbar = document.getElementById("snackbar");

// Modal: Detail
const vehicleDetailModal = document.getElementById("vehicleDetailModal");
const vehicleDetailBody = document.getElementById("vehicleDetailBody");
const closeVehicleDetailBtn = document.getElementById("closeVehicleDetailBtn");

// Modal: Add Vehicle
const addVehicleModal = document.getElementById("addVehicleModal");
const addVehicleForm = document.getElementById("addVehicleForm");
const tipoMezzoInput = document.getElementById("tipoMezzoInput");
const parcheggio = document.getElementById("parcheggio");
const codiceInput = document.getElementById("codiceInput");
const addErrors = document.getElementById("addErrors");
const cancelAddVehicleBtn = document.getElementById("cancelAddVehicleBtn");
const confirmAddVehicleBtn = document.getElementById("confirmAddVehicleBtn");

// Modal: Edit Vehicle
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

// Modal: Delete Vehicle
const deleteVehicleModal = document.getElementById("deleteVehicleModal");
const deleteVehicleType = document.getElementById("deleteVehicleType");
const deleteVehicleCode = document.getElementById("deleteVehicleCode");
const cancelDeleteVehicleBtn = document.getElementById(
  "cancelDeleteVehicleBtn"
);
const confirmDeleteVehicleBtn = document.getElementById(
  "confirmDeleteVehicleBtn"
);

// Modal close buttons
const modalCloseButtons = document.querySelectorAll(".modal-close");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  loadAllVehicles();
  loadParkings();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Search & Filter
  searchInput.addEventListener("input", filterVehicles);
  typeFilter.addEventListener("change", filterVehicles);
  statusFilter.addEventListener("change", filterVehicles);

  // Modal close buttons
  modalCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });
  closeVehicleDetailBtn.addEventListener("click", closeAllModals);
  closeEditVehicleBtn.addEventListener("click", closeAllModals);

  // Add Vehicle Modal
  cancelAddVehicleBtn.addEventListener("click", closeAllModals);
  confirmAddVehicleBtn.addEventListener("click", confirmAddVehicle);

  // Edit Vehicle Modal
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

  // Delete Vehicle Modal
  cancelDeleteVehicleBtn.addEventListener("click", closeAllModals);
  confirmDeleteVehicleBtn.addEventListener("click", confirmDelete);

  // Close modal quando clicchi fuori
  const modals = [
    vehicleDetailModal,
    addVehicleModal,
    editVehicleModal,
    deleteVehicleModal,
  ];
  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-overlay")) {
        closeAllModals();
      }
    });
  });
}

// ===== LOAD VEHICLES =====
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
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== LOAD PARKINGS =====
async function loadParkings() {
  try {
    const response = await fetch("/parking/data", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento parcheggi");

    const data = await response.json();

    data.parkings.forEach((parking) => {
      const option1 = document.createElement("option");
      option1.value = parking.id_parcheggio;
      option1.textContent = parking.nome;
      parcheggio.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = parking.id_parcheggio;
      option2.textContent = parking.nome;
      editParcheggio.appendChild(option2);
    });
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== RENDER VEHICLES TABLE =====
function renderVehicles() {
  // Ordina i mezzi per tipo: muscolare → monopattino → elettrica
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const typeOrder = {
      bicicletta_muscolare: 1,
      monopattino: 2,
      bicicletta_elettrica: 3,
    };
    return (typeOrder[a.tipo_mezzo] || 0) - (typeOrder[b.tipo_mezzo] || 0);
  });

  // ===== PAGINAZIONE =====
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVehicles = sortedVehicles.slice(startIndex, endIndex);

  if (sortedVehicles.length === 0) {
    vehiclesTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">
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
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewVehicleDetail(${
            vehicle.id_mezzo
          })" 
                  title="Visualizza dettagli">
            <i class="fas fa-eye"></i>
          </button>
          
          <button class="btn-action btn-edit" onclick="openEditVehicleModal(${
            vehicle.id_mezzo
          }, '${vehicle.tipo_mezzo}', ${vehicle.id_parcheggio}, '${
        vehicle.stato
      }', ${vehicle.stato_batteria || "null"})" 
                  title="Modifica mezzo">
            <i class="fas fa-pencil"></i>
          </button>
          
          <button class="btn-action btn-delete" onclick="openDeleteModal(${
            vehicle.id_mezzo
          }, '${vehicle.tipo_mezzo}', '${vehicle.codice_identificativo}')" 
                  title="Elimina mezzo">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// ===== RENDER PAGINATION =====
function renderPagination() {
  const totalPages = Math.ceil(vehicles.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let html = "";

  // Previous button
  html += `
    <button class="pagination-btn ${currentPage === 1 ? "disabled" : ""}" 
      onclick="goToPage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  }>
      <i class="fas fa-chevron-left"></i> Indietro
    </button>
  `;

  // Info paginazione: "Pagina 1 di 27"
  html += `
    <div class="pagination-info">
      Pagina ${currentPage} di ${totalPages}
    </div>
  `;

  // Next button
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

// ===== GO TO PAGE =====
function goToPage(page) {
  const totalPages = Math.ceil(vehicles.length / ITEMS_PER_PAGE);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderVehicles();
    renderPagination();
  }
}

// ===== FILTER VEHICLES =====
function filterVehicles() {
  const searchTerm = searchInput.value.toLowerCase();
  const typeValue = typeFilter.value;
  const statusValue = statusFilter.value;

  vehicles = allVehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.codice_identificativo?.toLowerCase().includes(searchTerm) ||
      vehicle.id_mezzo.toString().includes(searchTerm);
    const matchesType = !typeValue || vehicle.tipo_mezzo === typeValue;
    const matchesStatus = !statusValue || vehicle.stato === statusValue;

    return matchesSearch && matchesType && matchesStatus;
  });

  currentPage = 1;
  renderVehicles();
  renderPagination();
}

// ===== VIEW VEHICLE DETAIL =====
async function viewVehicleDetail(vehicleId) {
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

// ===== CLEAR ADD ERRORS =====
function clearAddErrors() {
  addErrors.innerHTML = "";
}

// ===== SHOW ADD ERRORS =====
function showAddErrorsInModal(errorMessages) {
  addErrors.innerHTML = `<div class="error-message">${errorMessages}</div>`;
}

// ===== OPEN ADD VEHICLE MODAL =====
function openAddVehicleModal() {
  addVehicleForm.reset();
  clearAddErrors();
  addVehicleModal.classList.remove("hidden");
}

// ===== CONFIRM ADD VEHICLE =====
async function confirmAddVehicle() {
  // Pulisci errori precedenti
  clearAddErrors();

  const tipo_mezzo = tipoMezzoInput.value?.trim();
  const id_parcheggio = parcheggio.value?.trim();
  const codice_identificativo = codiceInput.value?.trim();

  // Validazione client-side
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

  // Se ci sono errori di validazione, mostrarli nella modal
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

      // Se il backend ritorna errori specifici
      if (error.errors && Array.isArray(error.errors)) {
        showAddErrorsInModal(error.errors[0]);
        return;
      }

      // Se è un errore generico
      if (error.error) {
        showAddErrorsInModal(error.error);
        return;
      }

      throw new Error("Errore durante la creazione del mezzo");
    }

    const data = await response.json();
    showSnackbar("✅ Mezzo creato con successo!", "success");
    closeAllModals();
    loadAllVehicles();
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmAddVehicleBtn.disabled = false;
    confirmAddVehicleBtn.innerHTML = "Crea Mezzo";
  }
}

// ===== OPEN EDIT VEHICLE MODAL =====
function openEditVehicleModal(
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

  editParcheggio.value = idParcheggio;

  // Nascondi batteria se muscolare o se batteria è al 100%
  if (tipoMezzo === "bicicletta_muscolare" || statoBatteria === 100) {
    batteryGroupEdit.style.display = "none";
  } else {
    batteryGroupEdit.style.display = "block";
    editBatterySlider.value = statoBatteria || 50;
    editBatteryPercentage.value = statoBatteria || 50;
    editBatterySlider.min = statoBatteria; // Non puoi scendere sotto il valore attuale
    editBatteryPercentage.min = statoBatteria;
    updateEditBatteryInfo(statoBatteria || 50);
  }

  editVehicleModal.classList.remove("hidden");
}

// ===== UPDATE EDIT BATTERY INFO =====
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

// ===== CONFIRM EDIT VEHICLE =====
async function confirmEditVehicle() {
  const idParcheggio = editParcheggio.value;

  // Prendi il tipo e lo stato dal vehicle stesso (non modificabili)
  const vehicle = allVehicles.find((v) => v.id_mezzo === currentEditVehicleId);
  const tipoMezzo = vehicle.tipo_mezzo;
  const stato = vehicle.stato;
  const batteriaPrecedente = vehicle.stato_batteria;

  let statoBatteria = undefined;
  let needsRecharge = false;

  // Se c'è una modifica batteria (solo se non muscolare e non al 100%)
  if (tipoMezzo !== "bicicletta_muscolare" && batteriaPrecedente !== 100) {
    statoBatteria = parseInt(editBatteryPercentage.value);

    // Se batteria è stata modificata, usa recharge-battery
    if (statoBatteria !== batteriaPrecedente) {
      needsRecharge = true;
    }
  }

  if (!idParcheggio) {
    showSnackbar("Seleziona un parcheggio", "warning");
    return;
  }

  try {
    confirmEditVehicleBtn.disabled = true;
    confirmEditVehicleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';

    // Se la batteria è stata modificata, usa recharge-battery
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
      // Altrimenti modifica solo il parcheggio
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
    loadAllVehicles();
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar(error.message, "error");
  } finally {
    confirmEditVehicleBtn.disabled = false;
    confirmEditVehicleBtn.innerHTML = "Salva";
  }
}

// ===== OPEN DELETE MODAL =====
function openDeleteModal(vehicleId, tipo, code) {
  currentVehicleId = vehicleId;
  deleteVehicleType.textContent = formatTipoMezzo(tipo);
  deleteVehicleCode.textContent = code;
  deleteVehicleModal.classList.remove("hidden");
}

// ===== CONFIRM DELETE =====
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
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar(error.message, "error");
  } finally {
    confirmDeleteVehicleBtn.disabled = false;
    confirmDeleteVehicleBtn.innerHTML = "Elimina";
  }
}

// ===== UPDATE STATS =====
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

// ===== CLOSE ALL MODALS =====
function closeAllModals() {
  vehicleDetailModal.classList.add("hidden");
  addVehicleModal.classList.add("hidden");
  editVehicleModal.classList.add("hidden");
  deleteVehicleModal.classList.add("hidden");
}

// ===== SNACKBAR =====
function showSnackbar(message, type = "success") {
  snackbar.textContent = message;
  snackbar.className = `snackbar show`;
  if (type === "error") snackbar.classList.add("snackbar--error");
  if (type === "warning") snackbar.classList.add("snackbar--warning");

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3000);
}

// ===== UTILITY FUNCTIONS =====
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
    in_manutenzione: "Manutenzione",
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
