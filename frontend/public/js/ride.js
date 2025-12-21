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
  batteryZero: false,
  mqttClient: null, // ✅ NUOVO: Cliente MQTT
  punti_fedeltà: 0,  // ✅ NUOVO: Punti disponibili
  usaPunti: false,   // ✅ NUOVO: Flag se usa punti
};

// ===== DOM ELEMENTS =====
const timerDisplay = document.getElementById("timerDisplay");
const endRideBtn = document.getElementById("endRideBtn");
const parkingSelect = document.getElementById("parkingSelect");
const snackbar = document.getElementById("snackbar");
const costValue = document.getElementById("costValue");
const distanceValue = document.getElementById("distanceValue");
const speedValue = document.getElementById("speedValue");
const batteryValue = document.getElementById("batteryValue");
const errorDiv = document.getElementById("rideError");

const usaPuntiToggle = document.getElementById("usaPuntiToggle");
const puntiDisponibili = document.getElementById("puntiDisponibili");
const scontoCalcolato = document.getElementById("scontoCalcolato");
const puntiInfo = document.getElementById("puntiInfo");

// ===== TARIFFE PER TIPO MEZZO =====
function getTariffaOraria(tipoMezzo) {
  const tariffe = {
    bicicletta_muscolare: 0.15,
    monopattino: 0.2,
    bicicletta_elettrica: 0.25,
  };
  return tariffe[tipoMezzo] || 0.2;
}

// ✅ Calcola km percorsi da durata e tipo mezzo
function calcolaKmPercorsiDaMinuti(minuti, tipoMezzo) {
  const velocitaMedia = getVelocitaMedia(tipoMezzo);
  return (minuti / 60) * velocitaMedia;
}

// ✅ Determina velocità media in base al tipo mezzo
function getVelocitaMedia(tipoMezzo) {
  switch (tipoMezzo) {
    case "bicicletta_muscolare":
      return 15; // km/h
    case "bicicletta_elettrica":
      return 25; // km/h
    case "monopattino":
      return 20; // km/h
    default:
      return 15;
  }
}

// ✅ NUOVO: Controlla se il mezzo ha batteria
function haBatteria(tipoMezzo) {
  const mezziConBatteria = ["monopattino", "bicicletta_elettrica"];
  return mezziConBatteria.includes(tipoMezzo);
}

// ===== MQTT CLIENT INITIALIZATION =====
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

    // ✅ RIMOSSO: reconnect (non supportato dalla libreria)
    rideState.mqttClient.connect({
      onSuccess: onMQTTConnected,
      onFailure: onMQTTConnectionFailed,
      useSSL: false,
      keepAliveInterval: 60,
    });

    console.log("🔌 Tentando connessione MQTT...");
  } catch (error) {
    console.warn("⚠️ Errore MQTT init:", error.message);
    console.info("💡 Fallback: Continuerò con polling locale della batteria");
  }
}

// Callback: connessione persa
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.warn("⚠️ MQTT Disconnesso:", responseObject.errorMessage);
    console.info("🔄 Tentativa di riconnessione...");
  }
}

// Callback: messaggio ricevuto
function onMessageArrived(message) {
  try {
    const payload = JSON.parse(message.payloadString);
    console.log("📩 MQTT Message ricevuto:", payload);

    // ✅ Aggiorna la batteria dal messaggio MQTT
    if (payload.level !== undefined) {
      const newBattery = payload.level;

      document.getElementById("summaryBatteria").textContent = `${newBattery}%`;
      batteryValue.textContent = `${newBattery}%`;

      if (rideState.vehicleData) {
        rideState.vehicleData.stato_batteria = newBattery;
      }

      animateBatteryUpdate(newBattery);

      // ✅ Se batteria = 0, blocca tutto (MA SOLO SE il mezzo ha batteria)
      if (newBattery <= 0 && haBatteria(rideState.vehicleData?.tipo_mezzo)) {
        handleBatteryZero();
      }

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

function onMQTTConnected() {
  console.log("✅ MQTT Connesso!");

  // ✅ Attendi che vehicleData sia caricato
  if (rideState.vehicleData) {
    const batteryTopic = `Vehicles/${rideState.vehicleData.id_mezzo}/battery`;
    rideState.mqttClient.subscribe(batteryTopic);
    console.log(`📡 Iscritto a: ${batteryTopic}`);
  } else {
    console.warn(
      "⚠️ vehicleData non ancora caricato, sottoscrizione posticipata"
    );
    // Riprova dopo 1 secondo
    setTimeout(() => {
      if (rideState.vehicleData) {
        const batteryTopic = `Vehicles/${rideState.vehicleData.id_mezzo}/battery`;
        rideState.mqttClient.subscribe(batteryTopic);
        console.log(`📡 Iscritto a (retry): ${batteryTopic}`);
      }
    }, 1000);
  }
}

// ✅ NUOVO: Animazione visiva quando batteria cambia
function animateBatteryUpdate(newBattery) {
  const batteryElement = document.getElementById("batteryValue");
  batteryElement.style.transition = "color 0.3s ease";

  if (newBattery === null || newBattery === undefined) {
    batteryElement.style.color = "#999"; // Grigio (N/A)
  } else if (newBattery < 20) {
    batteryElement.style.color = "#ef4444"; // Rosso
  } else if (newBattery < 50) {
    batteryElement.style.color = "#f97316"; // Arancione
  } else {
    batteryElement.style.color = "#22c55e"; // Verde
  }
}

function handleBatteryZero() {
  // ✅ NUOVO: Blocca solo se il mezzo HA batteria
  const tipoMezzo = rideState.vehicleData?.tipo_mezzo;
  if (!haBatteria(tipoMezzo)) {
    return;
  }

  if (rideState.batteryZero) return;
  rideState.batteryZero = true;
  if (rideState.timerInterval) clearInterval(rideState.timerInterval);
  speedValue.textContent = "0";
  endRideBtn.textContent = "Paga Ora";
  endRideBtn.style.background = "#dc2626";
  showBatteryZeroModal();
}

function showBatteryZeroModal() {
  const modal = document.createElement("div");
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      z-index: 999;
      box-shadow: 0 20px 60px rgba(220, 38, 38, 0.3);
      animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <div style="font-size: 60px; margin-bottom: 20px; animation: shake 0.5s ease-in-out;">🔋</div>
      <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px;">
        Batteria Esaurita!
      </div>
      <div style="color: #666; margin-bottom: 20px; font-size: 16px;">
        Il mezzo si è fermato.
      </div>
      <div style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
        Seleziona il parcheggio di arrivo e procedi al pagamento per completare la corsa.
      </div>
      <button id="closeModal" style="
        padding: 10px 30px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s ease;
      ">OK</button>
    </div>
    <style>
      @keyframes pop {
        from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-5deg); }
        75% { transform: rotate(5deg); }
      }
      #closeModal:hover {
        background: #b91c1c !important;
      }
    </style>
  `;
  document.body.appendChild(modal);

  // ✅ Chiudi modal quando clicchi OK
  document.getElementById("closeModal").addEventListener("click", () => {
    modal.remove();
    parkingSelect.focus(); // Focus sul select parcheggio
  });
}

// ✅ NUOVO: Carica punti fedeltà dell'utente
function loadUserPunti() {
  fetch("/users/me")  // Assicurati di avere questa route nel backend
    .then((res) => res.json())
    .then((data) => {
      if (data.punti !== undefined) {
        rideState.punti_fedeltà = data.punti;
        puntiDisponibili.textContent = data.punti;
        
        // Se ha punti, mostra il toggle
        if (data.punti > 0) {
          usaPuntiToggle.disabled = false;
          usaPuntiToggle.parentElement.style.opacity = "1";
        } else {
          usaPuntiToggle.disabled = true;
          usaPuntiToggle.parentElement.style.opacity = "0.5";
        }
      }
    })
    .catch((err) => {
      console.error("❌ Errore caricamento punti:", err);
      usaPuntiToggle.disabled = true;
    });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  if (!rideState.rideId) {
    showError("Errore", "ID corsa non valido");
    return;
  }

  loadRideData();
  loadParkings();
  loadUserPunti();
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

      if (data.ride.stato_corsa === "in_corso") {
        const now = new Date();
        const inizio = new Date(data.ride.data_ora_inizio);
        const durataRealeMs = now - inizio;
        const durataRealeS = Math.floor(durataRealeMs / 1000);

        rideState.elapsedSeconds = durataRealeS;
        rideState.startTime = now - durataRealeMs;

        const durataRealeMin = durataRealeS / 60; // Converti a minuti!
        const kmPercorsi = calcolaKmPercorsiDaMinuti(
          durataRealeMin, // ← minuti!
          rideState.vehicleData.tipo_mezzo
        );
        distanceValue.textContent = kmPercorsi.toFixed(1);

        console.log(`⏱️ RESUME: ${durataRealeS}s - ${kmPercorsi.toFixed(1)}km`);
      }

      updateRideUI(data.ride);
    })
    .catch((error) => {
      console.error("❌ Errore caricamento corsa:", error);
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
  document.getElementById("summaryPartenza").textContent =
    ride.parkingInizio?.nome || "N/A";

  // ✅ Mostra batteria solo se il mezzo la ha
  const tipoMezzo = vehicle.tipo_mezzo;
  if (haBatteria(tipoMezzo)) {
    document.getElementById("summaryBatteria").textContent =
      (vehicle.stato_batteria !== null ? vehicle.stato_batteria : "N/A") + "%";
    batteryValue.textContent =
      (vehicle.stato_batteria !== null ? vehicle.stato_batteria : "N/A") + "%";
  } else {
    // Mezzo senza batteria
    document.getElementById("summaryBatteria").textContent = "Non Presente";
    batteryValue.textContent = "Non Presente";
    batteryValue.style.color = "#999"; // Grigio (non applicabile)
  }

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

  parkingSelect.innerHTML = `${options}`;
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
  // ✅ NUOVO: Controlla batteria SOLO se il mezzo la ha
  const tipoMezzo = rideState.vehicleData?.tipo_mezzo;
  if (haBatteria(tipoMezzo) && rideState.vehicleData.stato_batteria <= 0) {
    handleBatteryZero();
    return;
  }

  setInterval(() => {
    if (!rideState.isPaused && rideState.vehicleData) {
      // ✅ NUOVO: Calcola km CORRETTAMENTE (non simulare!)
      const minuti = rideState.elapsedSeconds / 60;
      const kmPercorsi = calcolaKmPercorsiDaMinuti(
        minuti,
        rideState.vehicleData.tipo_mezzo
      );
      distanceValue.textContent = kmPercorsi.toFixed(1);

      // Simula velocità (questo è OK)
      const speed = Math.floor(Math.random() * 10) + 15;
      speedValue.textContent = speed;

      // ✅ AGGIORNATO: Decrementa batteria SOLO se MQTT non è disponibile E il mezzo ha batteria
      if (
        haBatteria(tipoMezzo) &&
        (!rideState.mqttClient || !rideState.mqttClient.isConnected())
      ) {
        const batteryLoss = (rideState.elapsedSeconds / 60) * 1; // 1% al minuto
        const remainingBattery = Math.max(
          0,
          rideState.vehicleData.stato_batteria - batteryLoss
        );
        batteryValue.textContent = remainingBattery.toFixed(1) + "%";
        rideState.vehicleData.stato_batteria = remainingBattery;

        // ✅ Se batteria va a zero
        if (remainingBattery <= 0) {
          handleBatteryZero();
        }
      }
    }
  }, 1000);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  endRideBtn.addEventListener("click", endRide);
  parkingSelect.addEventListener("change", (e) => {
    rideState.selectedParkingEnd = e.target.value;
  });

  // ✅ NUOVO: Toggle punti fedeltà
  usaPuntiToggle.addEventListener("change", (e) => {
  rideState.usaPunti = e.target.checked;
  
  if (e.target.checked) {
    const sconto = rideState.punti_fedeltà * 0.05;
    scontoCalcolato.textContent = `€${sconto.toFixed(2)}`;
    puntiInfo.classList.add("active");  // ✅ Usa classe CSS
    console.log(`✅ Punti attivati: €${sconto.toFixed(2)}`);
  } else {
    puntiInfo.classList.remove("active");  // ✅ Usa classe CSS
  }
});
}

// ===== END RIDE =====
function endRide() {
  if (!rideState.selectedParkingEnd) {
    showError("❌ Errore", "Seleziona un parcheggio di arrivo");
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
      endRideBtn.disabled = false;
      endRideBtn.textContent = "Termina Corsa";
    });
}

function endRideWithPayment(cost) {
  const payload = {
    id_parcheggio_fine: parseInt(rideState.selectedParkingEnd),
    importo_ricarica: 0,
    usa_punti: rideState.usaPunti,
  };

  return fetch(`/rides/${rideState.rideId}/end-with-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      showSnackbar("✅ Corsa terminata! Pagamento confermato.", "success");
      clearInterval(rideState.timerInterval);
      if (rideState.mqttClient && rideState.mqttClient.isConnected()) {
        rideState.mqttClient.disconnect();
      }
      setTimeout(() => {
        window.location.href = "/home-utente";
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
    </div>
    <div class="error-box-content">
      <div class="error-message">${message}</div>
    </div>
  `;

  errorDiv.classList.remove("hidden");

  setTimeout(() => {
    errorDiv.classList.add("hidden");
  }, 10000);
}

// ===== SNACKBAR =====
function showSnackbar(message, type = "success") {
  snackbar.textContent = message;
  snackbar.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbar.classList.remove("show");
  }, 3500);
}
