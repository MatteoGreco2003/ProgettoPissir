// ===== CONFIGURAZIONE GLOBALE =====
const ITEMS_PER_PAGE = 10;

let currentPage = 1;
let allUsers = [];
let filteredUsers = [];
let pendingUsers = [];

// ===== DOM ELEMENTS =====
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const usersTableBody = document.getElementById("usersTableBody");
const paginationContainer = document.getElementById("paginationContainer");
const userDetailModal = document.getElementById("userDetailModal");
const deleteUserModal = document.getElementById("deleteUserModal");
const modalCloseButtons = document.querySelectorAll(".modal-close");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const snackbar = document.getElementById("snackbar");
const approveModal = document.getElementById("approveModal");
const cancelApproveBtn = document.getElementById("cancelApproveBtn");
const confirmApproveBtn = document.getElementById("confirmApproveBtn");

// ===== STATS ELEMENTS =====
const activeCountEl = document.getElementById("activeCount");
const pendingCountEl = document.getElementById("pendingCount");
const suspendedCountEl = document.getElementById("suspendedCount");

let userToDelete = null;
let userToApprove = null;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllUsers();

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
  // Search & Filter
  searchInput.addEventListener("input", filterUsers);
  statusFilter.addEventListener("change", filterUsers);

  // Modals
  modalCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });
  closeModalBtn.addEventListener("click", closeAllModals);
  cancelApproveBtn.addEventListener("click", closeAllModals);
  confirmApproveBtn.addEventListener("click", confirmApprove);
  cancelDeleteBtn.addEventListener("click", closeAllModals);
  confirmDeleteBtn.addEventListener("click", confirmDelete);

  // Close modal quando clicchi fuori (sul backdrop)
  const modals = [userDetailModal, deleteUserModal, approveModal];
  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("modal-overlay")) {
        closeAllModals();
      }
    });
  });
}

// ===== LOAD ALL USERS =====
async function loadAllUsers() {
  try {
    const response = await fetch("/users/admin/all", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento utenti");

    const data = await response.json();
    allUsers = data.users || [];
    filteredUsers = [...allUsers];

    updateStats();
    renderUsers();
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== UPDATE STATS =====
function updateStats() {
  // Filtra gli utenti escludendo l'admin (email = 'admin@gmail.com')
  const regularUsers = allUsers.filter((u) => u.email !== "admin@gmail.com");

  const pending = regularUsers.filter(
    (u) => u.stato_account === "in_attesa_approvazione"
  ).length;
  const active = regularUsers.filter(
    (u) => u.stato_account === "attivo"
  ).length;
  const suspended = regularUsers.filter(
    (u) => u.stato_account === "sospeso"
  ).length;

  activeCountEl.textContent = active;
  pendingCountEl.textContent = pending;
  suspendedCountEl.textContent = suspended;
}

// ===== FILTER USERS =====
function filterUsers() {
  const searchTerm = searchInput.value.toLowerCase();
  const statusTerm = statusFilter.value;

  filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.nome.toLowerCase().includes(searchTerm) ||
      user.cognome.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);

    const matchesStatus = !statusTerm || user.stato_account === statusTerm;

    return matchesSearch && matchesStatus;
  });

  currentPage = 1;
  renderUsers();
}

// ===== RENDER USERS TABLE =====
function renderUsers() {
  // Esclude l'admin dalla visualizzazione
  const usersWithoutAdmin = filteredUsers.filter(
    (u) => u.email !== "admin@gmail.com"
  );

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedUsers = usersWithoutAdmin.slice(start, end);

  if (paginatedUsers.length === 0) {
    usersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" class="text-center">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
            <p>Nessun utente trovato</p>
          </div>
        </td>
      </tr>
    `;
    paginationContainer.innerHTML = "";
    return;
  }

  usersTableBody.innerHTML = paginatedUsers
    .map((user) => {
      const saldoClass = user.saldo >= 0 ? "saldo-positive" : "saldo-negative";

      return `
      <tr>
        <td><strong>${user.nome} ${user.cognome}</strong></td>
        <td>${user.email}</td>
        <td class="${saldoClass}">€ ${parseFloat(user.saldo).toFixed(2)}</td>
        <td>
          <span class="status-badge status-${user.stato_account}">
            ${getStatusLabel(user.stato_account)}
          </span>
        </td>
        <td>
  <div class="action-buttons">
    <button class="btn-action btn-view" onclick="viewUserDetail('${
      user.id_utente
    }')" title="Visualizza dettagli">
      <i class="fas fa-eye"></i>
    </button>
    <button class="btn-action btn-approve ${
      user.stato_account !== "in_attesa_approvazione" ? "disabled" : ""
    }" onclick="openApproveModal('${user.id_utente}', '${user.nome} ${
        user.cognome
      }', ${user.saldo}, '${user.data_sospensione}')" 
    title="Approva riapertura account"
    ${user.stato_account !== "in_attesa_approvazione" ? "disabled" : ""}>
      <i class="fas fa-undo"></i>
    </button>
    <button class="btn-action btn-delete" onclick="openDeleteModal('${
      user.id_utente
    }', '${user.nome} ${user.cognome}')" title="Elimina profilo">
      <i class="fas fa-trash"></i>
    </button>
  </div>
</td>
      </tr>
    `;
    })
    .join("");

  renderPagination();
}

// ===== RENDER PAGINATION =====
function renderPagination() {
  const usersWithoutAdmin = filteredUsers.filter(
    (u) => u.email !== "admin@gmail.com"
  );
  const totalPages = Math.ceil(usersWithoutAdmin.length / ITEMS_PER_PAGE);

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
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderUsers();
  }
}

// ===== VIEW USER DETAIL =====
async function viewUserDetail(userId) {
  try {
    const response = await fetch(`/users/admin/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore caricamento dettagli utente");

    const data = await response.json();
    const user = data.user;

    const dataReg = new Date(user.data_registrazione).toLocaleDateString(
      "it-IT"
    );

    // Formatta le date di sospensione e riapertura
    const dataSospensione = user.data_sospensione
      ? new Date(user.data_sospensione).toLocaleDateString("it-IT")
      : "N/A";

    const dataRiapertura = user.data_riapertura
      ? new Date(user.data_riapertura).toLocaleDateString("it-IT")
      : "N/A";

    const saldoClass = user.saldo >= 0 ? "saldo-positive" : "saldo-negative";

    const detailHTML = `
      <div class="user-detail-info">
        <div class="detail-section">
          <h3>Informazioni Personali</h3>
          <div class="detail-row">
            <span class="detail-label">Nome:</span>
            <span class="detail-value">${user.nome} ${user.cognome}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${user.email}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data Registrazione:</span>
            <span class="detail-value">${dataReg}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Stato Account</h3>
          <div class="detail-row">
            <span class="detail-label">Stato:</span>
            <span class="status-badge status-${user.stato_account}">
              ${getStatusLabel(user.stato_account)}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Saldo:</span>
            <span class="detail-value ${saldoClass}">€ ${parseFloat(
      user.saldo
    ).toFixed(2)}</span>
          </div>
          
          ${
            user.importo_minimo_ricarica
              ? `
            <div class="detail-row">
              <span class="detail-label">Importo Minimo Ricarica:</span>
              <span class="detail-value" style="color: #e68161;">€ ${parseFloat(
                user.importo_minimo_ricarica
              ).toFixed(2)}</span>
            </div>
          `
              : ""
          }

          <div class="detail-row">
            <span class="detail-label">Punti:</span>
            <span class="detail-value" style="color: var(--color-primary);">
              <i class="fas fa-star" style="margin-right: 4px;"></i>${
                user.punti
              }
            </span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Storico Sospensioni</h3>
          <div class="detail-row">
            <span class="detail-label">Data Sospensione:</span>
            <span class="detail-value">${dataSospensione}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Data Riapertura:</span>
            <span class="detail-value">${dataRiapertura}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">N° Sospensioni:</span>
            <span class="detail-value" style="background: rgba(255, 84, 89, 0.15); padding: 4px 10px; border-radius: 6px; color: #c0152f; font-weight: 700;">
              ${user.numero_sospensioni}
            </span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("userDetailBody").innerHTML = detailHTML;
    userDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("❌ Errore:", error);
  }
}

// ===== APPROVE MODAL =====
function openApproveModal(userId, userName, saldo, dataSospensione) {
  userToApprove = userId;

  // Formatta la data
  const dataSospensioneFormatted = dataSospensione
    ? new Date(dataSospensione).toLocaleDateString("it-IT")
    : "N/A";

  document.getElementById("approveName").textContent = userName;
  document.getElementById("approveBalance").textContent = `€ ${parseFloat(
    saldo
  ).toFixed(2)}`;
  document.getElementById("approveSuspensionDate").textContent =
    dataSospensioneFormatted;

  approveModal.classList.remove("hidden");
}

// ===== CONFIRM APPROVE =====
async function confirmApprove() {
  if (!userToApprove) return;

  try {
    confirmApproveBtn.disabled = true;
    confirmApproveBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Approvazione...';

    const response = await fetch(
      `/transactions/approve-reactivation/${userToApprove}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) throw new Error("Errore approvazione");

    const data = await response.json();

    showSnackbar(
      `✅ Account di ${data.nome} ${data.cognome} riaperto!`,
      "success"
    );
    closeAllModals();
    loadAllUsers();
    updateStats();
    userToApprove = null;
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmApproveBtn.disabled = false;
    confirmApproveBtn.innerHTML = "Approva";
  }
}

// ===== DELETE MODAL =====
function openDeleteModal(userId, userName) {
  userToDelete = userId;
  document.getElementById("deleteUserName").textContent = userName;
  deleteUserModal.classList.remove("hidden");
}

// ===== CONFIRM DELETE =====
async function confirmDelete() {
  if (!userToDelete) return;

  try {
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Eliminazione...';

    const response = await fetch(`/users/admin/${userToDelete}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (!response.ok) throw new Error("Errore eliminazione utente");

    showSnackbar("✅ Profilo eliminato con successo", "success");
    closeAllModals();
    loadAllUsers();
    userToDelete = null;
  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = "Elimina";
  }
}

// ===== UTILITY FUNCTIONS =====
function getStatusLabel(status) {
  const statusMap = {
    attivo: "Attivo",
    sospeso: "Sospeso",
    in_attesa_approvazione: "In attesa di approvazione",
    eliminato: "Eliminato",
  };
  return statusMap[status] || status;
}

function closeAllModals() {
  userDetailModal.classList.add("hidden");
  approveModal.classList.add("hidden");
  deleteUserModal.classList.add("hidden");
}

// ===== SNACKBAR NOTIFICATIONS =====
function showSnackbar(message, type = "success", duration = 4000) {
  snackbar.textContent = message;
  snackbar.className = "snackbar show";

  if (type === "error") {
    snackbar.classList.add("snackbar--error");
  } else if (type === "warning") {
    snackbar.classList.add("snackbar--warning");
  }

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, duration);
}
