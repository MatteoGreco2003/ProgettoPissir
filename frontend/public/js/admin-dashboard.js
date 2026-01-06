// ====================================================================
// STATE
// ====================================================================
let adminState = {
  vehicles: [],
  rides: [],
  users: [],
  reports: [],
  parkings: [],
  isLoading: false,
};

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================
function showSnackbar(message, type = "success") {
  const snackbar = document.getElementById("snackbar");
  snackbar.textContent = message;
  snackbar.className = `snackbar show snackbar--${type}`;
  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3000);
}

function navigateTo(url) {
  window.location.href = url;
}

// ====================================================================
// LOAD USERS DATA
// ====================================================================
async function loadUsersData() {
  try {
    // Carica tutti gli utenti
    const [allUsersResponse, pendingUsersResponse] = await Promise.all([
      fetch("/users/admin/all", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }),
      fetch("/users/admin/pending", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }),
    ]);

    if (!allUsersResponse.ok || !pendingUsersResponse.ok) {
      throw new Error("Errore caricamento dati utenti");
    }

    const allUsersData = await allUsersResponse.json();
    const pendingUsersData = await pendingUsersResponse.json();

    // Store in state
    adminState.users = allUsersData.users || [];
    adminState.pendingUsers = pendingUsersData.pending_users || [];

    renderUsersCard();
  } catch (error) {
    console.error("❌ Errore loadUsersData:", error);
    showSnackbar("❌ Errore caricamento dati utenti", "error");
  }
}

// ====================================================================
// RENDER USERS CARD
// ====================================================================

function renderUsersCard() {
  const allUsers = adminState.users || [];

  // Conta per stato
  const activeUsers = allUsers.filter(
    (u) => u.stato_account === "attivo"
  ).length;
  const suspendedUsers = allUsers.filter(
    (u) => u.stato_account === "sospeso"
  ).length;
  const pendingUsers = allUsers.filter(
    (u) => u.stato_account === "in_attesa_approvazione"
  ).length;

  // Calcola top spender di SEMPRE (tutte le corse completate)
  let topSpender = null;
  let topSpenderAmount = 0;

  if (adminState.allCompletedRides && adminState.allCompletedRides.length > 0) {
    // Somma i costi per ogni utente da TUTTE le corse di sempre
    const userSpending = {};

    adminState.allCompletedRides.forEach((ride) => {
      const userId = ride.id_utente;
      const originalCost = parseFloat(ride.costo || 0);

      // ⚠️ NUOVO: Calcola il costo effettivo considerando i punti fedeltà usati
      const loyaltyPointsUsed = ride.punti_fedeltà_usati || 0;
      const loyaltyDiscount = loyaltyPointsUsed * 0.05; // 0.05€ per punto
      const effectiveCost = Math.max(0, originalCost - loyaltyDiscount); // Non può essere negativo

      if (!userSpending[userId]) {
        userSpending[userId] = 0;
      }
      userSpending[userId] += effectiveCost; // ✅ Usa il costo effettivo
    });

    // Trova l'utente con la spesa maggiore
    for (const userId in userSpending) {
      // Trova l'utente nei dati
      const user = allUsers.find((u) => u.id_utente === parseInt(userId));

      if (user && userSpending[userId] > topSpenderAmount) {
        topSpenderAmount = userSpending[userId];
        topSpender = user;
      }
    }
  }

  // Aggiorna DOM
  document.getElementById("totalUsersCount").textContent = allUsers.length;
  document.getElementById("activeUsersCount").textContent = activeUsers;
  document.getElementById("suspendedUsersCount").textContent = suspendedUsers;
  document.getElementById("pendingUsersCount").textContent = pendingUsers;

  // Aggiorna Top Spender (di sempre, non solo oggi)
  if (topSpender) {
    const topSpenderName =
      topSpender.nome && topSpender.cognome
        ? `${topSpender.nome} ${topSpender.cognome}`
        : topSpender.email || "N/A";

    document.getElementById(
      "topUserDetail"
    ).innerHTML = `<strong>${topSpenderName}</strong><br><small>Totale speso: €${topSpenderAmount.toFixed(
      2
    )}</small>`;
  } else {
    document.getElementById(
      "topUserDetail"
    ).innerHTML = `<strong>Utente Eliminato</strong><br><small>Totale speso: €${topSpenderAmount.toFixed(
      2
    )}</small>`;
  }
}

// ====================================================================
// LOAD ALL COMPLETED RIDES DATA (per calcolare top spender di sempre)
// ====================================================================
async function loadAllCompletedRidesData() {
  try {
    const response = await fetch("/rides/all-completed", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Errore caricamento tutte le corse");
    }

    const data = await response.json();
    adminState.allCompletedRides = data.rides || [];

    renderUsersCard(); // Aggiorna la card utenti con nuovo top spender
  } catch (error) {
    console.error("❌ Errore loadAllCompletedRidesData:", error);
    // Non mostrare snackbar per questo, è un dato secondario
  }
}

// ====================================================================
// LOAD VEHICLES DATA
// ====================================================================
async function loadVehiclesData() {
  try {
    const response = await fetch("/vehicles/data", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Errore caricamento dati mezzi");
    }

    const data = await response.json();
    adminState.vehicles = data.vehicles || [];

    renderVehiclesCard();
  } catch (error) {
    console.error("❌ Errore loadVehiclesData:", error);
    showSnackbar("❌ Errore caricamento dati mezzi", "error");
  }
}

// ====================================================================
// RENDER VEHICLES CARD
// ====================================================================
function renderVehiclesCard() {
  const allVehicles = adminState.vehicles || [];

  // Calcola conteggi per stato
  const totalVehicles = allVehicles.length;
  const availableVehicles = allVehicles.filter(
    (v) => v.stato === "disponibile"
  ).length;
  const unavailableVehicles = allVehicles.filter(
    (v) => v.stato === "non_prelevabile"
  ).length;
  const maintenanceVehicles = allVehicles.filter(
    (v) => v.stato === "in_manutenzione"
  ).length;
  const inUseVehicles = allVehicles.filter((v) => v.stato === "in_uso").length;

  // Calcola conteggi per tipo
  const bikeCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "bicicletta_muscolare"
  ).length;
  const ebikeCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "bicicletta_elettrica"
  ).length;
  const scooterCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "monopattino"
  ).length;

  // Aggiorna valori nel DOM - Status
  document.getElementById("totalVehiclesCount").textContent = totalVehicles;
  document.getElementById("availableVehiclesCount").textContent =
    availableVehicles;
  document.getElementById("unavailableVehiclesCount").textContent =
    unavailableVehicles;
  document.getElementById("maintenanceVehiclesCount").textContent =
    maintenanceVehicles;
  document.getElementById("inUseVehiclesCount").textContent = inUseVehicles;

  // Aggiorna valori nel DOM - Tipi
  document.querySelector("#bikeBadge .type-count").textContent = bikeCount;
  document.querySelector("#ebikeBadge .type-count").textContent = ebikeCount;
  document.querySelector("#scooterBadge .type-count").textContent =
    scooterCount;
}

// ====================================================================
// LOAD PARKINGS DATA
// ====================================================================
async function loadParkingsData() {
  try {
    const response = await fetch("/parking/data", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Errore caricamento dati parcheggi");
    }

    const data = await response.json();
    adminState.parkings = data.parkings || [];

    renderParkingsCard();
  } catch (error) {
    console.error("❌ Errore loadParkingsData:", error);
    showSnackbar("❌ Errore caricamento dati parcheggi", "error");
  }
}

// ====================================================================
// RENDER PARKINGS CARD
// ====================================================================
function renderParkingsCard() {
  const allParkings = adminState.parkings || [];

  // Calcola totali
  const totalParkings = allParkings.length;

  // Calcola occupazione globale
  let totalCapacity = 0;
  let totalOccupied = 0;

  allParkings.forEach((parking) => {
    totalCapacity += parking.capacita || 0;
    totalOccupied += parking.vehicles?.length || 0;
  });

  const totalAvailable = totalCapacity - totalOccupied;
  const occupancyPercent =
    totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Aggiorna valori nel DOM
  document.getElementById("totalParkingsCount").textContent = totalParkings;
  document.getElementById("totalCapacity").textContent = totalCapacity;
  document.getElementById("totalOccupied").textContent = totalOccupied;
  document.getElementById("totalAvailable").textContent = totalAvailable;
  document.getElementById(
    "occupancyPercent"
  ).textContent = `${occupancyPercent}%`;

  // Aggiorna progress bar
  const occupancyFill = document.getElementById("occupancyFill");
  occupancyFill.style.width = `${occupancyPercent}%`;

  // Cambia colore della progress bar se occupazione alta (>80%)
  if (occupancyPercent > 80) {
    occupancyFill.classList.add("high");
  } else {
    occupancyFill.classList.remove("high");
  }
}

// ====================================================================
// LOAD RIDES TODAY DATA
// ====================================================================
async function loadRidesTodayData() {
  try {
    const response = await fetch("/rides/today", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Errore caricamento dati corse");
    }

    const data = await response.json();
    adminState.ridesToday = data.rides || [];

    renderRidesCard();
    renderEarningsCard();
  } catch (error) {
    console.error("❌ Errore loadRidesTodayData:", error);
    showSnackbar("❌ Errore caricamento dati corse", "error");
  }
}

// ====================================================================
// RENDER RIDES CARD
// ====================================================================
function renderRidesCard() {
  const allRides = adminState.ridesToday || [];

  // Calcola conteggi per stato
  const totalRides = allRides.length;
  const completedRides = allRides.filter(
    (r) => r.stato_corsa === "completata"
  ).length;
  const activeRides = allRides.filter(
    (r) =>
      r.stato_corsa === "in_corso" ||
      r.stato_corsa === "sospesa_batteria_esaurita"
  ).length;

  // Calcola km totali
  const totalKm = allRides.reduce(
    (sum, r) => sum + parseFloat(r.km_percorsi || 0),
    0
  );

  // Aggiorna valori nel DOM
  document.getElementById("totalRidesTodayCount").textContent = totalRides;
  document.getElementById("completedRidesCount").textContent = completedRides;
  document.getElementById("activeRidesCount").textContent = activeRides;
  document.getElementById("totalKmToday").textContent = `${totalKm.toFixed(
    1
  )} km`;
}

// ====================================================================
// RENDER EARNINGS CARD
// ====================================================================
function renderEarningsCard() {
  const allRides = adminState.ridesToday || [];

  // Filtra solo corse completate (corse pagate)
  const paidRides = allRides.filter((r) => r.stato_corsa === "completata");

  // ✅ MODIFICA: Calcola il costo REALE (con sconto applicato)
  const totalEarnings = paidRides.reduce((sum, r) => {
    const costoBase = parseFloat(r.costo || 0);
    const scontoTotale = (r.punti_fedeltà_usati || 0) * 0.05;
    const costoReale = Math.max(0, costoBase - scontoTotale);
    return sum + costoReale;
  }, 0);

  // ✅ MODIFICA: Calcola le medie con il costo REALE
  const avgPerRide =
    paidRides.length > 0 ? totalEarnings / paidRides.length : 0;

  // ✅ MODIFICA: Trova il max con il costo REALE
  const maxRideEarning =
    paidRides.length > 0
      ? Math.max(
          ...paidRides.map((r) => {
            const costoBase = parseFloat(r.costo || 0);
            const scontoTotale = (r.punti_fedeltà_usati || 0) * 0.05;
            return Math.max(0, costoBase - scontoTotale);
          })
        )
      : 0;

  // ✅ MODIFICA: Calcola incassi per tipo di mezzo con costo REALE
  const earningsByType = {
    bicicletta_muscolare: 0,
    bicicletta_elettrica: 0,
    monopattino: 0,
  };

  paidRides.forEach((ride) => {
    if (
      ride.vehicle &&
      earningsByType.hasOwnProperty(ride.vehicle.tipo_mezzo)
    ) {
      const costoBase = parseFloat(ride.costo || 0);
      const scontoTotale = (ride.punti_fedeltà_usati || 0) * 0.05;
      const costoReale = Math.max(0, costoBase - scontoTotale);
      earningsByType[ride.vehicle.tipo_mezzo] += costoReale;
    }
  });

  // Aggiorna valori nel DOM
  document.getElementById(
    "totalEarningsValue"
  ).textContent = `€${totalEarnings.toFixed(2)}`;
  document.getElementById("paidRidesCount").textContent = paidRides.length;
  document.getElementById("avgPerRide").textContent = `€${avgPerRide.toFixed(
    2
  )}`;
  document.getElementById(
    "maxRideEarning"
  ).textContent = `€${maxRideEarning.toFixed(2)}`;

  // Aggiorna incassi per tipo
  document.getElementById(
    "earningsBike"
  ).textContent = `€${earningsByType.bicicletta_muscolare.toFixed(2)}`;
  document.getElementById(
    "earningsEbike"
  ).textContent = `€${earningsByType.bicicletta_elettrica.toFixed(2)}`;
  document.getElementById(
    "earningsScooter"
  ).textContent = `€${earningsByType.monopattino.toFixed(2)}`;
}

// ====================================================================
// LOAD REPORTS DATA
// ====================================================================
async function loadReportsData() {
  try {
    const response = await fetch("/reports/admin/all-reports", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Errore caricamento dati segnalazioni");
    }

    const data = await response.json();
    adminState.reports = data.reports || [];

    renderReportsCard();
  } catch (error) {
    console.error("❌ Errore loadReportsData:", error);
    showSnackbar("❌ Errore caricamento dati segnalazioni", "error");
  }
}

// ====================================================================
// RENDER REPORTS CARD
// ====================================================================
function renderReportsCard() {
  const allReports = adminState.reports || [];

  // Calcola conteggi per stato
  const totalOpenReports = allReports.filter(
    (r) => r.stato_segnalazione === "aperta"
  ).length;
  const inProgressReports = allReports.filter(
    (r) => r.stato_segnalazione === "in_lavorazione"
  ).length;
  const resolvedReports = allReports.filter(
    (r) => r.stato_segnalazione === "risolta"
  ).length;

  // Filtra SOLO segnalazioni aperte e in lavorazione
  const openAndInProgressReports = allReports.filter(
    (r) =>
      r.stato_segnalazione === "aperta" ||
      r.stato_segnalazione === "in_lavorazione"
  );

  // Calcola conteggi per tipo di problema (SOLO aperte e in lavorazione)
  const problemCounts = {
    danno_fisico: 0,
    batteria_scarica: 0,
    pneumatico_bucato: 0,
    non_funziona: 0,
    sporco: 0,
    altro: 0,
  };

  openAndInProgressReports.forEach((report) => {
    if (problemCounts.hasOwnProperty(report.tipo_problema)) {
      problemCounts[report.tipo_problema]++;
    }
  });

  // Aggiorna valori nel DOM - Status
  document.getElementById("totalOpenReportsCount").textContent =
    totalOpenReports;
  document.getElementById("openReportsCount").textContent = totalOpenReports;
  document.getElementById("inProgressReportsCount").textContent =
    inProgressReports;
  document.getElementById("resolvedReportsCount").textContent = resolvedReports;

  // Aggiorna valori nel DOM - Tipi di problema
  document.querySelector("#damagoBadge .problem-count").textContent =
    problemCounts.danno_fisico;
  document.querySelector("#batteryBadge .problem-count").textContent =
    problemCounts.batteria_scarica;
  document.querySelector("#tyreBadge .problem-count").textContent =
    problemCounts.pneumatico_bucato;
  document.querySelector("#malfunctionBadge .problem-count").textContent =
    problemCounts.non_funziona;
  document.querySelector("#dirtyBadge .problem-count").textContent =
    problemCounts.sporco;
  document.querySelector("#otherBadge .problem-count").textContent =
    problemCounts.altro;
}

// ====================================================================
// INIT
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadUsersData();
  loadVehiclesData();
  loadParkingsData();
  loadRidesTodayData();
  loadReportsData();
  loadAllCompletedRidesData();

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
