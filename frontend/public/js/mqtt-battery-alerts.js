// ==========================================
// RIDE MQTT BATTERY ALERTS - VERSIONE MIGLIORATA
// ==========================================

/**
 * BATTERY ALERT HANDLER
 * Gestisce gli alert di batteria che arrivano da MQTT
 */
function handleBatteryAlert(alert) {
  const { tipo, batteria, messaggio, id_mezzo } = alert;

  console.log(`🔋 Battery Alert: ${tipo} - ${batteria}%`);

  // ⚠️ SKIP se non è per il mezzo attuale della corsa
  if (id_mezzo !== rideState.vehicleData?.id_mezzo) {
    console.log(`⏭️ Alert per mezzo diverso: ${id_mezzo}`);
    return;
  }

  // ⚠️ SKIP se non è un mezzo con batteria
  if (!haBatteria(rideState.vehicleData?.tipo_mezzo)) {
    console.log(`⏭️ Mezzo senza batteria`);
    return;
  }

  // ✅ Aggiorna la batteria nel display
  rideState.vehicleData.stato_batteria = batteria;
  batteryValue.textContent = batteria + "%";
  document.getElementById("summaryBatteria").textContent = batteria + "%";

  // ✅ Cambia colore della batteria (verde → arancio → rosso)
  animateBatteryUpdate(batteria);

  // ⚠️ NUOVO: Non mostrare snackbar a 0% (arriva diritto alla modal)
  if (batteria <= 0) {
    handleBatteryZero();
    return;
  }

  // ✅ Mostra snackbar SOLO fino all'1%
  switch (tipo) {
    case "batteria_bassa":
      // 20-1%: Snackbar ARANCIONE
      if (batteria > 0) {
        showBatteryWarningSnackbar(batteria, messaggio);
      }
      break;

    case "batteria_critica":
      // 10-1%: Snackbar ROSSA con animazione
      if (batteria > 0) {
        showBatteryCriticalSnackbar(batteria, messaggio);
      }
      break;

    case "batteria_esaurita":
      // 0%: Modal rossa (usa la tua funzione existing)
      handleBatteryZero();
      break;

    default:
      console.warn("⚠️ Tipo alert sconosciuto:", tipo);
  }
}

// ===== SNACKBAR BATTERIA BASSA - ARANCIONE (20-10%) =====
function showBatteryWarningSnackbar(batteryLevel, message) {
  const snackbarEl = document.getElementById("snackbar");
  if (!snackbarEl) {
    console.warn("⚠️ Snackbar element non trovato");
    return;
  }

  // ✅ Evita di mostrare 100 volte la stessa snackbar
  if (
    snackbarEl.classList.contains("show") &&
    snackbarEl.dataset.batteryLevel === "warning"
  ) {
    return;
  }

  snackbarEl.dataset.batteryLevel = "warning";

  // 🟠 HTML della snackbar arancione SENZA LA X
  snackbarEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px; width: 100%;">
      <!-- ICON CON SFONDO -->
      <div style="
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      ">
        🔋
      </div>

      <!-- CONTENUTO -->
      <div style="flex: 1;">
        <div style="
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 3px;
          letter-spacing: 0.3px;
        ">⚠️ Batteria Bassa</div>
        <div style="
          font-size: 13px;
          opacity: 0.95;
          margin-bottom: 6px;
          line-height: 1.4;
          font-weight: 500;
        ">${message}</div>
        <div style="
          font-size: 12px;
          opacity: 0.85;
          background: rgba(255, 255, 255, 0.15);
          padding: 4px 10px;
          border-radius: 4px;
          display: inline-block;
        ">📊 Batteria: <strong>${batteryLevel}%</strong></div>
      </div>
    </div>
  `;

  // 🟠 Styling moderno arancione con gradient
  snackbarEl.className = "snackbar show snackbar--warning";
  snackbarEl.style.cssText = `
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
    border: none;
    border-left: 5px solid #dc2601;
    color: white;
    box-shadow: 0 8px 24px rgba(249, 115, 22, 0.35);
    border-radius: 12px;
    padding: 16px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Rimani visibile 6 secondi
  setTimeout(() => {
    snackbarEl.classList.remove("show");
    snackbarEl.dataset.batteryLevel = "";
  }, 8000);
}

// ===== SNACKBAR BATTERIA CRITICA - ROSSO (10-0%) =====
function showBatteryCriticalSnackbar(batteryLevel, message) {
  const snackbarEl = document.getElementById("snackbar");
  if (!snackbarEl) {
    console.warn("⚠️ Snackbar element non trovato");
    return;
  }

  // ✅ Evita duplicati
  if (
    snackbarEl.classList.contains("show") &&
    snackbarEl.dataset.batteryLevel === "critical"
  ) {
    return;
  }

  snackbarEl.dataset.batteryLevel = "critical";

  // 🔴 HTML della snackbar rossa MIGLIORATA - SENZA X e icona batteria piccola
  snackbarEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px; width: 100%;">
      <!-- ICON BATTERIA CON SFONDO PICCOLO (come warning) -->
      <div style="
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        animation: batteryPulse 1s ease-in-out infinite;
      ">
        🔋
      </div>

      <!-- CONTENUTO -->
      <div style="flex: 1;">
        <div style="
          font-weight: 800;
          font-size: 16px;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        ">⚡ BATTERIA CRITICA</div>
        <div style="
          font-size: 13px;
          opacity: 0.95;
          margin-bottom: 6px;
          line-height: 1.4;
          font-weight: 600;
        ">${message}</div>
        <div style="
          font-size: 12px;
          opacity: 0.85;
          background: rgba(255, 255, 255, 0.15);
          padding: 4px 10px;
          border-radius: 4px;
          display: inline-block;
        ">📊 Batteria: <strong style="color: #fecaca;">${batteryLevel}%</strong></div>
      </div>
    </div>
  `;

  // 🔴 Styling moderno rosso con gradient e shadow drammatico
  snackbarEl.className = "snackbar show snackbar--error";
  snackbarEl.style.cssText = `
    background: linear-gradient(135deg, #ff5459 0%, #dc2626 100%) !important;
    border: none;
    border-left: 5px solid #7f1d1d;
    color: white;
    box-shadow: 0 12px 32px rgba(255, 84, 89, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 16px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Rimani visibile 8 secondi
  setTimeout(() => {
    snackbarEl.classList.remove("show");
    snackbarEl.dataset.batteryLevel = "";
  }, 8000);
}

// ===== ANIMAZIONI CSS =====
(function injectBatteryStyles() {
  // Controlla se lo stile è già stato aggiunto
  if (document.getElementById("battery-alert-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "battery-alert-styles";
  style.textContent = `
    /* Animazione pulse per icon critico */
    @keyframes batteryPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(0.95);
        opacity: 0.7;
      }
    }

    /* Animazione slide-in da sinistra */
    @keyframes slideInFromLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Animazione slide-in da top */
    @keyframes slideInFromTop {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Animazione slide-out */
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    /* Applica animazione alla snackbar */
    .snackbar.show {
      animation: slideInFromLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    .snackbar.show.snackbar--error {
      animation: slideInFromTop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    /* Smooth transition per hide */
    .snackbar {
      transition: all 0.3s ease-out;
    }
  `;

  document.head.appendChild(style);
})();
