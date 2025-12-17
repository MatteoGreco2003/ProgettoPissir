// ===== RIDE STATE =====
let rideState = {
  rideId: new URLSearchParams(window.location.search).get("ride_id"),
  vehicleData: null,
  rideData: null,
  parkings: [],
  startTime: Date.now(),
  elapsedSeconds: 0,
  isPaused: false,
  selectedParkingEnd: null,
  timerInterval: null,
  mqttClient: null, // ✅ NUOVO: Cliente MQTT
};

// ===== DOM ELEMENTS =====
const timerDisplay = document.getElementById("timerDisplay");
const endRideBtn = document.getElementById("endRideBtn");
const pauseRideBtn = document.getElementById("pauseRideBtn");
const parkingSelect = document.getElementById("parkingSelect");
const snackbar = document.getElementById("snackbar");
const costValue = document.getElementById("costValue");
const distanceValue = document.getElementById("distanceValue");
const speedValue = document.getElementById("speedValue");
const batteryValue = document.getElementById("batteryValue");
const errorDiv = document.getElementById("rideError");

// ===== TARIFFE PER TIPO MEZZO =====
function getTariffaOraria(tipoMezzo) {
  const tariffe = {
    bicicletta_muscolare: 0.15,
    monopattino: 0.2,
    bicicletta_elettrica: 0.25,
  };
  return tariffe[tipoMezzo] || 0.2;
}

// ===== MQTT CLIENT INITIALIZATION =====
// ✅ NUOVO: Inizializza cliente MQTT
function initMQTTClient() {
  if (typeof Paho === "undefined") {
    console.warn(
      "⚠️ Libreria MQTT non caricata. Aggiorna la batteria tramite polling."
    );
    return;
  }

  const brokerUrl = "ws://localhost:9001"; // ✅ WebSocket MQTT
  const clientId = `mobishare-${Date.now()}`;

  try {
    const broker = brokerUrl.replace("ws://", "").split(":")[0];
    const port = parseInt(brokerUrl.split(":")[1]) || 9001;

    rideState.mqttClient = new Paho.MQTT.Client(broker, port, clientId);

    rideState.mqttClient.onConnectionLost = onConnectionLost;
    rideState.mqttClient.onMessageArrived = onMessageArrived;

    rideState.mqttClient.connect({
      onSuccess: onMQTTConnected,
      onFailure: onMQTTConnectionFailed,
      useSSL: false,
    });

    console.log("🔌 Tentando connessione MQTT...");
  } catch (error) {
    console.warn("⚠️ Errore MQTT init:", error.message);
  }
}

// Callback: connessione riuscita
function onMQTTConnected() {
  console.log("✅ MQTT Connesso!");

  if (rideState.vehicleData) {
    const batteryTopic = `Vehicles/${rideState.vehicleData.id_mezzo}/battery`;
    rideState.mqttClient.subscribe(batteryTopic);
    console.log(`📡 Iscritto a: ${batteryTopic}`);
  }
}

// Callback: connessione persa
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.warn("⚠️ MQTT Disconnesso:", responseObject.errorMessage);
  }
}

// Callback: messaggio ricevuto
function onMessageArrived(message) {
  try {
    const payload = JSON.parse(message.payloadString);
    console.log("📩 MQTT Message:", payload);

    // ✅ Aggiorna la batteria dal messaggio MQTT
    if (payload.level !== undefined) {
      const newBattery = payload.level;

      document.getElementById("summaryBatteria").textContent = `${newBattery}%`;
      batteryValue.textContent = `${newBattery}%`;

      if (rideState.vehicleData) {
        rideState.vehicleData.stato_batteria = newBattery;
      }

      animateBatteryUpdate(newBattery);

      console.log(`⚡ Batteria aggiornata: ${newBattery}%`);
    }
  } catch (error) {
    console.error("❌ Errore parsing MQTT message:", error);
  }
}

function onMQTTConnectionFailed(responseObject) {
  console.warn("⚠️ MQTT Connection Failed:", responseObject.errorMessage);
  console.info("💡 Fallback: Continuerò con polling locale della batteria");
}

// ✅ NUOVO: Animazione visiva quando batteria cambia
function animateBatteryUpdate(newBattery) {
  const batteryElement = document.getElementById("batteryValue");
  batteryElement.style.transition = "color 0.3s ease";

  if (newBattery < 20) {
    batteryElement.style.color = "#ef4444"; // Rosso
  } else if (newBattery < 50) {
    batteryElement.style.color = "#f97316"; // Arancione
  } else {
    batteryElement.style.color = "#22c55e"; // Verde
  }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  if (!rideState.rideId) {
    showError("Errore", "ID corsa non valido");
    return;
  }

  loadRideData();
  loadParkings();
  setupEventListeners();

  // ✅ NUOVO: Connetti MQTT subito
  initMQTTClient();

  setTimeout(() => {
    startTimer();
    simulateRideData();
  }, 500);
});

// ===== CLEANUP quando chiudi la pagina =====
window.addEventListener("beforeunload", () => {
  if (rideState.mqttClient && rideState.mqttClient.isConnected()) {
    rideState.mqttClient.disconnect();
    console.log("🔌 MQTT Disconnesso");
  }
});

// ===== LOAD RIDE DATA =====
function loadRideData() {
  fetch(`/rides/${rideState.rideId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Corsa non trovata");
      return res.json();
    })
    .then((data) => {
      rideState.rideData = data.ride;
      rideState.vehicleData = data.ride.vehicle;
      updateRideUI(data.ride);
    })
    .catch((error) => {
      console.error("❌ Errore caricamento corsa:", error);
      showError("Errore", "Non è possibile caricare i dati della corsa");
    });
}

function updateRideUI(ride) {
  const vehicle = ride.vehicle;

  document.getElementById("vehicleTitle").textContent = vehicle.tipo_mezzo
    .replace(/_/g, " ")
    .toUpperCase();

  document.getElementById("summaryMezzo").textContent =
    vehicle.codice_identificativo || "N/A";
  document.getElementById("summaryTipo").textContent = vehicle.tipo_mezzo
    .replace(/_/g, " ")
    .toUpperCase();
  document.getElementById("summaryBatteria").textContent =
    vehicle.stato_batteria + "%";
  document.getElementById("summaryPartenza").textContent =
    ride.parkingInizio?.nome || "N/A";

  batteryValue.textContent = vehicle.stato_batteria + "%";

  const tariffaOraria = getTariffaOraria(vehicle.tipo_mezzo);
  const warningBox = document.querySelector(".warning-box span");
  if (warningBox) {
    warningBox.textContent = `Tariffa: €1,00 per i primi 30 minuti, poi €${tariffaOraria.toFixed(
      2
    )} al minuto.`;
  }
}

// ===== LOAD PARKINGS =====
function loadParkings() {
  fetch("/parking/data")
    .then((res) => res.json())
    .then((data) => {
      rideState.parkings = data.parkings || [];
      populateParkingSelect();
    })
    .catch((error) => {
      console.error("❌ Errore caricamento parcheggi:", error);
    });
}

function populateParkingSelect() {
  const options = rideState.parkings
    .map((p) => `<option value="${p.id_parcheggio}">${p.nome}</option>`)
    .join("");

  parkingSelect.innerHTML = `
    <option value="">-- Seleziona parcheggio --</option>
    ${options}
  `;
}

// ===== TIMER =====
function startTimer() {
  rideState.timerInterval = setInterval(() => {
    if (!rideState.isPaused) {
      rideState.elapsedSeconds++;
      updateTimerDisplay();
      calculateCost();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const hours = String(Math.floor(rideState.elapsedSeconds / 3600)).padStart(
    2,
    "0"
  );
  const minutes = String(
    Math.floor((rideState.elapsedSeconds % 3600) / 60)
  ).padStart(2, "0");
  const seconds = String(rideState.elapsedSeconds % 60).padStart(2, "0");

  timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

// ===== COST CALCULATION =====
function calculateCost() {
  if (!rideState.vehicleData) {
    return;
  }

  const minutes = Math.floor(rideState.elapsedSeconds / 60);
  let cost = 0;

  const tariffaOraria = getTariffaOraria(rideState.vehicleData.tipo_mezzo);

  if (minutes <= 30) {
    cost = 1.0;
  } else {
    cost = 1.0 + (minutes - 30) * tariffaOraria;
  }

  costValue.textContent = `€${cost.toFixed(2)}`;
}

// ===== SIMULATE RIDE DATA (Demo) - Con fallback se MQTT non disponibile =====
function simulateRideData() {
  setInterval(() => {
    if (!rideState.isPaused && rideState.vehicleData) {
      // Simula distanza
      const simulatedDistance = (rideState.elapsedSeconds / 30) * 0.5;
      distanceValue.textContent = simulatedDistance.toFixed(1);

      // Simula velocità
      const speed = Math.floor(Math.random() * 10) + 15;
      speedValue.textContent = speed;

      // ✅ AGGIORNATO: Decrementa batteria SOLO se MQTT non è disponibile
      if (!rideState.mqttClient || !rideState.mqttClient.isConnected()) {
        const batteryLoss = (rideState.elapsedSeconds / 60) * 1; // 1% al minuto
        const remainingBattery = Math.max(
          0,
          rideState.vehicleData.stato_batteria - batteryLoss
        );
        batteryValue.textContent = remainingBattery.toFixed(1) + "%";
      }
    }
  }, 1000);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  endRideBtn.addEventListener("click", endRide);
  pauseRideBtn.addEventListener("click", togglePause);
  parkingSelect.addEventListener("change", (e) => {
    rideState.selectedParkingEnd = e.target.value;
  });
}

function togglePause() {
  rideState.isPaused = !rideState.isPaused;

  if (rideState.isPaused) {
    pauseRideBtn.textContent = "⏯️ Riprendi";
    pauseRideBtn.style.background = "#22c55e";
    pauseRideBtn.style.color = "white";
  } else {
    pauseRideBtn.textContent = "⏸️ Pausa";
    pauseRideBtn.style.background = "#f0f0f0";
    pauseRideBtn.style.color = "#333";
  }
}

// ===== END RIDE =====
function endRide() {
  if (!rideState.selectedParkingEnd) {
    showError(
      "❌ Errore",
      "Seleziona un parcheggio di arrivo prima di terminare la corsa"
    );
    return;
  }

  endRideBtn.disabled = true;
  endRideBtn.textContent = "Elaborazione...";

  fetch(`/rides/${rideState.rideId}/check-payment`)
    .then((res) => res.json())
    .then((checkData) => {
      if (checkData.saldo_sufficiente) {
        return endRideWithPayment(checkData.costo);
      } else {
        return endRideWithDebt(checkData);
      }
    })
    .catch((error) => {
      console.error("❌ Errore check payment:", error);
      showError("❌ Errore", "Errore nel controllo del saldo. Riprova.");
      endRideBtn.disabled = false;
      endRideBtn.textContent = "Termina Corsa";
    });
}

function endRideWithPayment(cost) {
  return fetch(`/rides/${rideState.rideId}/end-with-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_parcheggio_fine: parseInt(rideState.selectedParkingEnd),
      importo_ricarica: 0,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      showSnackbar("✅ Corsa terminata! Pagamento confermato.", "success");
      clearInterval(rideState.timerInterval);
      if (rideState.mqttClient && rideState.mqttClient.isConnected()) {
        rideState.mqttClient.disconnect();
      }
      setTimeout(() => {
        window.location.href = "/home";
      }, 2000);
    })
    .catch((error) => {
      console.error("❌ Errore:", error);
      showError("❌ Errore", "Errore nella chiusura della corsa");
      endRideBtn.disabled = false;
      endRideBtn.textContent = "Termina Corsa";
    });
}

function endRideWithDebt(checkData) {
  const importo = Math.ceil(checkData.importo_mancante * 100) / 100;

  showError(
    "⚠️ Saldo insufficiente",
    `Saldo attuale: €${checkData.saldo_attuale.toFixed(
      2
    )}, Costo: €${checkData.costo.toFixed(
      2
    )}. È possibile completare la corsa creando un debito oppure ricaricare ora.`
  );

  endRideBtn.disabled = false;
  endRideBtn.textContent = "Termina Corsa";
}

// ===== ERROR BOX =====
function showError(title, message) {
  errorDiv.innerHTML = `
    <div>
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="error-box-content">
      <div class="error-title">${title}</div>
      <div class="error-message">${message}</div>
    </div>
  `;

  errorDiv.classList.remove("hidden");

  setTimeout(() => {
    errorDiv.classList.add("hidden");
  }, 7000);
}

// ===== SNACKBAR =====
function showSnackbar(message, type = "success") {
  snackbar.textContent = message;
  snackbar.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3500);
}
