// Contiene tutti i dati della pagina in un unico oggetto
const creditState = {
  currentBalance: null,
  balanceSummary: null,
  transactions: [],
  currentPage: 0,
  pageSize: 3,
  filterType: "",
  isLoadingTransactions: false,
};

function showSnackbar(message, type = "success") {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = `snackbar ${type}`;
  snackbar.classList.add("show");

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 4000);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

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

function getCreditChipClass(saldo) {
  if (saldo < 0) return "critical-balance";
  if (saldo < 1) return "low-balance";
  return "";
}

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

async function loadBalance() {
  try {
    const data = await fetchAPI("/transactions/balance");
    creditState.currentBalance = data;

    document.getElementById("creditAmount").textContent = formatCurrency(
      data.saldo
    );
    document.getElementById("userName").textContent = data.nome || "—";
    document.getElementById("userCognome").textContent = data.cognome || "—";

    const statusMap = {
      attivo: "🟢 Attivo",
      sospeso: "🔴 Sospeso",
      in_attesa_approvazione: "🟡 In Attesa di Approvazione",
    };
    document.getElementById("accountStatus").textContent =
      statusMap[data.stato_account] || data.stato_account;

    const chip = document.querySelector(".credit-chip");
    chip.className = `credit-chip ${getCreditChipClass(data.saldo)}`;

    updateAccountStatusBanner(data.stato_account);
  } catch (error) {
    console.error("❌ Errore caricamento balance:", error);
  }
}

async function loadBalanceSummary() {
  try {
    const data = await fetchAPI("/transactions/summary");

    document.getElementById("totalRecharges").textContent = formatCurrency(
      data.totale_ricaricato
    );
    document.getElementById(
      "rechargesCount"
    ).textContent = `(${data.numero_ricariche} ricariche)`;

    document.getElementById("totalExpenses").textContent = formatCurrency(
      data.totale_speso
    );
    document.getElementById(
      "expensesCount"
    ).textContent = `(${data.numero_corse} corse)`;

    document.getElementById("ridesCount").textContent = data.numero_corse;
  } catch (error) {
    console.error("❌ Errore caricamento summary:", error);
  }
}

document
  .getElementById("rechargeForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("rechargeAmount").value);
    const method = document.getElementById("paymentMethod").value;
    const btn = document.getElementById("rechargeBtn");

    btn.disabled = true;

    try {
      const response = await fetchAPI("/transactions/recharge", {
        method: "POST",
        body: JSON.stringify({
          importo: amount.toFixed(2),
          metodo_pagamento: method,
        }),
      });

      showSnackbar(`Credito ricaricato: +${formatCurrency(amount)}`, "success");

      document.getElementById("rechargeForm").reset();

      await loadBalance();
      await loadBalanceSummary();
      await loadTransactions();

      if (response.avviso) {
        setTimeout(() => {
          showSnackbar(response.avviso, "warning");
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Errore ricarica:", error);
    } finally {
      btn.disabled = false;
    }
  });

async function loadTransactions(page = 0) {
  creditState.isLoadingTransactions = true;

  const loadingDiv = document.getElementById("historyLoading");
  const containerDiv = document.getElementById("historyContainer");
  const emptyDiv = document.getElementById("historyEmpty");
  const tableBody = document.getElementById("transactionsTableBody");

  loadingDiv.classList.remove("hidden");
  containerDiv.style.opacity = "0.5";

  try {
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

    tableBody.innerHTML = "";

    if (response.transactions.length === 0) {
      containerDiv.classList.add("hidden");
      emptyDiv.classList.remove("hidden");
    } else {
      containerDiv.classList.remove("hidden");
      emptyDiv.classList.add("hidden");

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

        let importoMostrato,
          scontoHTML = "";

        if (isRecharge) {
          importoMostrato = parseFloat(transaction.importo) || 0;
        } else {
          importoMostrato = parseFloat(
            transaction.importo_pagato || transaction.importo
          );

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

    updatePagination(response.total, response.offset, response.limit);
  } catch (error) {
    console.error("❌ Errore caricamento transazioni:", error);
    emptyDiv.classList.remove("hidden");
    containerDiv.classList.add("hidden");
  } finally {
    loadingDiv.classList.add("hidden");
    containerDiv.style.opacity = "1";
    creditState.isLoadingTransactions = false;
  }
}

function updatePagination(total, offset, limit) {
  const pagination = document.getElementById("historyPagination");
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  if (totalPages > 1) {
    pagination.classList.remove("hidden");
  } else {
    pagination.classList.add("hidden");
  }

  prevBtn.onclick = () => loadTransactions(currentPage - 2);
  nextBtn.onclick = () => loadTransactions(currentPage);
}

document
  .getElementById("filterTransactionType")
  .addEventListener("change", (e) => {
    creditState.filterType = e.target.value;
    loadTransactions(0);
  });

function updateAccountStatusBanner(stato) {
  const banner = document.getElementById("accountStatusBanner");
  const title = document.getElementById("statusBannerTitle");
  const message = document.getElementById("statusBannerMessage");
  const actionBtn = document.getElementById("statusBannerAction");

  if (stato === "attivo") {
    banner.classList.add("hidden");
    return;
  }

  banner.classList.remove("hidden");

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

    await loadBalance();
  } catch (error) {
    console.error("❌ Errore request reactivation:", error);
  } finally {
    btn.disabled = false;
  }
}

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

document.addEventListener("DOMContentLoaded", () => {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });

  Promise.all([loadBalance(), loadBalanceSummary(), loadTransactions(0)]).catch(
    (error) => {
      console.error("❌ Errore caricamento pagina credito:", error);
    }
  );
});
