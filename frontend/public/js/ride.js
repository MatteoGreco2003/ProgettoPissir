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
  punti_fedeltà: 0,
  usaPunti: false,
  debtData: null,
  importoRicaricaTemp: 0,
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

// ✅ Formatta un numero come valuta EUR
function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
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

// ✅ Controlla se il mezzo ha batteria
function haBatteria(tipoMezzo) {
  const mezziConBatteria = ["monopattino", "bicicletta_elettrica"];
  return mezziConBatteria.includes(tipoMezzo);
}

// ===== SETUP MQTT LISTENER =====
function setupMQTTListener() {
  document.addEventListener("mqtt-message", (event) => {
    const { topic, payload } = event.detail;

    try {
      const msg = JSON.parse(payload);

      // 🔥 Ascolta gli alert di batteria
      const alertTopic = `Alerts/${rideState.rideData?.id_utente}/battery`;

      if (topic === alertTopic && msg.tipo) {
        handleBatteryAlert(msg);
        return;
      }

      if (
        msg.command === "lock" &&
        msg.id_mezzo === rideState.vehicleData?.id_mezzo
      ) {
        showSnackbar("🔒 Mezzo bloccato! Corsa terminata.", "success", 2000);
      }

      // Fallback vecchio sistema
      if (msg.level !== undefined && msg.id_mezzo !== undefined) {
        const newBattery = msg.level;

        console.log(`⚡ MQTT Ride: Batteria ${newBattery}%`);

        if (
          rideState.vehicleData &&
          rideState.vehicleData.id_mezzo === msg.id_mezzo
        ) {
          rideState.vehicleData.stato_batteria = newBattery;
          document.getElementById("summaryBatteria").textContent =
            newBattery + "%";
          batteryValue.textContent = newBattery + "%";
          animateBatteryUpdate(newBattery);

          if (
            newBattery <= 0 &&
            haBatteria(rideState.vehicleData?.tipo_mezzo)
          ) {
            handleBatteryZero();
          }
        }
      }
    } catch (error) {
      console.error("❌ Errore parsing MQTT:", error);
    }
  });
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
  // ✅ Blocca solo se il mezzo HA batteria
  const tipoMezzo = rideState.vehicleData?.tipo_mezzo;
  if (!haBatteria(tipoMezzo)) {
    return;
  }

  if (rideState.batteryZero) return;
  rideState.batteryZero = true;

  const ultimiDatiValidi = {
    km: parseFloat(distanceValue.textContent) || 0,
    durata: rideState.elapsedSeconds,
    costo: costValue.textContent, // Salva la stringa con €
  };

  if (rideState.timerInterval) clearInterval(rideState.timerInterval);

  speedValue.textContent = "0";
  batteryValue.textContent = "0%";
  rideState.vehicleData.stato_batteria = 0;
  document.getElementById("summaryBatteria").textContent = "0%";

  // Cambia colore batteria a rosso
  animateBatteryUpdate(0);

  endRideBtn.textContent = "Paga Ora";
  endRideBtn.style.background = "#dc2626";

  showBatteryZeroModal();
}

function showBatteryZeroModal() {
  const modal = document.createElement("div");
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 30px;
    ">
      <div style="
        background: white;
        padding: 20px;
        border-radius: 20px;
        text-align: center;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(220, 38, 38, 0.3);
        animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-height: 80vh;
        overflow-y: auto;
      ">
        <div style="font-size: 50px; margin-bottom: 15px; animation: shake 0.5s ease-in-out;">🔋</div>
        <div style="font-size: 22px; font-weight: bold; color: #dc2626; margin-bottom: 8px;">
          Batteria Esaurita!
        </div>
        <div style="color: #666; margin-bottom: 15px; font-size: 15px;">
          Il mezzo si è fermato.
        </div>
        <div style="color: #999; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
          Seleziona il parcheggio di arrivo e procedi al pagamento per completare la corsa.
        </div>
        <button id="closeModal" style="
          padding: 12px 30px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s ease;
          width: 100%;
        ">OK</button>
      </div>
    </div>
    <style>
      @keyframes pop {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-5deg); }
        75% { transform: rotate(5deg); }
      }
      #closeModal:hover {
        background: #b91c1c !important;
      }
      
      /* ✅ MOBILE */
      @media (max-width: 640px) {
        #closeModal {
          padding: 14px 24px !important;
          font-size: 14px !important;
        }
      }
    </style>
  `;
  document.body.appendChild(modal);

  // ✅ NUOVO: Quando clicchi OK, chiama getActiveRide e blocca tutto
  document.getElementById("closeModal").addEventListener("click", async () => {
    try {
      // 📡 Chiama il backend per i dati veri
      const response = await fetch("/rides/active");
      const data = await response.json();

      // ✅ Prendi i dati VERI dal backend
      const durata_minuti = data.durata_corrente_minuti;
      const km_percorsi = parseFloat(data.km_percorsi);
      const costo_stimato = data.costo_stimato;

      // ✅ Aggiorna l'UI con i DATI VERI (non a 0)
      timerDisplay.textContent = formatMinutiInTimer(durata_minuti);
      distanceValue.textContent = km_percorsi.toFixed(2);
      costValue.textContent = `€${parseFloat(costo_stimato).toFixed(2)}`;

      // ✅ Velocità e batteria rimangono a 0
      speedValue.textContent = "0";
      batteryValue.textContent = "0%";
      document.getElementById("summaryBatteria").textContent = "0%";

      // ✅ BLOCCA il timer (niente aggiornamenti)
      rideState.batteryZero = true;
      if (rideState.timerInterval) {
        clearInterval(rideState.timerInterval);
      }

      // 🔒 Impedisci qualsiasi ulteriore aggiornamento
      endRideBtn.textContent = "Paga Ora";
      endRideBtn.style.background = "#dc2626";

      console.log("✅ Corsa bloccata con dati veri dal backend");
    } catch (error) {
      console.error("❌ Errore caricamento dati:", error);
    }

    // Chiudi modal
    modal.remove();
    parkingSelect.focus();
  });
}

// ✅ NUOVO: Carica punti fedeltà dell'utente
function loadUserPunti() {
  fetch("/users/me")
    .then((res) => res.json())
    .then((data) => {
      if (data.punti !== undefined) {
        rideState.punti_fedeltà = data.punti;
        puntiDisponibili.textContent = data.punti;

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

  // ✅ NUOVO: Usa Singleton MQTT (connessione persistente)
  MQTTManager.init();

  // ✅ NUOVO: Ascolta messaggi MQTT da questa pagina
  setupMQTTListener();

  setTimeout(() => {
    startTimer();
    simulateRideData();
  }, 500);
});

// ===== CLEANUP quando chiudi la pagina =====
window.addEventListener("beforeunload", () => {
  // ❌ NON disconnettere MQTT! Lascia che persista
  // MQTTManager.disconnect();
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

        const durataRealeMin = durataRealeS / 60;
        const kmPercorsi = calcolaKmPercorsiDaMinuti(
          durataRealeMin,
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
    batteryValue.style.color = "#999";
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
  const parkingDisponibili = rideState.parkings.filter(
    (p) => p.posti_liberi > 0
  );

  const options = parkingDisponibili
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

  const minutes = Math.ceil(rideState.elapsedSeconds / 60);
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
  // ✅ Controlla batteria SOLO se il mezzo la ha
  const tipoMezzo = rideState.vehicleData?.tipo_mezzo;
  if (haBatteria(tipoMezzo) && rideState.vehicleData.stato_batteria <= 0) {
    handleBatteryZero();
    return;
  }

  setInterval(() => {
    // ⚠️ NUOVO: Salta tutto se batteria è a 0
    if (rideState.batteryZero) {
      return;
    }

    if (!rideState.isPaused && rideState.vehicleData) {
      // ✅ Calcola km CORRETTAMENTE
      const minuti = rideState.elapsedSeconds / 60;
      const kmPercorsi = calcolaKmPercorsiDaMinuti(
        minuti,
        rideState.vehicleData.tipo_mezzo
      );
      distanceValue.textContent = kmPercorsi.toFixed(1);

      // Simula velocità
      const speed = Math.floor(Math.random() * 10) + 15;
      speedValue.textContent = speed;

      // ✅ Decrementa batteria SOLO se MQTT non è disponibile E il mezzo ha batteria
      if (haBatteria(tipoMezzo) && !MQTTManager.isConnected()) {
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
      // ✅ Calcola il costo ATTUALE
      const minutes = Math.floor(rideState.elapsedSeconds / 60);
      let costoCorsa = 0;
      const tariffaOraria = getTariffaOraria(rideState.vehicleData.tipo_mezzo);

      if (minutes <= 30) {
        costoCorsa = 1.0;
      } else {
        costoCorsa = 1.0 + (minutes - 30) * tariffaOraria;
      }

      // ✅ NUOVO: Calcola SOLO i punti necessari
      const puntiNecessari = Math.ceil(costoCorsa / 0.05); // Quanti punti servono
      const puntiUsabili = Math.min(puntiNecessari, rideState.punti_fedeltà); // Usa solo quelli necessari
      const sconto = puntiUsabili * 0.05;

      // ✅ AGGIORNA ENTRAMBI I VALORI
      document.getElementById("puntiUsati").textContent = puntiUsabili; // ← QUESTO MANCAVA!
      scontoCalcolato.textContent = `€${sconto.toFixed(2)}`;
      puntiInfo.classList.add("active");
    } else {
      // ✅ Quando deselezioni, torna a 0
      document.getElementById("puntiUsati").textContent = "0"; // ← RESET
      puntiInfo.classList.remove("active");
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

  // ✅ NUOVO: Calcola il costo ATTUALE (come fa il toggle)
  const minutes = Math.ceil(rideState.elapsedSeconds / 60);
  let costoCorsa = 0;
  const tariffaOraria = getTariffaOraria(rideState.vehicleData.tipo_mezzo);

  if (minutes <= 30) {
    costoCorsa = 1.0;
  } else {
    costoCorsa = 1.0 + (minutes - 30) * tariffaOraria;
  }

  // ✅ NUOVO: Se usa punti, calcola lo sconto
  let costoFinale = costoCorsa;
  if (rideState.usaPunti) {
    const puntiNecessari = Math.ceil(costoCorsa / 0.05);
    const puntiUsabili = Math.min(puntiNecessari, rideState.punti_fedeltà);
    const sconto = puntiUsabili * 0.05;
    costoFinale = costoCorsa - sconto;
  }

  fetch(`/rides/${rideState.rideId}/check-payment`)
    .then((res) => res.json())
    .then((checkData) => {
      // ✅ MODIFICA: Passa costoFinale invece di checkData.costo
      checkData.costo = costoFinale;

      if (checkData.saldo_sufficiente) {
        return endRideWithPayment(checkData.costo);
      } else {
        return endRideWithDebt(checkData, checkData.costo);
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

      // ✅ AGGIUNGI QUI - Prepara dati corsa per il feedback
      const rideDataForFeedback = {
        id_mezzo: rideState.vehicleData.id_mezzo,
        tipo_mezzo: rideState.vehicleData.tipo_mezzo,
        km_percorsi: parseFloat(distanceValue.textContent),
        durata_minuti: Math.floor(rideState.elapsedSeconds / 60),
        costo_finale: cost,
      };

      // Salva nei sessionStorage per recuperare nella home-utente
      sessionStorage.setItem(
        "pendingFeedback",
        JSON.stringify(rideDataForFeedback)
      );

      // ❌ NON disconnettere MQTT!
      setTimeout(() => {
        window.location.href = "/home-utente";
      }, 4000);
    })
    .catch((error) => {
      console.error("❌ Errore:", error);
      showError("❌ Errore", "Errore nella chiusura della corsa");
      endRideBtn.disabled = false;
      endRideBtn.textContent = "Termina Corsa";
    });
}

function endRideWithDebt(checkData, costoFinale) {
  const costoPrimaCorsa = 1.0; // Costo preventivo della prossima corsa
  const debitoTotale = costoFinale + costoPrimaCorsa;
  const importoMancante = Math.max(0, costoFinale - checkData.saldo_attuale);

  // ✅ Salva i dati nel state
  rideState.debtData = {
    costoCorsa: costoFinale,
    costoPrimaCorsa: costoPrimaCorsa,
    debitoTotale: debitoTotale,
    saldoAttuale: checkData.saldo_attuale,
    importoMancante: importoMancante,
  };

  showDebtModal(checkData, importoMancante, costoFinale);
  endRideBtn.disabled = false;
  endRideBtn.textContent = "Termina Corsa";
}

// ✅ NUOVO: Modal per saldo insufficiente (DEBITO)
function showDebtModal(checkData, importoMancante, costoFinale) {
  const modal = document.createElement("div");
  const costoPrimaCorsa = 1.0;
  const debitoTotale = costoFinale + costoPrimaCorsa;
  const importoRicaricaMinimo =
    Math.ceil((importoMancante + costoPrimaCorsa) * 100) / 100;

  // ✅ NUOVO: Genera opzioni intelligenti
  const opzioniBase = [5, 10, 20, 50, 100];
  const opzioniDisponibili = opzioniBase.filter(
    (importo) => importo >= importoRicaricaMinimo
  );

  // ✅ Se nessuna opzione base è sufficiente, aggiungi la minima arrotondata
  if (opzioniDisponibili.length === 0) {
    opzioniDisponibili.push(importoRicaricaMinimo);
  }

  // ✅ Crea HTML delle opzioni
  const opzioniHTML = opzioniDisponibili
    .map(
      (importo) => `<option value="${importo}">€${importo.toFixed(2)}</option>`
    )
    .join("");

  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 500px;
        width: 90%;
        height: 90%;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(220, 38, 38, 0.3);
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <!-- HEADER -->
        <div style="font-size: 50px; margin-bottom: 20px;">⚠️</div>
        <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px;">
          Saldo Insufficiente
        </div>

        <!-- DETTAGLI COSTI -->
        <div style="
          background: #f3f4f6;
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
          text-align: left;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Costo corsa:</span>
            <span style="font-weight: bold; color: #dc2626;">−${formatCurrency(
              costoFinale
            )}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
            <span style="color: #666;">Saldo attuale:</span>
            <span style="font-weight: bold; color: #0891b2;">${formatCurrency(
              checkData.saldo_attuale
            )}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666; font-weight: bold;">Importo mancante:</span>
            <span style="font-weight: bold; color: #dc2626;">${formatCurrency(
              importoMancante
            )}</span>
          </div>
        </div>

        <!-- OPZIONI -->
        <div style="margin: 25px 0;">
          <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
            Scegli un'opzione per continuare:
          </p>
        </div>

        <!-- FORM RICARICA -->
        <div style="margin: 20px 0; text-align: left;">
          <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #333;">
            💳 Ricarica Credito:
          </label>
          <select id="debtRechargeAmount" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-bottom: 10px;
          ">
            <option value="">Seleziona importo...</option>
            ${opzioniHTML}
            <option value="custom" id="customOption">Personalizzato</option>
          </select>
          <input 
            type="number" 
            id="debtCustomAmount" 
            placeholder="Importo (es: 15.50)" 
            style="
              width: 100%;
              padding: 12px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              font-size: 16px;
              display: none;
              margin-bottom: 10px;
            "
            min="${importoRicaricaMinimo.toFixed(2)}"
            step="0.01"
          />
          <button id="debtRechargeBtn" style="
            width: 100%;
            padding: 12px;
            background: #059669;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s ease;
          ">
            💳 Ricarica e Paga
          </button>
        </div>

        <!-- DIVIDER -->
        <div style="display: flex; align-items: center; margin: 25px 0;">
          <div style="flex: 1; height: 1px; background: #e5e7eb;"></div>
          <span style="padding: 0 10px; color: #999; font-size: 14px;">OPPURE</span>
          <div style="flex: 1; height: 1px; background: #e5e7eb;"></div>
        </div>

        <!-- IGNORA BUTTON -->
        <button id="debtIgnoreBtn" style="
          width: 100%;
          padding: 12px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s ease;
          margin-top: 10px;
        ">
          Ignora e Continua (Account Sospeso)
        </button>

        <!-- WARNING -->
        <div style="
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          border-radius: 6px;
          margin-top: 20px;
          text-align: left;
        ">
          <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: bold;">
            ⚠️ Se continui senza ricaricare il tuo account sarà sospeso.
          </p>
          <p style="margin: 5px 0 0 0; color: #92400e; font-size: 13px;">
            Potrai riaprirlo ricariando almeno ${formatCurrency(
              importoRicaricaMinimo
            )}.
          </p>
        </div>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #debtRechargeBtn:hover {
        background: #047857 !important;
      }
      #debtIgnoreBtn:hover {
        background: #4b5563 !important;
      }
    </style>
  `;
  document.body.appendChild(modal);

  // ✅ Gestione select importo custom
  const selectAmount = document.getElementById("debtRechargeAmount");
  const customInput = document.getElementById("debtCustomAmount");

  selectAmount.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
    }
  });

  // ✅ Button: Ricarica e Paga
  document.getElementById("debtRechargeBtn").addEventListener("click", () => {
    const oldErrors = document.querySelectorAll("[data-error-box]");
    oldErrors.forEach((err) => err.remove());

    const selectedValue = selectAmount.value;
    let importoRicarica = 0;

    if (selectedValue === "custom") {
      importoRicarica = parseFloat(customInput.value) || 0;
      if (importoRicarica < importoRicaricaMinimo) {
        const errorBox = document.createElement("div");
        errorBox.setAttribute("data-error-box", "true");
        errorBox.style.cssText = `
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-weight: 500;
          text-align: center;
        `;
        errorBox.textContent = `❌ Importo minimo: €${importoRicaricaMinimo.toFixed(
          2
        )}`;

        document
          .getElementById("debtRechargeBtn")
          .parentElement.insertBefore(
            errorBox,
            document.getElementById("debtRechargeBtn")
          );

        setTimeout(() => errorBox.remove(), 5000);
        return;
      }
    } else {
      importoRicarica = parseFloat(selectedValue) || 0;
      if (importoRicarica === 0) {
        // ✅ NUOVO: Mostra errore direttamente nella modal
        const errorBox = document.createElement("div");
        errorBox.setAttribute("data-error-box", "true");
        errorBox.style.cssText = `
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-weight: 500;
          text-align: center;
        `;
        errorBox.textContent = "❌ Seleziona un importo";

        document
          .getElementById("debtRechargeBtn")
          .parentElement.insertBefore(
            errorBox,
            document.getElementById("debtRechargeBtn")
          );

        // Rimuovi dopo 3 secondi
        setTimeout(() => errorBox.remove(), 5000);
        return;
      }
    }

    rideState.importoRicaricaTemp = importoRicarica;

    // ✅ Chiudi modal
    modal.remove();

    // ✅ Chiama endRideWithPaymentAfterRecharge
    endRideWithPaymentAfterRecharge(importoRicarica);
  });

  // ✅ Button: Ignora (crea debito)
  document.getElementById("debtIgnoreBtn").addEventListener("click", () => {
    modal.remove();

    // ✅ Invia richiesta al backend per creare il debito
    const payload = {
      id_parcheggio_fine: parseInt(rideState.selectedParkingEnd),
    };

    fetch(`/rides/${rideState.rideId}/end-with-debt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        showSnackbar("⚠️ Account sospeso per debito", "warning");
        clearInterval(rideState.timerInterval);

        // ✅ AGGIUNGI QUI - Prepara dati corsa per il feedback
        const rideDataForFeedback = {
          id_mezzo: rideState.vehicleData.id_mezzo,
          tipo_mezzo: rideState.vehicleData.tipo_mezzo,
          km_percorsi: parseFloat(distanceValue.textContent),
          durata_minuti: Math.floor(rideState.elapsedSeconds / 60),
          costo_finale: checkData.costo, // ← CORRETTO!
        };

        // Salva nei sessionStorage per recuperare nella home-utente
        sessionStorage.setItem(
          "pendingFeedback",
          JSON.stringify(rideDataForFeedback)
        );

        setTimeout(() => {
          window.location.href = "/home-utente";
        }, 2000);
      })
      .catch((error) => {
        console.error("❌ Errore:", error);
        showError("❌ Errore", "Errore nella chiusura della corsa");
      });
  });
}

// ✅ NUOVO: Ricarica + Pagamento
function endRideWithPaymentAfterRecharge(importoRicarica) {
  endRideBtn.disabled = true;
  endRideBtn.textContent = "Elaborazione...";

  const payload = {
    id_parcheggio_fine: parseInt(rideState.selectedParkingEnd),
    importo_ricarica: importoRicarica,
    usa_punti: rideState.usaPunti,
  };

  fetch(`/rides/${rideState.rideId}/end-with-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => {
      showSnackbar("✅ Corsa terminata! Pagamento confermato.", "success");
      clearInterval(rideState.timerInterval);

      const minutes = Math.floor(rideState.elapsedSeconds / 60);
      let costoCorsa = 0;
      const tariffaOraria = getTariffaOraria(rideState.vehicleData.tipo_mezzo);

      if (minutes <= 30) {
        costoCorsa = 1.0;
      } else {
        costoCorsa = 1.0 + (minutes - 30) * tariffaOraria;
      }

      // Se usa punti, calcola lo sconto
      let costoFinale = costoCorsa;
      if (rideState.usaPunti) {
        const puntiNecessari = Math.ceil(costoCorsa / 0.05);
        const puntiUsabili = Math.min(puntiNecessari, rideState.punti_fedeltà);
        const sconto = puntiUsabili * 0.05;
        costoFinale = costoCorsa - sconto;
      }

      // ✅ CORRETTO: Usa costoFinale appena calcolato
      const rideDataForFeedback = {
        id_mezzo: rideState.vehicleData.id_mezzo,
        tipo_mezzo: rideState.vehicleData.tipo_mezzo,
        km_percorsi: parseFloat(distanceValue.textContent),
        durata_minuti: Math.floor(rideState.elapsedSeconds / 60),
        costo_finale: costoFinale, // ← CORRETTO!
      };

      // Salva nei sessionStorage per recuperare nella home-utente
      sessionStorage.setItem(
        "pendingFeedback",
        JSON.stringify(rideDataForFeedback)
      );

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

// ===== SNACKBAR QUEUE SYSTEM =====
let snackbarQueue = [];
let snackbarActive = false;

function showSnackbar(message, type = "success", duration = 3500) {
  snackbarQueue.push({ message, type, duration });
  processSnackbarQueue();
}

function processSnackbarQueue() {
  if (snackbarActive || snackbarQueue.length === 0) return;

  snackbarActive = true;
  const { message, type, duration } = snackbarQueue.shift();

  snackbar.textContent = message;
  snackbar.className = `snackbar show snackbar--${type}`;

  setTimeout(() => {
    snackbar.classList.remove("show");
    snackbarActive = false;
    processSnackbarQueue(); // Mostra la prossima
  }, duration);
}

// ✅ Helper function: Converti minuti in formato HH:MM:SS
function formatMinutiInTimer(minuti) {
  const totalSeconds = Math.round(minuti * 60);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0"
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
