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
// LOAD DASHBOARD DATA
// ====================================================================
/*async function loadDashboardData() {
  try {
    const response = await fetch("/admin/dashboard-data", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      adminState = { ...adminState, ...data };
      renderDashboard();
    } else {
      showSnackbar("❌ Errore caricamento dati", "error");
    }
  } catch (error) {
    console.error("❌ Errore:", error);
    showSnackbar("❌ Errore di connessione", "error");
  }
}*/

// ====================================================================
// RENDER DASHBOARD
// ====================================================================
function renderDashboard() {
  // Mezzi
  const totalVehicles = adminState.vehicles?.length || 0;
  const unavailableVehicles =
    adminState.vehicles?.filter((v) => v.stato === "non_disponibile")?.length ||
    0;
  document.getElementById("meziCount").textContent = totalVehicles;
  document.getElementById(
    "meziKO"
  ).textContent = `${unavailableVehicles} non disponibili`;

  // Corse
  const todayRides = adminState.rides?.length || 0;
  document.getElementById("rideCount").textContent = todayRides;

  // Utenti Sospesi
  const suspendedUsers =
    adminState.users?.filter((u) => u.stato === "sospeso")?.length || 0;
  document.getElementById("suspendedCount").textContent = suspendedUsers;

  // Segnalazioni
  const openReports =
    adminState.reports?.filter((r) => r.stato_segnalazione === "aperta")
      ?.length || 0;
  document.getElementById("reportCount").textContent = openReports;

  // Incassi (mock)
  const earnings =
    adminState.rides?.reduce((sum, r) => sum + (parseFloat(r.costo) || 0), 0) ||
    0;
  document.getElementById("earningsCount").textContent = `€${earnings.toFixed(
    2
  )}`;

  // Parcheggi
  const totalParkings = adminState.parkings?.length || 0;
  document.getElementById("parkingCount").textContent = totalParkings;

  // Statistiche Rapide
  const availabilityPercent =
    totalVehicles > 0
      ? Math.round(
          ((totalVehicles - unavailableVehicles) / totalVehicles) * 100
        )
      : 0;
  document.getElementById(
    "availabilityPercent"
  ).textContent = `${availabilityPercent}%`;

  document.getElementById("usagePercent").textContent = `${Math.round(
    Math.random() * 100
  )}%`;
  document.getElementById("reliabilityPercent").textContent = `${Math.round(
    Math.random() * 100
  )}%`;
  document.getElementById("ratingAvg").textContent = `4.${Math.round(
    Math.random() * 9
  )}/5`;
}

// ====================================================================
// INIT
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  //loadDashboardData();

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    showSnackbar("Aggiornamento dati...", "info");
    //loadDashboardData();
  });
});
