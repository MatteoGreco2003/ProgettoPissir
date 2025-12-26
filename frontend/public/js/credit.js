// ============================================================================
// CREDIT MANAGEMENT PAGE - credit.js
// Gestisce saldo, statistiche, ricariche e storico transazioni
// ============================================================================

/* ========================================================================
   APPLICATION STATE
   Contiene tutti i dati della pagina in un unico oggetto
   ======================================================================== */
const creditState = {
  currentBalance: null,
  balanceSummary: null,
  transactions: [],
  currentPage: 0,
  pageSize: 3,
  filterType: "", // "" | "ricarica" | "pagamento_corsa"
  isLoadingTransactions: false,
};

/* ========================================================================
   UTILITY FUNCTIONS
   ======================================================================== */

/**
 * Mostra uno snackbar temporaneo per feedback all'utente
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo: "success" | "error" | "warning"
 */
function showSnackbar(message, type = "success") {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = `snackbar ${type}`;
  snackbar.classList.add("show");

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 4000);
}

/**
 * Formatta un numero come valuta EUR (es: 50.00 → €50,00)
 * @param {number} value - Valore da formattare
 * @returns {string} - Stringa formattata
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/**
 * Formatta una data nel formato italiano (es: 12/12/2024 14:30)
 * @param {string} dateString - Data ISO string
 * @returns {string} - Data formattata
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Determina lo stato visivo del chip credito in base al saldo
 * @param {number} saldo - Saldo attuale
 * @returns {string} - Nome della classe CSS
 */
function getCreditChipClass(saldo) {
  if (saldo < 0) return "critical-balance";
  if (saldo < 1) return "low-balance";
  return "";
}

/**
 * Fetch wrapper con headers di default e gestione errori
 * @param {string} endpoint - URL API endpoint
 * @param {object} options - Opzioni fetch (method, body, headers)
 * @returns {Promise} - JSON response
 */
async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/* ========================================================================
   SEZIONE 1: CARICA CREDITO DISPONIBILE
   Recupera saldo, nome utente e stato account da backend
   ======================================================================== */

async function loadBalance() {
  try {
    const data = await fetchAPI("/transactions/balance");
    creditState.currentBalance = data;

    // Aggiorna display credito
    document.getElementById("creditAmount").textContent = formatCurrency(
      data.saldo
    );
    document.getElementById("userName").textContent = data.nome || "—";
    document.getElementById("userCognome").textContent = data.cognome || "—";

    // Mappa stato account a emoji e testo italiano
    const statusMap = {
      attivo: "🟢 Attivo",
      sospeso: "🔴 Sospeso",
      in_attesa_approvazione: "🟡 In Attesa di Approvazione",
    };
    document.getElementById("accountStatus").textContent =
      statusMap[data.stato_account] || data.stato_account;

    // Aggiorna colore chip (low-balance, critical-balance)
    const chip = document.querySelector(".credit-chip");
    chip.className = `credit-chip ${getCreditChipClass(data.saldo)}`;

    // Mostra/nascondi banner di avviso se account sospeso o in attesa
    updateAccountStatusBanner(data.stato_account);
  } catch (error) {
    console.error("❌ Errore caricamento balance:", error);
    showSnackbar("Errore nel caricamento del credito", "error");
  }
}

/* ========================================================================
   SEZIONE 2: CARICA STATISTICHE
   Recupera totali ricariche, spese e numero corse
   ======================================================================== */

async function loadBalanceSummary() {
  try {
    const data = await fetchAPI("/transactions/summary");

    // Statistiche ricariche
    document.getElementById("totalRecharges").textContent = formatCurrency(
      data.totale_ricaricato
    );
    document.getElementById(
      "rechargesCount"
    ).textContent = `(${data.numero_ricariche} ricariche)`;

    // Statistiche spese corse
    document.getElementById("totalExpenses").textContent = formatCurrency(
      data.totale_speso
    );
    document.getElementById(
      "expensesCount"
    ).textContent = `(${data.numero_corse} corse)`;

    // Numero totale corse
    document.getElementById("ridesCount").textContent = data.numero_corse;
  } catch (error) {
    console.error("❌ Errore caricamento summary:", error);
    showSnackbar("Errore nel caricamento delle statistiche", "error");
  }
}

/* ========================================================================
   SEZIONE 3: RICARICA CREDITO
   Form per aggiungere credito via Stripe/PayPal/Bonifico/Satispay
   ======================================================================== */

document
  .getElementById("rechargeForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("rechargeAmount").value);
    const method = document.getElementById("paymentMethod").value;
    const btn = document.getElementById("rechargeBtn");
    const message = document.getElementById("rechargeMessage");

    // Validazione importo e metodo pagamento
    if (!amount || amount <= 0) {
      message.classList.remove("hidden");
      message.classList.add("error");
      message.textContent = "Seleziona un importo valido";
      return;
    }

    if (!method) {
      message.classList.remove("hidden");
      message.classList.add("error");
      message.textContent = "Seleziona un metodo di pagamento";
      return;
    }

    // Disabilita button durante elaborazione
    btn.disabled = true;

    try {
      const response = await fetchAPI("/transactions/recharge", {
        method: "POST",
        body: JSON.stringify({
          importo: amount.toFixed(2),
          metodo_pagamento: method,
        }),
      });

      // Mostra messaggio di successo
      message.classList.remove("hidden", "error");
      message.classList.add("success");
      message.textContent = `✅ Ricarica di ${formatCurrency(
        amount
      )} completata!`;

      showSnackbar(`Credito ricaricato: +${formatCurrency(amount)}`, "success");

      // Pulisci form
      document.getElementById("rechargeForm").reset();

      // Ricarica dati (balance, summary, transazioni)
      await loadBalance();
      await loadBalanceSummary();
      await loadTransactions();

      // Se c'è un avviso (es: account in attesa), mostralo dopo breve delay
      if (response.avviso) {
        setTimeout(() => {
          showSnackbar(response.avviso, "warning");
        }, 1000);
      }

      // Nascondi messaggio dopo 3 secondi
      setTimeout(() => {
        message.classList.add("hidden");
      }, 3000);
    } catch (error) {
      console.error("❌ Errore ricarica:", error);
      message.classList.remove("hidden");
      message.classList.add("error");
      message.textContent = `❌ ${error.message}`;
      showSnackbar(`Errore: ${error.message}`, "error");
    } finally {
      btn.disabled = false;
    }
  });

/* ========================================================================
   SEZIONE 4: STORICO TRANSAZIONI
   Carica, filtra e pagina la tabella di transazioni
   ======================================================================== */

/**
 * Carica le transazioni con paginazione e filtri
 * @param {number} page - Numero pagina (0-indexed)
 */
async function loadTransactions(page = 0) {
  creditState.isLoadingTransactions = true;

  const loadingDiv = document.getElementById("historyLoading");
  const containerDiv = document.getElementById("historyContainer");
  const emptyDiv = document.getElementById("historyEmpty");
  const tableBody = document.getElementById("transactionsTableBody");

  // Mostra loader, sfumatura container
  loadingDiv.classList.remove("hidden");
  containerDiv.style.opacity = "0.5";

  try {
    // Costruisci query params con paginazione e filtro
    const params = new URLSearchParams({
      limit: creditState.pageSize,
      offset: page * creditState.pageSize,
    });

    if (creditState.filterType) {
      params.append("tipo_transazione", creditState.filterType);
    }

    const response = await fetchAPI(
      `/transactions/history?${params.toString()}`
    );
    creditState.transactions = response.transactions;
    creditState.currentPage = page;

    // Pulisci tabella
    tableBody.innerHTML = "";

    // Empty state: mostra messaggio se nessuna transazione
    if (response.transactions.length === 0) {
      containerDiv.classList.add("hidden");
      emptyDiv.classList.remove("hidden");
    } else {
      containerDiv.classList.remove("hidden");
      emptyDiv.classList.add("hidden");

      // Renderizza ogni transazione come riga tabella
      response.transactions.forEach((transaction) => {
        const row = document.createElement("tr");
        const isRecharge = transaction.tipo_transazione === "ricarica";
        const typeLabel = isRecharge ? "Ricarica" : "Spesa";
        const typeClass = isRecharge
          ? "transaction-type--recharge"
          : "transaction-type--expense";
        const amountClass = isRecharge
          ? "transaction-amount--recharge"
          : "transaction-amount--expense";
        const amountPrefix = isRecharge ? "+" : "−";

        // Per corse: usa importo_pagato (dopo sconto punti)
        // Per ricariche: usa importo diretto
        let importoMostrato,
          scontoHTML = "";

        if (isRecharge) {
          importoMostrato = parseFloat(transaction.importo) || 0;
        } else {
          importoMostrato = parseFloat(
            transaction.importo_pagato || transaction.importo
          );

          // Mostra sconto punti fedeltà se presente
          if (transaction.sconto_punti && transaction.sconto_punti > 0) {
            scontoHTML = `
              <div style="
                font-size: 12px;
                color: #22c55e;
                font-weight: 600;
                margin-top: 3px;
              ">
                🎁 ${transaction.punti_fedeltà_usati} punti → −${formatCurrency(
              transaction.sconto_punti
            )}
              </div>
            `;
          }
        }

        // Protezione da NaN
        if (isNaN(importoMostrato)) {
          importoMostrato = 0;
        }

        row.innerHTML = `
          <td class="transaction-date">${formatDate(transaction.data_ora)}</td>
          <td>
            <span class="transaction-type ${typeClass}">
              ${isRecharge ? "🟢" : "🔴"} ${typeLabel}
            </span>
          </td>
          <td>
            <div>${transaction.descrizione}</div>
            ${scontoHTML}
          </td>
          <td class="transaction-amount ${amountClass}">
            ${amountPrefix}${formatCurrency(Math.abs(importoMostrato))}
          </td>
        `;

        tableBody.appendChild(row);
      });
    }

    // Aggiorna controlli paginazione
    updatePagination(response.total, response.offset, response.limit);
  } catch (error) {
    console.error("❌ Errore caricamento transazioni:", error);
    showSnackbar("Errore nel caricamento delle transazioni", "error");
    emptyDiv.classList.remove("hidden");
    containerDiv.classList.add("hidden");
  } finally {
    // Nascondi loader, torna opacità normale
    loadingDiv.classList.add("hidden");
    containerDiv.style.opacity = "1";
    creditState.isLoadingTransactions = false;
  }
}

/**
 * Aggiorna bottoni e info paginazione
 * @param {number} total - Numero totale transazioni
 * @param {number} offset - Offset attuale (0-indexed)
 * @param {number} limit - Limit per pagina
 */
function updatePagination(total, offset, limit) {
  const pagination = document.getElementById("historyPagination");
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  // Calcola pagina corrente (1-indexed per display)
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;

  // Disabilita pulsanti se primo/ultimo
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  // Mostra paginazione solo se più di una pagina
  if (totalPages > 1) {
    pagination.classList.remove("hidden");
  } else {
    pagination.classList.add("hidden");
  }

  // Event listeners per navigazione pagine
  prevBtn.onclick = () => loadTransactions(currentPage - 2);
  nextBtn.onclick = () => loadTransactions(currentPage);
}

/**
 * Listener per filtro tipo transazione
 * Resetta a pagina 0 e ricarica
 */
document
  .getElementById("filterTransactionType")
  .addEventListener("change", (e) => {
    creditState.filterType = e.target.value;
    loadTransactions(0);
  });

/* ========================================================================
   BANNER STATO ACCOUNT
   Mostra avviso se account sospeso o in attesa di approvazione
   ======================================================================== */

/**
 * Aggiorna visibilità e contenuto del banner stato account
 * @param {string} stato - Stato account: "attivo" | "sospeso" | "in_attesa_approvazione"
 */
function updateAccountStatusBanner(stato) {
  const banner = document.getElementById("accountStatusBanner");
  const title = document.getElementById("statusBannerTitle");
  const message = document.getElementById("statusBannerMessage");
  const actionBtn = document.getElementById("statusBannerAction");

  // Se account attivo, nascondi banner
  if (stato === "attivo") {
    banner.classList.add("hidden");
    return;
  }

  banner.classList.remove("hidden");

  // Personalizza messaggio in base allo stato
  if (stato === "sospeso") {
    title.textContent = "Account Sospeso";
    message.textContent = "Ricarica il credito per richiedere la riapertura.";
    actionBtn.style.display = "block";
    actionBtn.textContent = "Richiedi Riapertura";
    actionBtn.onclick = requestReactivation;
  } else if (stato === "in_attesa_approvazione") {
    title.textContent = "In Attesa di Approvazione";
    message.textContent =
      "La tua richiesta di riapertura è in attesa di approvazione dal gestore.";
    actionBtn.style.display = "none";
  }
}

/**
 * Richiedi riapertura account al gestore
 * Endpoint: POST /transactions/request-reactivation
 */
async function requestReactivation() {
  const btn = document.getElementById("statusBannerAction");
  btn.disabled = true;

  try {
    await fetchAPI("/transactions/request-reactivation", {
      method: "POST",
      body: JSON.stringify({}),
    });

    showSnackbar(
      "Richiesta inviata. In attesa di approvazione del gestore.",
      "success"
    );

    // Ricarica balance per aggiornare banner
    await loadBalance();
  } catch (error) {
    console.error("❌ Errore request reactivation:", error);
    showSnackbar(`${error.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

/* ========================================================================
   INITIALIZATION ON PAGE LOAD
   Gestisce toggle sidebar e carica dati in parallelo
   ======================================================================== */

// DOM elements per sidebar mobile
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

document.addEventListener("DOMContentLoaded", () => {
  // Toggle sidebar on menu click (mobile)
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Chiudi sidebar quando clicchi fuori (mobile)
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });

  // Carica balance, summary e transazioni in parallelo
  Promise.all([loadBalance(), loadBalanceSummary(), loadTransactions(0)]).catch(
    (error) => {
      console.error("❌ Errore caricamento pagina credito:", error);
    }
  );
});
