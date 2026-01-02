// ============================================================================
// GESTIONE SEGNALAZIONI - LOGIC (ADMIN ONLY)
// ============================================================================

let allReports = [];
let currentReportId = null;
let currentPage = 1;
let itemsPerPage = 7;

// ---- INIT ----
document.addEventListener("DOMContentLoaded", () => {
  loadReports();
  setupEventListeners();
  setupFilters();
});

// ---- LOAD REPORTS ----
async function loadReports() {
  try {
    const response = await fetch("/reports", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore nel caricamento segnalazioni");

    const data = await response.json();
    allReports = data.reports || [];
    currentPage = 1; // Reset to first page
    renderReports(getPageData());
    updateStats(allReports);
    updatePagination();
  } catch (error) {
    console.error("❌ Errore caricamento:", error);
    showSnackbar("Errore nel caricamento delle segnalazioni", "error");
  }
}

// ---- GET PAGE DATA ----
function getPageData() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return allReports.slice(startIndex, endIndex);
}

// ---- RENDER REPORTS ----
function renderReports(reports) {
  const tbody = document.getElementById("reportsTableBody");

  if (allReports.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">
          <span class="empty-state-icon">📭</span>
          <p>Nessuna segnalazione trovata</p>
        </td>
      </tr>
    `;
    return;
  }

  if (reports.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">
          <span class="empty-state-icon">📭</span>
          <p>Nessuna segnalazione trovata per questa pagina</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reports
    .map(
      (report) => `
    <tr>
      <td><strong>#${report.id_segnalazione}</strong></td>
      <td>${report.id_mezzo}</td>
      <td>${formatProblemaType(report.tipo_problema)}</td>
      <td>${
        report.user ? `${report.user.nome} ${report.user.cognome}` : "N/A"
      }</td>
      <td>${formatData(report.data_ora)}</td>
      <td>${renderStatusBadge(report.stato_segnalazione)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewDetails(${
            report.id_segnalazione
          })" title="Visualizza">👁️</button>
          <button class="btn-action btn-delete" onclick="deleteReport(${
            report.id_segnalazione
          })" title="Elimina">🗑️</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// ---- UPDATE PAGINATION ----
function updatePagination() {
  const totalPages = Math.ceil(allReports.length / itemsPerPage);
  const paginationContainer = document.getElementById("paginationContainer");

  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.style.display = "flex";

  const btnIndietro = document.getElementById("btnIndietro");
  const btnAvanti = document.getElementById("btnAvanti");
  const paginationInfo = document.getElementById("paginationInfo");

  // Update pagination info
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, allReports.length);
  paginationInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;

  // Update button states
  btnIndietro.disabled = currentPage === 1;
  btnAvanti.disabled = currentPage === totalPages;

  // Remove old listeners and add new ones
  const newBtnIndietro = btnIndietro.cloneNode(true);
  const newBtnAvanti = btnAvanti.cloneNode(true);

  btnIndietro.parentNode.replaceChild(newBtnIndietro, btnIndietro);
  btnAvanti.parentNode.replaceChild(newBtnAvanti, btnAvanti);

  newBtnIndietro.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderReports(getPageData());
      updatePagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  newBtnAvanti.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderReports(getPageData());
      updatePagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

// ---- UPDATE STATS ----
function updateStats(reports) {
  const open = reports.filter((r) => r.stato_segnalazione === "aperta").length;
  const working = reports.filter(
    (r) => r.stato_segnalazione === "in_lavorazione"
  ).length;
  const resolved = reports.filter(
    (r) => r.stato_segnalazione === "risolta"
  ).length;

  document.getElementById("countOpen").textContent = open;
  document.getElementById("countWorking").textContent = working;
  document.getElementById("countResolved").textContent = resolved;
  document.getElementById("countTotal").textContent = reports.length;
}

// ---- FORMAT DATA ----
function formatData(dataStr) {
  const date = new Date(dataStr);
  return (
    date.toLocaleDateString("it-IT") +
    " " +
    date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatProblemaType(tipo) {
  const map = {
    danno_fisico: "🔨 Danno Fisico",
    batteria_scarica: "🔋 Batteria Scarica",
    pneumatico_bucato: "🛞 Pneumatico Bucato",
    non_funziona: "⚙️ Non Funziona",
    sporco: "🧹 Sporco",
    altro: "❓ Altro",
  };
  return map[tipo] || tipo;
}

function renderStatusBadge(stato) {
  const map = {
    aperta: { icon: "⚠️", label: "Aperta", class: "status-aperta" },
    in_lavorazione: {
      icon: "🔧",
      label: "In Lavorazione",
      class: "status-in_lavorazione",
    },
    risolta: { icon: "✅", label: "Risolta", class: "status-risolta" },
  };
  const s = map[stato] || map["aperta"];
  return `<span class="status-badge ${s.class}">${s.icon} ${s.label}</span>`;
}

// ---- SETUP EVENT LISTENERS ----
function setupEventListeners() {
  // Hide New Report button for admin
  const btnNewReport = document.getElementById("btnNewReport");
  if (btnNewReport) {
    btnNewReport.style.display = "none";
  }

  // Details Modal
  document
    .getElementById("closeModalDetails")
    .addEventListener("click", () => closeModal("modalReportDetails"));
  document
    .getElementById("closeDetailsBtn")
    .addEventListener("click", () => closeModal("modalReportDetails"));

  // Change Status Modal
  document
    .getElementById("closeModalChangeStatus")
    .addEventListener("click", () => closeModal("modalChangeStatus"));
  document
    .getElementById("cancelChangeStatus")
    .addEventListener("click", () => closeModal("modalChangeStatus"));
  document
    .getElementById("submitChangeStatus")
    .addEventListener("click", submitChangeStatus);

  // Delete Modal
  document
    .getElementById("closeModalDelete")
    .addEventListener("click", () => closeModal("modalConfirmDelete"));
  document
    .getElementById("cancelDelete")
    .addEventListener("click", () => closeModal("modalConfirmDelete"));
  document
    .getElementById("confirmDelete")
    .addEventListener("click", confirmDelete);

  // Click outside modal to close
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

// ---- SETUP FILTERS ----
function setupFilters() {
  const filterStatus = document.getElementById("filterStatus");
  const filterType = document.getElementById("filterType");
  const searchReport = document.getElementById("searchReport");

  const applyFilters = () => {
    const status = filterStatus.value;
    const type = filterType.value;
    const search = searchReport.value.toLowerCase();

    let filtered = allReports;

    if (status)
      filtered = filtered.filter((r) => r.stato_segnalazione === status);
    if (type) filtered = filtered.filter((r) => r.tipo_problema === type);
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.id_segnalazione.toString().includes(search) ||
          r.id_mezzo.toString().includes(search) ||
          (r.user &&
            (r.user.nome + " " + r.user.cognome).toLowerCase().includes(search))
      );
    }

    allReports = filtered;
    currentPage = 1; // Reset to first page on filter
    renderReports(getPageData());
    updateStats(allReports);
    updatePagination();
  };

  filterStatus.addEventListener("change", applyFilters);
  filterType.addEventListener("change", applyFilters);
  searchReport.addEventListener("input", applyFilters);
}

// ---- VIEW DETAILS ----
async function viewDetails(id) {
  try {
    const response = await fetch(`/reports/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore nel caricamento dettagli");

    const data = await response.json();
    const report = data.report;
    currentReportId = report.id_segnalazione;

    // Populate details
    document.getElementById(
      "detailsTitle"
    ).textContent = `Segnalazione #${report.id_segnalazione}`;
    document.getElementById(
      "detailId"
    ).textContent = `#${report.id_segnalazione}`;
    document.getElementById("detailMezzoId").textContent = report.id_mezzo;
    document.getElementById("detailMezzoTipo").textContent =
      report.vehicle?.tipo_mezzo || "N/A";
    document.getElementById("detailMezzoStato").textContent =
      report.vehicle?.stato || "N/A";
    document.getElementById("detailMezzoCodice").textContent =
      report.vehicle?.codice_identificativo || "N/A";
    document.getElementById("detailUtente").textContent = report.user
      ? `${report.user.nome} ${report.user.cognome}`
      : "N/A";
    document.getElementById("detailEmail").textContent =
      report.user?.email || "N/A";
    document.getElementById("detailProblema").textContent = formatProblemaType(
      report.tipo_problema
    );
    document.getElementById("detailDescrizione").textContent =
      report.descrizione || "Nessuna descrizione";
    document.getElementById("detailData").textContent = formatData(
      report.data_ora
    );
    document.getElementById("detailStato").innerHTML = renderStatusBadge(
      report.stato_segnalazione
    );

    // Action buttons
    const actionGroup = document.getElementById("actionButtonsGroup");
    actionGroup.innerHTML = "";

    const btnChangeStatus = document.createElement("button");
    btnChangeStatus.className = "btn btn-primary";
    btnChangeStatus.textContent = "🔧 Cambia Stato";
    btnChangeStatus.onclick = () => {
      closeModal("modalReportDetails");
      openChangeStatusModal();
    };
    actionGroup.appendChild(btnChangeStatus);

    openModal("modalReportDetails");
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("Errore nel caricamento dettagli", "error");
  }
}

// ---- CHANGE STATUS ----
function openChangeStatusModal() {
  // Find the full report from allReports (original unfiltered list)
  let report = null;

  // First try to find in the currently displayed filtered list
  for (
    let page = 1;
    page <= Math.ceil(allReports.length / itemsPerPage);
    page++
  ) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageReports = allReports.slice(startIndex, endIndex);

    report = pageReports.find((r) => r.id_segnalazione === currentReportId);
    if (report) break;
  }

  if (!report) return;

  document.querySelector(
    `input[value="${report.stato_segnalazione}"]`
  ).checked = true;
  openModal("modalChangeStatus");
}

async function submitChangeStatus() {
  const newStatus = document.querySelector(
    'input[name="newStatus"]:checked'
  )?.value;
  const errorDiv = document.getElementById("errorChangeStatus");

  // Clear previous errors
  errorDiv.innerHTML = "";

  if (!newStatus) {
    errorDiv.innerHTML = '<div class="error-message">Seleziona uno stato</div>';
    return;
  }

  try {
    const response = await fetch(`/reports/${currentReportId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ stato_segnalazione: newStatus }),
    });

    if (!response.ok) throw new Error("Errore nell'aggiornamento");

    showSnackbar("Stato aggiornato con successo! ✅", "success");
    closeModal("modalChangeStatus");
    loadReports();
  } catch (error) {
    console.error("❌ Errore:", error);
    errorDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
  }
}

// ---- DELETE REPORT ----
async function deleteReport(id) {
  currentReportId = id;
  openModal("modalConfirmDelete");
}

async function confirmDelete() {
  try {
    const response = await fetch(`/reports/${currentReportId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore nell'eliminazione");

    showSnackbar("Segnalazione eliminata con successo! ✅", "success");
    closeModal("modalConfirmDelete");
    loadReports();
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar(error.message, "error");
  }
}

// ---- MODAL HELPERS ----
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// ---- SNACKBAR HELPER ----
function showSnackbar(message, type = "info") {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = "snackbar show";

  if (type === "error") {
    snackbar.classList.add("snackbar--error");
  } else if (type === "warning") {
    snackbar.classList.add("snackbar--warning");
  }

  setTimeout(() => {
    snackbar.classList.remove("show");
    snackbar.classList.remove("snackbar--error");
    snackbar.classList.remove("snackbar--warning");
  }, 3000);
}
