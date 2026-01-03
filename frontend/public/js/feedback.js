// ============================================================================
// FEEDBACK PAGE - feedback.js
// Gestisce i miei feedback, community feedback, filtri, edit e delete
// ============================================================================

/* ========================================================================
   APPLICATION STATE
   Contiene dati feedback, paginazione, filtri e ID in modifica/cancellazione
   ======================================================================== */
let feedbackState = {
  currentUserId: null,

  // My feedbacks state
  myFeedbacks: [],
  myCurrentPage: 1,
  myTotalPages: 1,
  myPageSize: 2,

  // Community feedbacks state
  communityFeedbacks: [],
  currentPage: 1,
  totalPages: 1,
  pageSize: 3,

  // Filtri community
  filters: {
    tipo_mezzo: "",
    rating: "",
  },

  // ID feedback in modifica/cancellazione
  editingFeedbackId: null,
  deletingFeedbackId: null,
};

/* ========================================================================
   DOM ELEMENTS SELECTORS
   ======================================================================== */

// My feedback
const myFeedbackList = document.getElementById("myFeedbackList");
const myFeedbackEmpty = document.getElementById("myFeedbackEmpty");
const myFeedbackLoading = document.getElementById("myFeedbackLoading");

// My feedback pagination
const myFeedbackPaginationContainer = document.getElementById(
  "myFeedbackPaginationContainer"
);
const myFeedbackPrevBtn = document.getElementById("myFeedbackPrevBtn");
const myFeedbackNextBtn = document.getElementById("myFeedbackNextBtn");
const myFeedbackPageInfo = document.getElementById("myFeedbackPageInfo");

// Community feedback
const communityFeedbackList = document.getElementById("communityFeedbackList");
const communityFeedbackEmpty = document.getElementById(
  "communityFeedbackEmpty"
);
const communityFeedbackLoading = document.getElementById(
  "communityFeedbackLoading"
);

// Filtri
const filterMezzo = document.getElementById("filterMezzo");
const filterRating = document.getElementById("filterRating");

// Community pagination
const paginationContainer = document.getElementById("paginationContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

// Edit modal
const editFeedbackModal = document.getElementById("editFeedbackModal");
const editStars = document.getElementById("editStars");
const editCommentoText = document.getElementById("editCommentoText");
const editCharCount = document.getElementById("editCharCount");
const editVehicleInfo = document.getElementById("editVehicleInfo");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveEditBtn = document.getElementById("saveEditBtn");

// Delete feedback modal
const deleteFeedbackModal = document.getElementById("deleteFeedbackModal");
const confirmDeleteFeedbackBtn = document.getElementById(
  "confirmDeleteFeedbackBtn"
);
const cancelDeleteFeedbackBtn = document.getElementById(
  "cancelDeleteFeedbackBtn"
);
const deleteFeedbackModalClose = document.getElementById(
  "deleteFeedbackModalClose"
);

/* ========================================================================
   PAGE INITIALIZATION
   Carica current user ID e setup listeners
   ======================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Toggle sidebar su mobile
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

  // Carica current user ID PRIMA di tutto il resto
  loadCurrentUserId().then(() => {
    setupModalListeners();
    setupFilterListeners();
    loadMyFeedbacks();
    loadCommunityFeedbacks();
  });
});

/**
 * Carica l'ID dell'utente corrente
 * @returns {Promise} Risolve quando l'ID è caricato
 */
function loadCurrentUserId() {
  return fetch("/users/me")
    .then((res) => res.json())
    .then((data) => {
      if (data.id || data.id_utente) {
        feedbackState.currentUserId = data.id || data.id_utente;
      }
    })
    .catch((error) => {
      console.error("❌ Errore caricamento user ID:", error);
    });
}

/* ========================================================================
   SEZIONE 1: I MIEI FEEDBACK
   Carica, renderizza e gestisce i feedback personali
   ======================================================================== */

/**
 * Carica i feedback personali con paginazione
 */
function loadMyFeedbacks() {
  myFeedbackLoading.classList.remove("hidden");
  myFeedbackEmpty.classList.add("hidden");
  myFeedbackList.innerHTML = "";

  // Calcola offset per paginazione
  const offset = (feedbackState.myCurrentPage - 1) * feedbackState.myPageSize;

  fetch(
    `/feedback/my-feedback?limit=${feedbackState.myPageSize}&offset=${offset}`
  )
    .then((res) => res.json())
    .then((data) => {
      myFeedbackLoading.classList.add("hidden");

      if (data.feedbacks && data.feedbacks.length > 0) {
        feedbackState.myFeedbacks = data.feedbacks;
        feedbackState.myTotalPages = Math.ceil(
          (data.total || 0) / feedbackState.myPageSize
        );
        renderMyFeedbacks();
        renderMyFeedbackPagination();
      } else {
        myFeedbackEmpty.classList.remove("hidden");
        myFeedbackPaginationContainer.classList.add("hidden");
      }
    })
    .catch((error) => {
      console.error("❌ Errore caricamento miei feedback:", error);
      myFeedbackLoading.classList.add("hidden");
      myFeedbackEmpty.classList.remove("hidden");
    });
}

/**
 * Renderizza paginazione feedback personali
 */
function renderMyFeedbackPagination() {
  if (feedbackState.myTotalPages <= 1) {
    myFeedbackPaginationContainer.classList.add("hidden");
    return;
  }

  myFeedbackPaginationContainer.classList.remove("hidden");

  // Aggiorna info pagina
  myFeedbackPageInfo.textContent = `Pagina ${feedbackState.myCurrentPage} di ${feedbackState.myTotalPages}`;

  // Disabilita bottoni se primo/ultimo
  myFeedbackPrevBtn.disabled = feedbackState.myCurrentPage === 1;
  myFeedbackNextBtn.disabled =
    feedbackState.myCurrentPage === feedbackState.myTotalPages;
}

/**
 * Renderizza lista dei miei feedback in HTML
 */
function renderMyFeedbacks() {
  myFeedbackList.innerHTML = feedbackState.myFeedbacks
    .map((feedback) => {
      const vehicle = feedback.vehicle;
      const icon = getVehicleIcon(vehicle.tipo_mezzo);
      const stars = generateStars(feedback.rating);
      const dataOra = new Date(feedback.data_ora).toLocaleDateString("it-IT");

      return `
      <div class="feedback-card feedback-card--mine">
        <div class="feedback-card-left">
          <div class="feedback-vehicle-info">
            <span class="feedback-vehicle-icon">${icon}</span>
            <div class="feedback-vehicle-details">
              <h4>${vehicle.tipo_mezzo.replace(/_/g, " ").toUpperCase()}</h4>
              <small>${vehicle.codice_identificativo}</small>
            </div>
          </div>
        </div>

        <div class="feedback-card-right">
          <div class="feedback-rating">${stars}</div>
          <div class="feedback-date">${dataOra}</div>
        </div>

        ${
          feedback.commento
            ? `<div class="feedback-commento"><p>${feedback.commento}</p></div>`
            : ""
        }

        <div class="feedback-actions">
          <button class="feedback-btn-action feedback-btn-edit" data-id="${
            feedback.id_feedback
          }">
            <i class="fas fa-edit"></i> Modifica
          </button>
          <button class="feedback-btn-action feedback-btn-delete" data-id="${
            feedback.id_feedback
          }">
            <i class="fas fa-trash"></i> Elimina
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  // Setup event listeners per edit/delete bottoni
  setupEditAndDeleteListeners();
}

/**
 * Setup event listeners per bottoni modifica e elimina
 */
function setupEditAndDeleteListeners() {
  document.querySelectorAll(".feedback-btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      openEditModal(btn.dataset.id);
    });
  });

  document.querySelectorAll(".feedback-btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteFeedback(btn.dataset.id);
    });
  });
}

/* ========================================================================
   SEZIONE 2: COMMUNITY FEEDBACK
   Carica, renderizza, filtra feedback della community
   ======================================================================== */

/**
 * Carica feedback community con filtri e paginazione
 */
function loadCommunityFeedbacks() {
  communityFeedbackLoading.classList.remove("hidden");
  communityFeedbackEmpty.classList.add("hidden");
  communityFeedbackList.innerHTML = "";

  // Calcola offset per paginazione
  const offset = (feedbackState.currentPage - 1) * feedbackState.pageSize;

  // Costruisci query params con filtri
  const params = new URLSearchParams({
    limit: feedbackState.pageSize,
    offset: offset,
    ...(feedbackState.filters.tipo_mezzo && {
      tipo_mezzo: feedbackState.filters.tipo_mezzo,
    }),
    ...(feedbackState.filters.rating && {
      rating: feedbackState.filters.rating,
    }),
  });

  fetch(`/feedback/all?${params}`)
    .then((res) => res.json())
    .then((data) => {
      communityFeedbackLoading.classList.add("hidden");

      if (data.feedbacks && data.feedbacks.length > 0) {
        feedbackState.communityFeedbacks = data.feedbacks;

        feedbackState.totalPages = Math.ceil(
          (data.total || 0) / feedbackState.pageSize
        );

        renderCommunityFeedbacks();
        renderCommunityPagination();
      } else {
        communityFeedbackEmpty.classList.remove("hidden");
        paginationContainer.classList.add("hidden");
      }
    })
    .catch((error) => {
      console.error("❌ Errore caricamento feedback community:", error);
      communityFeedbackLoading.classList.add("hidden");
      communityFeedbackEmpty.classList.remove("hidden");
    });
}

/**
 * Renderizza lista feedback community
 */
function renderCommunityFeedbacks() {
  communityFeedbackList.innerHTML = feedbackState.communityFeedbacks
    .map((feedback) => {
      const vehicle = feedback.vehicle;
      const user = feedback.user;
      const icon = getVehicleIcon(vehicle.tipo_mezzo);
      const stars = generateStars(feedback.rating);
      const dataOra = new Date(feedback.data_ora).toLocaleDateString("it-IT");

      let userDisplay = "Utente Eliminato";
      if (user && user.nome && user.cognome) {
        userDisplay = `${user.nome} ${user.cognome}`;
      }

      return `
      <div class="feedback-card">
        <div class="feedback-card-left">
          <div class="feedback-vehicle-info">
            <span class="feedback-vehicle-icon">${icon}</span>
            <div class="feedback-vehicle-details">
              <h4>${vehicle.tipo_mezzo.replace(/_/g, " ").toUpperCase()}</h4>
              <small>${vehicle.codice_identificativo}</small>
            </div>
          </div>
          <div class="feedback-user-info">
            da <strong>${userDisplay}</strong>
          </div>
        </div>

        <div class="feedback-card-right">
          <div class="feedback-rating">${stars}</div>
          <div class="feedback-date">${dataOra}</div>
        </div>

        ${
          feedback.commento
            ? `<div class="feedback-commento"><p>${feedback.commento}</p></div>`
            : ""
        }
      </div>
    `;
    })
    .join("");
}

/**
 * Renderizza paginazione feedback community
 */
function renderCommunityPagination() {
  if (feedbackState.totalPages <= 1) {
    paginationContainer.classList.add("hidden");
    return;
  }

  paginationContainer.classList.remove("hidden");

  // Aggiorna info pagina
  pageInfo.textContent = `Pagina ${feedbackState.currentPage} di ${feedbackState.totalPages}`;

  // Disabilita bottoni se primo/ultimo
  prevBtn.disabled = feedbackState.currentPage === 1;
  nextBtn.disabled = feedbackState.currentPage === feedbackState.totalPages;
}

/* ========================================================================
   FILTRI E PAGINAZIONE LISTENERS
   ======================================================================== */

/**
 * Setup event listeners per filtri e paginazione
 */
function setupFilterListeners() {
  // Filtri community
  filterMezzo.addEventListener("change", () => {
    feedbackState.filters.tipo_mezzo = filterMezzo.value;
    feedbackState.currentPage = 1;
    loadCommunityFeedbacks();
  });

  filterRating.addEventListener("change", () => {
    feedbackState.filters.rating = filterRating.value;
    feedbackState.currentPage = 1;
    loadCommunityFeedbacks();
  });

  // Paginazione miei feedback
  myFeedbackPrevBtn.addEventListener("click", () => {
    if (feedbackState.myCurrentPage > 1) {
      feedbackState.myCurrentPage--;
      loadMyFeedbacks();
    }
  });

  myFeedbackNextBtn.addEventListener("click", () => {
    if (feedbackState.myCurrentPage < feedbackState.myTotalPages) {
      feedbackState.myCurrentPage++;
      loadMyFeedbacks();
    }
  });

  // Paginazione community feedback
  prevBtn.addEventListener("click", () => {
    if (feedbackState.currentPage > 1) {
      feedbackState.currentPage--;
      loadCommunityFeedbacks();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (feedbackState.currentPage < feedbackState.totalPages) {
      feedbackState.currentPage++;
      loadCommunityFeedbacks();
    }
  });
}

/* ========================================================================
   MODALS - EDIT FEEDBACK
   ======================================================================== */

/**
 * Setup event listeners per modali (edit, delete)
 */
function setupModalListeners() {
  // ===== EDIT MODAL =====
  const editModalCloseBtn = document.querySelector(
    "#editFeedbackModal .modal-close"
  );
  if (editModalCloseBtn) {
    editModalCloseBtn.addEventListener("click", closeEditModal);
  }

  const editModalOverlay = document.querySelector(
    "#editFeedbackModal .modal-overlay"
  );
  if (editModalOverlay) {
    editModalOverlay.addEventListener("click", closeEditModal);
  }

  cancelEditBtn.addEventListener("click", closeEditModal);
  saveEditBtn.addEventListener("click", saveEditFeedback);

  // Counter caratteri commento
  editCommentoText.addEventListener("input", () => {
    editCharCount.textContent = editCommentoText.value.length;
  });

  // Stella rating interattiva (click per selezionare)
  editStars.addEventListener("click", (e) => {
    if (e.target.classList.contains("feedback-star")) {
      const rating = e.target.dataset.rating;
      document.querySelectorAll("#editStars .feedback-star").forEach((star) => {
        if (parseInt(star.dataset.rating) <= rating) {
          star.classList.add("active");
        } else {
          star.classList.remove("active");
        }
      });
    }
  });

  // ===== DELETE FEEDBACK MODAL =====
  if (deleteFeedbackModalClose) {
    deleteFeedbackModalClose.addEventListener(
      "click",
      closeDeleteFeedbackModal
    );
  }

  const deleteModalOverlay = document.querySelector(
    "#deleteFeedbackModal .modal-overlay"
  );
  if (deleteModalOverlay) {
    deleteModalOverlay.addEventListener("click", closeDeleteFeedbackModal);
  }

  if (cancelDeleteFeedbackBtn) {
    cancelDeleteFeedbackBtn.addEventListener("click", closeDeleteFeedbackModal);
  }

  if (confirmDeleteFeedbackBtn) {
    confirmDeleteFeedbackBtn.addEventListener("click", confirmDeleteFeedback);
  }
}

/**
 * Apri modal modifica feedback
 * Popola campi con dati feedback da modificare
 * @param {string} feedbackId - ID feedback da modificare
 */
function openEditModal(feedbackId) {
  const feedbackIdNum = parseInt(feedbackId, 10);

  // Trova feedback nella lista
  const feedback = feedbackState.myFeedbacks.find(
    (f) => f.id_feedback === feedbackIdNum
  );

  if (!feedback) {
    console.error("❌ Feedback non trovato:", feedbackId);
    return;
  }

  feedbackState.editingFeedbackId = feedbackId;

  // Popola info mezzo
  const vehicle = feedback.vehicle;
  const icon = getVehicleIcon(vehicle.tipo_mezzo);

  editVehicleInfo.innerHTML = `
    <h4>${icon} ${vehicle.tipo_mezzo.replace(/_/g, " ").toUpperCase()}</h4>
    <p>${vehicle.codice_identificativo}</p>
  `;

  // Popola commento e char count
  editCommentoText.value = feedback.commento || "";
  editCharCount.textContent = feedback.commento ? feedback.commento.length : 0;

  // Crea stelle rating
  editStars.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("button");
    star.type = "button";
    star.classList.add("feedback-star");
    star.dataset.rating = i;
    star.textContent = "⭐";
    if (i <= feedback.rating) star.classList.add("active");
    editStars.appendChild(star);
  }

  // Mostra modal
  editFeedbackModal.classList.remove("hidden");
}

/**
 * Chiudi modal modifica feedback
 */
function closeEditModal() {
  editFeedbackModal.classList.add("hidden");
  feedbackState.editingFeedbackId = null;
}

/**
 * Salva modifiche feedback al backend
 * Endpoint: PATCH /feedback/{id}
 */
function saveEditFeedback() {
  // Conta stelle attive per il rating
  const rating = document.querySelectorAll(
    "#editStars .feedback-star.active"
  ).length;
  const commento = editCommentoText.value.trim();

  if (rating === 0) {
    alert("❌ Seleziona una valutazione");
    return;
  }

  saveEditBtn.disabled = true;
  saveEditBtn.textContent = "Salvataggio...";

  fetch(`/feedback/${feedbackState.editingFeedbackId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rating,
      commento: commento || null,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      showSnackbar("✅ Feedback aggiornato!", "success");
      closeEditModal();
      loadMyFeedbacks();
    })
    .catch((error) => {
      console.error("❌ Errore:", error);
      showSnackbar("❌ Errore nell'aggiornamento", "error");
    })
    .finally(() => {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = "Salva Modifiche";
    });
}

/* ========================================================================
   MODALS - DELETE FEEDBACK
   ======================================================================== */

/**
 * Apri modal conferma eliminazione feedback
 * @param {string} feedbackId - ID feedback da eliminare
 */
function deleteFeedback(feedbackId) {
  feedbackState.deletingFeedbackId = feedbackId;
  deleteFeedbackModal.classList.remove("hidden");
}

/**
 * Chiudi modal eliminazione feedback
 */
function closeDeleteFeedbackModal() {
  deleteFeedbackModal.classList.add("hidden");
  feedbackState.deletingFeedbackId = null;
}

/**
 * Conferma e invia richiesta eliminazione feedback al backend
 * Endpoint: DELETE /feedback/{id}
 */
function confirmDeleteFeedback() {
  const feedbackId = feedbackState.deletingFeedbackId;

  if (!feedbackId) {
    console.error("❌ ID feedback non trovato");
    return;
  }

  confirmDeleteFeedbackBtn.disabled = true;
  confirmDeleteFeedbackBtn.textContent = "Eliminazione...";

  fetch(`/feedback/${feedbackId}`, {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((data) => {
      showSnackbar("✅ Feedback eliminato!", "success");
      closeDeleteFeedbackModal();
      loadMyFeedbacks();
    })
    .catch((error) => {
      console.error("❌ Errore:", error);
      showSnackbar("❌ Errore nell'eliminazione", "error");
    })
    .finally(() => {
      confirmDeleteFeedbackBtn.disabled = false;
      confirmDeleteFeedbackBtn.textContent = "Elimina Feedback";
    });
}

/* ========================================================================
   UTILITY FUNCTIONS
   ======================================================================== */

/**
 * Ottieni emoji icona in base al tipo mezzo
 * @param {string} tipoMezzo - Tipo mezzo (bicicletta_muscolare, etc)
 * @returns {string} - Emoji icona
 */
function getVehicleIcon(tipoMezzo) {
  switch (tipoMezzo) {
    case "bicicletta_muscolare":
      return "🚲";
    case "bicicletta_elettrica":
      return "⚡";
    case "monopattino":
      return "🛴";
    default:
      return "🚗";
  }
}

/**
 * Genera stringhe stelle in base al rating
 * @param {number} rating - Rating (1-5)
 * @returns {string} - Stringa stelle (es: ⭐⭐⭐☆☆)
 */
function generateStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? "⭐" : "☆";
  }
  return stars;
}

/**
 * Mostra snackbar notifica temporanea
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo: "success" | "error"
 */
function showSnackbar(message, type = "success") {
  const snackbar = document.querySelector(".snackbar");
  if (!snackbar) return;

  snackbar.textContent = message;
  snackbar.className = `snackbar show snackbar--${type}`;

  // Auto-hide dopo 3.5 secondi
  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3500);
}
