// ===== PAGINATION VARIABLES =====
const ITEMS_PER_PAGE = 5;
let currentPage = 1;
let paginationContainer = document.getElementById("paginationContainer");

// ===== STATO GLOBALE =====
let parkings = [];
let allParkings = [];
let currentParkingId = null;
let currentEditParkingId = null;

// ===== DOM ELEMENTS =====
const parkingsTableBody = document.getElementById("parkingsTableBody");
const searchInput = document.getElementById("searchInput");
const snackbar = document.getElementById("snackbar");

// Modal: Add Parking
const addParkingModal = document.getElementById("addParkingModal");
const addParkingForm = document.getElementById("addParkingForm");
const nomeInput = document.getElementById("nomeInput");
const latitudineInput = document.getElementById("latitudineInput");
const longitudineInput = document.getElementById("longitudineInput");
const capacitaInput = document.getElementById("capacitaInput");
const addErrors = document.getElementById("addErrors");
const confirmAddParkingBtn = document.getElementById("confirmAddParkingBtn");

// Modal: Edit Parking
const editParkingModal = document.getElementById("editParkingModal");
const editParkingForm = document.getElementById("editParkingForm");
const editNomeInput = document.getElementById("editNomeInput");
const editLatitudineInput = document.getElementById("editLatitudineInput");
const editLongitudineInput = document.getElementById("editLongitudineInput");
const editCapacitaInput = document.getElementById("editCapacitaInput");
const capacitaInfo = document.getElementById("capacitaInfo");
const editErrors = document.getElementById("editErrors");
const confirmEditParkingBtn = document.getElementById("confirmEditParkingBtn");

// Modal: Delete Parking
const deleteParkingModal = document.getElementById("deleteParkingModal");
const deleteParkingName = document.getElementById("deleteParkingName");
const deleteErrors = document.getElementById("deleteErrors");
const confirmDeleteParkingBtn = document.getElementById(
  "confirmDeleteParkingBtn"
);

// Modal: Detail
const parkingDetailModal = document.getElementById("parkingDetailModal");
const detailParkingName = document.getElementById("detailParkingName");
const parkingDetailBody = document.getElementById("parkingDetailBody");

// Parking Usage Container
const parkingUsageContainer = document.getElementById("parkingUsageContainer");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  loadAllParkings();
  loadParkingUsageStatistics();

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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  searchInput.addEventListener("input", filterParkings);

  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });

  // Click outside modal
  [
    addParkingModal,
    editParkingModal,
    deleteParkingModal,
    parkingDetailModal,
    parkingStatisticsModal,
  ].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-overlay")) {
        closeAllModals();
      }
    });
  });
}

// ===== LOAD ALL PARKINGS =====
async function loadAllParkings() {
  try {
    const response = await fetch("/parking/data", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento parcheggi");

    const data = await response.json();

    // ✅ Converti stringhe in numeri
    allParkings = data.parkings.map((p) => ({
      ...p,
      latitudine: parseFloat(p.latitudine),
      longitudine: parseFloat(p.longitudine),
      capacita: parseInt(p.capacita),
    }));

    parkings = [...allParkings];

    renderParkings();
    renderPagination();
    updateStats();
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== LOAD PARKING USAGE STATISTICS =====
async function loadParkingUsageStatistics() {
  try {
    const response = await fetch("/statistics/parking-usage", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok)
      throw new Error("Errore caricamento statistiche utilizzo");

    const data = await response.json();
    renderParkingUsage(data.parcheggi_ordinati_per_utilizzo.slice(0, 5)); // Top 5
  } catch (error) {
    console.error("❌ Errore:", error);
    parkingUsageContainer.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>Errore caricamento statistiche</p>
      </div>
    `;
  }
}

// ===== RENDER PARKING USAGE =====
function renderParkingUsage(parkings) {
  const rankingEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const html = parkings
    .map(
      (parking, index) => `
      <div class="usage-card" style="animation-delay: ${index * 50}ms;">
        <div class="usage-ranking">
          ${rankingEmojis[index]}
        </div>
        
        <div class="usage-info">
          <div class="usage-name">${parking.nome}</div>
          <div class="usage-stats">
            <span>📊 ${parking.corse_totali} corse</span>
            <span>📍 ${parking.mezzi_presenti} mezzi</span>
            <span>⬆️ ${parking.corse_partenze} partenze</span>
            <span>⬇️ ${parking.corse_arrivi} arrivi</span>
          </div>
        </div>
        
        <div class="usage-bar">
          <div class="usage-bar-fill">
            <div class="usage-bar-progress" style="width: ${
              parking.utilizzo_percentuale
            }%"></div>
          </div>
          <div class="usage-percentage">${parking.utilizzo_percentuale}%</div>
        </div>
      </div>
    `
    )
    .join("");

  parkingUsageContainer.innerHTML = html;
}

// ===== RENDER PARKINGS TABLE =====
function renderParkings() {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedParkings = parkings.slice(startIndex, endIndex);

  if (parkings.length === 0) {
    parkingsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <p>Nessun parcheggio trovato</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  parkingsTableBody.innerHTML = paginatedParkings
    .map((parking) => {
      const occupati = parking.vehicles?.length || 0;
      const disponibili = parking.capacita - occupati;
      const percentuale = ((occupati / parking.capacita) * 100).toFixed(0);

      return `
    <tr>
      <td><strong style="cursor: pointer;" 
          onclick="openParkingStatisticsModal(${parking.id_parcheggio})">
    ${parking.nome}
  </strong></td>
      <td>
        <span class="badge">${parking.capacita}</span>
      </td>
      <td>
        <span style="color: #ff6b6b; font-weight: 600;">${occupati}</span>
      </td>
      <td>
        <span style="color: var(--primary-teal); font-weight: 600;">${disponibili}</span>
      </td>
      <td>
        <div class="occupazione-bar">
          <div class="bar">
            <div class="bar-fill ${
              percentuale > 80 ? "high" : ""
            }" style="width: ${percentuale}%"></div>
          </div>
          <span class="bar-text">${percentuale}%</span>
        </div>
      </td>
      <td>
        <span class="coordinates-badge" onclick="copyToClipboard('${parking.latitudine.toFixed(
          4
        )}, ${parking.longitudine.toFixed(4)}')">
  <i class="fas fa-map-pin"></i> ${parking.latitudine.toFixed(
    4
  )}, ${parking.longitudine.toFixed(4)}
</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewParkingDetail(${
            parking.id_parcheggio
          })" 
                  title="Visualizza dettagli">
            <i class="fas fa-eye"></i>
          </button>
          
          <button class="btn-action btn-edit" onclick="openEditParkingModal(${
            parking.id_parcheggio
          })" 
                  title="Modifica parcheggio">
            <i class="fas fa-pencil"></i>
          </button>
          
          <button class="btn-action btn-delete" onclick="openDeleteModal(${
            parking.id_parcheggio
          }, '${parking.nome}')" 
                  title="Elimina parcheggio">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
}

// ===== FILTER PARKINGS =====
function filterParkings() {
  const searchTerm = searchInput.value.toLowerCase();
  parkings = allParkings.filter((parking) =>
    parking.nome.toLowerCase().includes(searchTerm)
  );
  currentPage = 1;
  renderParkings();
  renderPagination();
}

// ===== VIEW PARKING DETAIL =====
async function viewParkingDetail(parkingId) {
  try {
    const response = await fetch(`/parking/${parkingId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento dettagli");

    const data = await response.json();
    const parking = data.parking;

    detailParkingName.textContent = parking.nome;

    const vehicles = parking.vehicles || [];
    const vehiclesByType = {
      bicicletta_muscolare: vehicles.filter(
        (v) => v.tipo_mezzo === "bicicletta_muscolare"
      ),
      monopattino: vehicles.filter((v) => v.tipo_mezzo === "monopattino"),
      bicicletta_elettrica: vehicles.filter(
        (v) => v.tipo_mezzo === "bicicletta_elettrica"
      ),
    };

    parkingDetailBody.innerHTML = `
      <div class="parking-detail-info">
        <div class="detail-section">
          <h3>Informazioni Generali</h3>
          <div class="detail-row">
            <span class="detail-label">Nome:</span>
            <span class="detail-value">${parking.nome}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Data Creazione:</span>
            <span class="detail-value">${formatData(parking.creato_il)}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Localizzazione</h3>
          <div class="detail-row">
            <span class="detail-label">Latitudine:</span>
            <span class="detail-value">${parseFloat(parking.latitudine).toFixed(
              6
            )}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Longitudine:</span>
            <span class="detail-value">${parseFloat(
              parking.longitudine
            ).toFixed(6)}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Occupazione</h3>
          <div class="detail-row">
            <span class="detail-label">Capacità:</span>
            <span class="detail-value">${parking.capacita}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Posti Occupati:</span>
            <span class="detail-value" style="color: #ff6b6b;">${
              parking.occupati
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Posti Disponibili:</span>
            <span class="detail-value" style="color: var(--primary-teal);">${
              parking.disponibili
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Percentuale Occupazione:</span>
            <span class="detail-value">${(
              (parking.occupati / parking.capacita) *
              100
            ).toFixed(1)}%</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Mezzi Parcheggiati (${vehicles.length})</h3>
          ${
            vehicles.length === 0
              ? '<p style="color: var(--light-text);">Nessun mezzo parcheggiato</p>'
              : `
            <div class="vehicles-breakdown">
              <div class="vehicle-type">
                <span><i class="fas fa-biking"></i> Biciclette Muscolari: <strong>${vehiclesByType.bicicletta_muscolare.length}</strong></span>
              </div>
              <div class="vehicle-type">
                <span><i class="fas fa-person-skating"></i> Monopattini Elettrici: <strong>${vehiclesByType.monopattino.length}</strong></span>
              </div>
              <div class="vehicle-type">
                <span><i class="fas fa-bolt"></i> Biciclette Elettriche: <strong>${vehiclesByType.bicicletta_elettrica.length}</strong></span>
              </div>
            </div>
          `
          }
        </div>
      </div>
    `;

    parkingDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== OPEN ADD PARKING MODAL =====
function openAddParkingModal() {
  addParkingForm.reset();
  addErrors.innerHTML = "";
  addParkingModal.classList.remove("hidden");
}

// ===== CONFIRM ADD PARKING =====
async function confirmAddParking() {
  addErrors.innerHTML = "";

  const nome = nomeInput.value?.trim();
  const latitudine = parseFloat(latitudineInput.value);
  const longitudine = parseFloat(longitudineInput.value);
  const capacita = parseInt(capacitaInput.value);

  const errors = [];

  if (!nome) errors.push("Il nome è obbligatorio");
  if (isNaN(latitudine) || latitudine < -90 || latitudine > 90)
    errors.push("Latitudine non valida (-90 a 90)");
  if (isNaN(longitudine) || longitudine < -180 || longitudine > 180)
    errors.push("Longitudine non valida (-180 a 180)");
  if (isNaN(capacita) || capacita < 1) errors.push("Capacità minimo 1");

  if (errors.length > 0) {
    addErrors.innerHTML = `<div class="error-message">${errors[0]}</div>`;
    return;
  }

  try {
    confirmAddParkingBtn.disabled = true;
    confirmAddParkingBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Creazione...';

    const response = await fetch("/parking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ nome, latitudine, longitudine, capacita }),
    });

    if (!response.ok) {
      const error = await response.json();
      addErrors.innerHTML = `<div class="error-message">${error.error}</div>`;
      return;
    }

    showSnackbar("✅ Parcheggio creato con successo!", "success");
    closeAllModals();
    loadAllParkings();
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmAddParkingBtn.disabled = false;
    confirmAddParkingBtn.innerHTML = "Crea Parcheggio";
  }
}

// ===== OPEN EDIT PARKING MODAL =====
function openEditParkingModal(parkingId) {
  currentEditParkingId = parkingId;
  const parking = allParkings.find((p) => p.id_parcheggio === parkingId);

  editNomeInput.value = parking.nome;
  editLatitudineInput.value = parking.latitudine;
  editLongitudineInput.value = parking.longitudine;
  editCapacitaInput.value = parking.capacita;

  const occupati = parking.vehicles?.length || 0;
  capacitaInfo.textContent = `Attualmente occupati: ${occupati} mezzo/i`;

  editErrors.innerHTML = "";
  editParkingModal.classList.remove("hidden");
}

// ===== CONFIRM EDIT PARKING =====
async function confirmEditParking() {
  editErrors.innerHTML = "";

  const nome = editNomeInput.value?.trim();
  const latitudine = parseFloat(editLatitudineInput.value);
  const longitudine = parseFloat(editLongitudineInput.value);
  const capacita = parseInt(editCapacitaInput.value);

  const errors = [];

  // Validation
  if (!nome) errors.push("Il nome è obbligatorio");
  if (isNaN(latitudine) || latitudine < -90 || latitudine > 90)
    errors.push("Latitudine non valida (-90 a 90)");
  if (isNaN(longitudine) || longitudine < -180 || longitudine > 180)
    errors.push("Longitudine non valida (-180 a 180)");
  if (isNaN(capacita) || capacita < 1) errors.push("Capacità minimo 1");

  // Check if capacity is enough
  const parking = allParkings.find(
    (p) => p.id_parcheggio === currentEditParkingId
  );
  const occupati = parking.vehicles?.length || 0;
  if (capacita < occupati) {
    errors.push(
      `Non puoi ridurre a ${capacita}: ci sono ${occupati} mezzi parcheggiati`
    );
  }

  if (errors.length > 0) {
    editErrors.innerHTML = `<div class="error-message">${errors[0]}</div>`;
    return;
  }

  try {
    confirmEditParkingBtn.disabled = true;
    confirmEditParkingBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';

    const response = await fetch(`/parking/${currentEditParkingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ nome, latitudine, longitudine, capacita }),
    });

    if (!response.ok) {
      const error = await response.json();
      editErrors.innerHTML = `<div class="error-message">${error.error}</div>`;
      return;
    }

    showSnackbar("✅ Parcheggio modificato con successo!", "success");
    closeAllModals();
    loadAllParkings();
  } catch (error) {
    console.error("❌ Errore:", error);
    editErrors.innerHTML = `<div class="error-message">Errore durante il salvataggio</div>`;
  } finally {
    confirmEditParkingBtn.disabled = false;
    confirmEditParkingBtn.innerHTML = "Salva Modifiche";
  }
}

// ===== OPEN DELETE MODAL =====
function openDeleteModal(parkingId, nome) {
  currentParkingId = parkingId;
  deleteParkingName.textContent = nome;
  deleteErrors.innerHTML = "";
  deleteParkingModal.classList.remove("hidden");
}

// ===== CONFIRM DELETE =====
async function confirmDeleteParking() {
  deleteErrors.innerHTML = "";

  try {
    confirmDeleteParkingBtn.disabled = true;
    confirmDeleteParkingBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Eliminazione...';

    const response = await fetch(`/parking/${currentParkingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) {
      const error = await response.json();
      deleteErrors.innerHTML = `<div class="error-message">${error.error}</div>`;
      return;
    }

    showSnackbar("✅ Parcheggio eliminato con successo!", "success");
    closeAllModals();
    loadAllParkings();
  } catch (error) {
    console.error("❌ Errore:", error);
    deleteErrors.innerHTML = `<div class="error-message">Errore durante l'eliminazione</div>`;
  } finally {
    confirmDeleteParkingBtn.disabled = false;
    confirmDeleteParkingBtn.innerHTML = "Elimina";
  }
}

// ===== UPDATE STATS =====
function updateStats() {
  const totalParcheggi = allParkings.length;
  const capacitaTot = allParkings.reduce((sum, p) => sum + p.capacita, 0);
  const occupatiTot = allParkings.reduce(
    (sum, p) => sum + (p.vehicles?.length || 0),
    0
  );
  const disponibiliTot = capacitaTot - occupatiTot;

  document.getElementById("statTotalParcheggi").textContent = totalParcheggi;
  document.getElementById("statCapacitaTot").textContent = capacitaTot;
  document.getElementById("statDisponibiliTot").textContent = disponibiliTot;
  document.getElementById("statOccupatiTot").textContent = occupatiTot;
}

// ===== RENDER PAGINATION =====
function renderPagination() {
  const totalPages = Math.ceil(parkings.length / ITEMS_PER_PAGE);

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

// ===== PARKING STATISTICS MODAL =====
const parkingStatisticsModal = document.getElementById(
  "parkingStatisticsModal"
);
const statisticsTitle = document.getElementById("statisticsTitle");
const statisticsBody = document.getElementById("statisticsBody");

let currentParkingStatisticsPage = 1;
let currentParkingStatisticsData = null;

async function openParkingStatisticsModal(parkingId) {
  try {
    statisticsBody.innerHTML =
      '<div class="loading">Caricamento statistiche...</div>';
    parkingStatisticsModal.classList.remove("hidden");

    const response = await fetch(`/statistics/parking`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento statistiche");

    const data = await response.json();
    const parking = data.parcheggi.find((p) => p.id_parcheggio === parkingId);

    if (!parking) {
      statisticsBody.innerHTML =
        '<p style="color: red;">Parcheggio non trovato</p>';
      return;
    }

    // Salva dati globali per paginazione
    currentParkingStatisticsData = parking;
    currentParkingStatisticsPage = 1;

    // Calcola percentuali per ogni stato
    const total = parking.total_mezzi || 1;
    const percDisponibili = Math.round(
      (parking.disponibili / parking.capacita) * 100
    );
    const percInUso = Math.round((parking.in_uso / total) * 100) || 0;
    const percManutenzione =
      Math.round((parking.in_manutenzione / total) * 100) || 0;
    const percNonPrelevabili =
      Math.round((parking.non_prelevabili / total) * 100) || 0;
    const percOccupati = Math.round(
      (parking.total_mezzi / parking.capacita) * 100
    );

    statisticsTitle.innerHTML = `📊 ${parking.nome}`;

    renderStatisticsContent(
      parking,
      percDisponibili,
      percInUso,
      percManutenzione,
      percNonPrelevabili,
      percOccupati
    );
  } catch (error) {
    console.error("❌ Errore:", error);
    statisticsBody.innerHTML =
      '<p style="color: red;">Errore caricamento statistiche</p>';
  }
}

// Funzione per determinare il colore della batteria
function getBatteryColor(batteria) {
  if (batteria < 20) return "#f44336"; // Rosso
  if (batteria < 50) return "#ff9800"; // Arancio
  return "var(--primary-teal)"; // Teal
}

// Renderizza il contenuto delle statistiche con paginazione
function renderStatisticsContent(
  parking,
  percDisponibili,
  percInUso,
  percManutenzione,
  percNonPrelevabili,
  percOccupati
) {
  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(parking.dettagli_mezzi.length / ITEMS_PER_PAGE);

  const startIndex = (currentParkingStatisticsPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMezzi = parking.dettagli_mezzi.slice(startIndex, endIndex);

  let vehiclesTableHTML = "";

  if (parking.dettagli_mezzi.length === 0) {
    vehiclesTableHTML =
      '<p style="color: var(--light-text); text-align: center;">Nessun mezzo presente</p>';
  } else {
    vehiclesTableHTML = `
      <table class="statistics-vehicles-table">
        <thead>
          <tr>
            <th>TIPO</th>
            <th>STATO</th>
            <th>BATTERIA</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedMezzi
            .map(
              (v) => `
            <tr>
              <td>${formatTipoMezzoShort(v.tipo)}</td>
              <td><span class="status-badge status-${v.stato}">${formatStato(
                v.stato
              )}</span></td>
              <td>
                ${
                  v.tipo === "bicicletta_muscolare"
                    ? '<span style="color: var(--light-text);">NON PRESENTE</span>'
                    : `<div class="battery-small">
                        <div class="battery-bar-small">
                          <div class="battery-fill-small" style="width: ${
                            v.batteria
                          }%; background: ${getBatteryColor(
                        v.batteria
                      )};"></div>
                        </div>
                        <span style="margin-left: 8px; font-weight: 600;">${
                          v.batteria
                        }%</span>
                      </div>`
                }
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  // ✅ Costruisci la paginazione HTML
  let paginationHTML = "";
  if (totalPages > 1) {
    paginationHTML = `
      <div class="pagination-container" style="margin-top: 16px; display: flex; justify-content: center; align-items: center; gap: 12px;">
        <button class="pagination-btn ${
          currentParkingStatisticsPage === 1 ? "disabled" : ""
        }" 
          onclick="goToParkingStatisticsPage(${
            currentParkingStatisticsPage - 1
          })" ${currentParkingStatisticsPage === 1 ? "disabled" : ""}>
          <i class="fas fa-chevron-left"></i> Indietro
        </button>
        <div class="pagination-info">Pagina ${currentParkingStatisticsPage} di ${totalPages}</div>
        <button class="pagination-btn ${
          currentParkingStatisticsPage === totalPages ? "disabled" : ""
        }" 
          onclick="goToParkingStatisticsPage(${
            currentParkingStatisticsPage + 1
          })" ${currentParkingStatisticsPage === totalPages ? "disabled" : ""}>
          Avanti <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
  }

  statisticsBody.innerHTML = `
    <div class="statistics-container">
      <!-- HEADER INFO -->
      <div class="statistics-header">
        <div class="stat-info">
          <span class="stat-label">CAPACITÀ</span>
          <span class="stat-big">${parking.capacita}</span>
        </div>
        <div class="stat-info">
          <span class="stat-label">OCCUPATI</span>
          <span class="stat-big" style="color: #ff6b6b;">${
            parking.total_mezzi
          }</span>
        </div>
        <div class="stat-info">
          <span class="stat-label">DISPONIBILI</span>
          <span class="stat-big" style="color: var(--primary-teal);">${
            parking.capacita - parking.total_mezzi
          }</span>
        </div>
      </div>

      <!-- OCCUPAZIONE BAR -->
      <div class="occupancy-bar-section">
        <h4 style="margin-bottom: 12px;">Occupazione (${parking.total_mezzi}/${
    parking.capacita
  })</h4>
        <div class="occupancy-bar-wrapper">
          <div class="occupancy-bar-large">
            <div class="occupancy-fill" style="width: ${percOccupati}%"></div>
          </div>
          <span class="occupancy-text-right">${percOccupati}%</span>
        </div>
      </div>

      <!-- BREAKDOWN BY STATO -->
      <div class="statistics-grid">
        <div class="stat-card-small">
          <div class="stat-icon-small available" style="color: #4caf50;"><i class="fas fa-check-circle"></i></div>
          <div class="stat-details">
            <span class="stat-label-small">DISPONIBILI</span>
            <span class="stat-value-small">${parking.disponibili}</span>
            <div class="progress-small">
              <div class="progress-fill-small" style="width: ${percDisponibili}%; background: #4caf50;"></div>
            </div>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-icon-small in-use" style="color: #2196f3;"><i class="fas fa-hourglass-half"></i></div>
          <div class="stat-details">
            <span class="stat-label-small">IN USO</span>
            <span class="stat-value-small">${parking.in_uso}</span>
            <div class="progress-small">
              <div class="progress-fill-small" style="width: ${percInUso}%; background: #2196f3;"></div>
            </div>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-icon-small maintenance" style="color: #ff9800;"><i class="fas fa-wrench"></i></div>
          <div class="stat-details">
            <span class="stat-label-small">IN MANUTENZIONE</span>
            <span class="stat-value-small">${parking.in_manutenzione}</span>
            <div class="progress-small">
              <div class="progress-fill-small" style="width: ${percManutenzione}%; background: #ff9800;"></div>
            </div>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-icon-small non-pickable" style="color: #f44336;"><i class="fas fa-ban"></i></div>
          <div class="stat-details">
            <span class="stat-label-small">NON PRELEVABILI</span>
            <span class="stat-value-small">${parking.non_prelevabili}</span>
            <div class="progress-small">
              <div class="progress-fill-small" style="width: ${percNonPrelevabili}%; background: #f44336;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- VEHICLE DETAILS TABLE -->
      <div class="vehicles-table-section">
        <h4 style="margin-bottom: 12px;">Mezzi nel Parcheggio (${
          parking.dettagli_mezzi.length
        })</h4>
        <!-- ✅ WRAPPER SCROLLABILE SOLO PER LA TABELLA -->
        <div class="vehicles-table-wrapper">
          ${vehiclesTableHTML}
        </div>
        <!-- ✅ PAGINAZIONE DENTRO vehicles-table-section -->
        ${paginationHTML}
      </div>
    </div>
  `;
}

// Funzione per la paginazione della tabella mezzi
function goToParkingStatisticsPage(page) {
  if (!currentParkingStatisticsData) return;

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(
    currentParkingStatisticsData.dettagli_mezzi.length / ITEMS_PER_PAGE
  );

  if (page >= 1 && page <= totalPages) {
    currentParkingStatisticsPage = page;

    // Ricalcola percentuali
    const total = currentParkingStatisticsData.total_mezzi || 1;
    const percDisponibili = Math.round(
      (currentParkingStatisticsData.disponibili /
        currentParkingStatisticsData.capacita) *
        100
    );
    const percInUso =
      Math.round((currentParkingStatisticsData.in_uso / total) * 100) || 0;
    const percManutenzione =
      Math.round(
        (currentParkingStatisticsData.in_manutenzione / total) * 100
      ) || 0;
    const percNonPrelevabili =
      Math.round(
        (currentParkingStatisticsData.non_prelevabili / total) * 100
      ) || 0;
    const percOccupati = Math.round(
      (currentParkingStatisticsData.total_mezzi /
        currentParkingStatisticsData.capacita) *
        100
    );

    renderStatisticsContent(
      currentParkingStatisticsData,
      percDisponibili,
      percInUso,
      percManutenzione,
      percNonPrelevabili,
      percOccupati
    );
  }
}

// Helper per formattare tipo mezzo in breve
function formatTipoMezzoShort(tipo) {
  const map = {
    monopattino: "Monopattino Elettrico",
    bicicletta_muscolare: "Bicicletta Muscolare",
    bicicletta_elettrica: "Bicicletta Elettrica",
  };
  return map[tipo] || tipo;
}

// ===== GO TO PAGE =====
function goToPage(page) {
  const totalPages = Math.ceil(parkings.length / ITEMS_PER_PAGE);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderParkings();
    renderPagination();
    window.scrollTo(0, 0);
  }
}

// ===== CLOSE ALL MODALS =====
function closeAllModals() {
  addParkingModal.classList.add("hidden");
  editParkingModal.classList.add("hidden");
  deleteParkingModal.classList.add("hidden");
  parkingDetailModal.classList.add("hidden");
  parkingStatisticsModal.classList.add("hidden");
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
function formatData(data) {
  const date = new Date(data);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Formatta lo stato del mezzo
function formatStato(stato) {
  const map = {
    disponibile: "Disponibile",
    in_uso: "In Uso",
    in_manutenzione: "Manutenzione",
    non_prelevabile: "Non Prelevabile",
  };
  return map[stato] || stato;
}

// ✅ FIXED: Funzione asincrona con await corretto
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSnackbar("📍 Coordinate copiate!", "success");
  } catch (err) {
    console.error("❌ Errore copia:", err);
  }
}
