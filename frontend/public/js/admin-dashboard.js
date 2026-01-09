// Contiene tutti i dati della pagina in un unico oggetto
let adminState = {
  vehicles: [],
  rides: [],
  users: [],
  reports: [],
  parkings: [],
  isLoading: false,
};

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

async function loadUsersData() {
  try {
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

    adminState.users = allUsersData.users || [];
    adminState.pendingUsers = pendingUsersData.pending_users || [];

    renderUsersCard();
  } catch (error) {
    console.error("❌ Errore loadUsersData:", error);
  }
}

function renderUsersCard() {
  const allUsers = adminState.users || [];

  const activeUsers = allUsers.filter(
    (u) => u.stato_account === "attivo"
  ).length;
  const suspendedUsers = allUsers.filter(
    (u) => u.stato_account === "sospeso"
  ).length;
  const pendingUsers = allUsers.filter(
    (u) => u.stato_account === "in_attesa_approvazione"
  ).length;

  let topSpender = null;
  let topSpenderAmount = 0;

  if (adminState.allCompletedRides && adminState.allCompletedRides.length > 0) {
    const userSpending = {};

    adminState.allCompletedRides.forEach((ride) => {
      const userId = ride.id_utente;
      const originalCost = parseFloat(ride.costo || 0);

      const loyaltyPointsUsed = ride.punti_fedeltà_usati || 0;
      const loyaltyDiscount = loyaltyPointsUsed * 0.05;
      const effectiveCost = Math.max(0, originalCost - loyaltyDiscount);

      if (!userSpending[userId]) {
        userSpending[userId] = 0;
      }
      userSpending[userId] += effectiveCost;
    });

    for (const userId in userSpending) {
      const user = allUsers.find((u) => u.id_utente === parseInt(userId));

      if (user && userSpending[userId] > topSpenderAmount) {
        topSpenderAmount = userSpending[userId];
        topSpender = user;
      }
    }
  }

  document.getElementById("totalUsersCount").textContent = allUsers.length;
  document.getElementById("activeUsersCount").textContent = activeUsers;
  document.getElementById("suspendedUsersCount").textContent = suspendedUsers;
  document.getElementById("pendingUsersCount").textContent = pendingUsers;

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

    renderUsersCard();
  } catch (error) {
    console.error("❌ Errore loadAllCompletedRidesData:", error);
  }
}

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
  }
}

function renderVehiclesCard() {
  const allVehicles = adminState.vehicles || [];

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

  const bikeCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "bicicletta_muscolare"
  ).length;
  const ebikeCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "bicicletta_elettrica"
  ).length;
  const scooterCount = allVehicles.filter(
    (v) => v.tipo_mezzo === "monopattino"
  ).length;

  document.getElementById("totalVehiclesCount").textContent = totalVehicles;
  document.getElementById("availableVehiclesCount").textContent =
    availableVehicles;
  document.getElementById("unavailableVehiclesCount").textContent =
    unavailableVehicles;
  document.getElementById("maintenanceVehiclesCount").textContent =
    maintenanceVehicles;
  document.getElementById("inUseVehiclesCount").textContent = inUseVehicles;

  document.querySelector("#bikeBadge .type-count").textContent = bikeCount;
  document.querySelector("#ebikeBadge .type-count").textContent = ebikeCount;
  document.querySelector("#scooterBadge .type-count").textContent =
    scooterCount;
}

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
  }
}

function renderParkingsCard() {
  const allParkings = adminState.parkings || [];

  const totalParkings = allParkings.length;

  let totalCapacity = 0;
  let totalOccupied = 0;

  allParkings.forEach((parking) => {
    totalCapacity += parking.capacita || 0;
    totalOccupied += parking.vehicles?.length || 0;
  });

  const totalAvailable = totalCapacity - totalOccupied;
  const occupancyPercent =
    totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  document.getElementById("totalParkingsCount").textContent = totalParkings;
  document.getElementById("totalCapacity").textContent = totalCapacity;
  document.getElementById("totalOccupied").textContent = totalOccupied;
  document.getElementById("totalAvailable").textContent = totalAvailable;
  document.getElementById(
    "occupancyPercent"
  ).textContent = `${occupancyPercent}%`;

  const occupancyFill = document.getElementById("occupancyFill");
  occupancyFill.style.width = `${occupancyPercent}%`;

  if (occupancyPercent > 80) {
    occupancyFill.classList.add("high");
  } else {
    occupancyFill.classList.remove("high");
  }
}

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
  }
}

function renderRidesCard() {
  const allRides = adminState.ridesToday || [];

  const totalRides = allRides.length;
  const completedRides = allRides.filter(
    (r) => r.stato_corsa === "completata"
  ).length;
  const activeRides = allRides.filter(
    (r) =>
      r.stato_corsa === "in_corso" ||
      r.stato_corsa === "sospesa_batteria_esaurita"
  ).length;

  const totalKm = allRides.reduce(
    (sum, r) => sum + parseFloat(r.km_percorsi || 0),
    0
  );

  document.getElementById("totalRidesTodayCount").textContent = totalRides;
  document.getElementById("completedRidesCount").textContent = completedRides;
  document.getElementById("activeRidesCount").textContent = activeRides;
  document.getElementById("totalKmToday").textContent = `${totalKm.toFixed(
    1
  )} km`;
}

function renderEarningsCard() {
  const allRides = adminState.ridesToday || [];

  const paidRides = allRides.filter((r) => r.stato_corsa === "completata");

  const totalEarnings = paidRides.reduce((sum, r) => {
    const costoBase = parseFloat(r.costo || 0);
    const scontoTotale = (r.punti_fedeltà_usati || 0) * 0.05;
    const costoReale = Math.max(0, costoBase - scontoTotale);
    return sum + costoReale;
  }, 0);

  const avgPerRide =
    paidRides.length > 0 ? totalEarnings / paidRides.length : 0;

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
  }
}

function renderReportsCard() {
  const allReports = adminState.reports || [];

  const totalOpenReports = allReports.filter(
    (r) => r.stato_segnalazione === "aperta"
  ).length;
  const inProgressReports = allReports.filter(
    (r) => r.stato_segnalazione === "in_lavorazione"
  ).length;
  const resolvedReports = allReports.filter(
    (r) => r.stato_segnalazione === "risolta"
  ).length;

  const openAndInProgressReports = allReports.filter(
    (r) =>
      r.stato_segnalazione === "aperta" ||
      r.stato_segnalazione === "in_lavorazione"
  );

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

  document.getElementById("totalOpenReportsCount").textContent =
    totalOpenReports;
  document.getElementById("openReportsCount").textContent = totalOpenReports;
  document.getElementById("inProgressReportsCount").textContent =
    inProgressReports;
  document.getElementById("resolvedReportsCount").textContent = resolvedReports;

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
