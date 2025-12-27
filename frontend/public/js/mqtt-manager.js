// ==========================================
// MQTT MANAGER - SINGLETON GLOBALE
// ==========================================

const MQTTManager = (() => {
  let instance = null;
  let isConnecting = false;

  return {
    // Inizializza il singleton
    init() {
      if (instance) {
        console.log("✅ MQTT già connesso, riutilizzo istanza");
        return instance;
      }

      if (isConnecting) {
        console.log("⏳ MQTT in corso di connessione, aspetto...");
        return null;
      }

      isConnecting = true;

      if (typeof Paho === "undefined") {
        console.warn("⚠️ Libreria MQTT non caricata");
        isConnecting = false;
        return null;
      }

      const brokerUrl = "ws://localhost:9001";
      const clientId = `mobishare-${Date.now()}`;

      try {
        const broker = brokerUrl.replace("ws://", "").split(":")[0];
        const port = parseInt(brokerUrl.split(":")[1]) || 9001;

        instance = new Paho.MQTT.Client(broker, port, clientId);

        // ✅ Handlers globali
        instance.onConnectionLost = (responseObject) => {
          if (responseObject.errorCode !== 0) {
            console.warn("⚠️ MQTT Disconnesso:", responseObject.errorMessage);
          }
        };

        instance.onMessageArrived = (message) => {
          // Dispara evento personalizzato che tutte le pagine possono ascoltare
          document.dispatchEvent(
            new CustomEvent("mqtt-message", {
              detail: {
                topic: message.destinationName,
                payload: message.payloadString,
              },
            })
          );
        };

        // Connetti
        instance.connect({
          onSuccess: () => {
            console.log("✅ MQTT Connesso!");
            // Sottoscrivi automaticamente ai topic delle batterie
            instance.subscribe("Vehicles/+/battery");
            console.log("📡 Iscritto a: Vehicles/+/battery");

            // Sottoscrivi automaticamente ai topic degli alert di batteria
            instance.subscribe("Alerts/+/battery");
            console.log("📡 Iscritto a: Alerts/+/battery");

            // Sottoscrivi automaticamente ai topic di sblocco dei mezzi
            instance.subscribe("Parking/+/StatoMezzi/+");
            console.log("📡 Iscritto a: Parking/+/StatoMezzi/+");
            isConnecting = false;
          },
          onFailure: (responseObject) => {
            console.warn(
              "⚠️ MQTT Connection Failed:",
              responseObject.errorMessage
            );
            console.info(
              "💡 Fallback: Continuerò con polling locale della batteria"
            );
            isConnecting = false;
            instance = null; // Reset per retry
          },
          useSSL: false,
          keepAliveInterval: 60,
          // ❌ RIMOSSO: reconnect: true (non supportato!)
          timeout: 3, // ✅ AGGIUNTO: Timeout di 3 secondi
          cleanSession: true, // ✅ AGGIUNTO: Sessione pulita
        });

        console.log("🔌 Tentando connessione MQTT...");
        return instance;
      } catch (error) {
        console.warn("⚠️ Errore MQTT init:", error.message);
        isConnecting = false;
        return null;
      }
    },

    // Ottieni istanza (senza riconnettersi)
    getInstance() {
      return instance;
    },

    // Verifica connessione
    isConnected() {
      return instance && instance.isConnected && instance.isConnected();
    },

    // Disconnect (usa solo quando esci davvero dall'app)
    disconnect() {
      if (instance && instance.isConnected()) {
        instance.disconnect();
        console.log("🔌 MQTT Disconnesso");
      }
      instance = null;
      isConnecting = false;
    },

    // Reset (opzionale)
    reset() {
      instance = null;
      isConnecting = false;
    },
  };
})();
