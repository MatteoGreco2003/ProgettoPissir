// backend/mqtt/activeBatteryDecrementer.js
// Decrementa la batteria di TUTTI i mezzi che hanno corse attive

import mqtt from "mqtt";
import Ride from "../models/Ride.js";
import Vehicle from "../models/Vehicle.js";

export const initActiveBatteryDecrementer = () => {
  const client = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
  );

  client.on("connect", () => {
    console.log("✅ Active Battery Decrementer connesso!");

    // Ogni 60 secondi, decrementa la batteria di tutti i mezzi in uso
    setInterval(async () => {
      try {
        // Trova tutte le corse attive
        const activeRides = await Ride.findAll({
          where: { stato_corsa: "in_corso" },
          include: [{ model: Vehicle, as: "vehicle" }],
        });

        // Per ogni corsa attiva, decrementa la batteria del mezzo
        for (const ride of activeRides) {
          const vehicle = ride.vehicle;

          // ⚠️ SKIP se è bicicletta muscolare (batteria = null)
          if (vehicle.stato_batteria === null) {
            continue;
          }

          // Decrementa 1% ogni minuto
          const newBattery = Math.max(0, vehicle.stato_batteria - 1);

          // Aggiorna nel DB
          vehicle.stato_batteria = newBattery;
          await vehicle.save();

          // Pubblica via MQTT
          const message = JSON.stringify({
            id_mezzo: vehicle.id_mezzo,
            level: newBattery,
            timestamp: new Date().toISOString(),
          });

          client.publish(`Vehicles/${vehicle.id_mezzo}/battery`, message);
          console.log(
            `⚡ Mezzo ${vehicle.id_mezzo} (corsa ${ride.id_corsa}): ${newBattery}%`
          );

          // ⚠️ AVVISI BATTERIA
          if (newBattery < 20 && newBattery >= 10) {
            const warningMessage = JSON.stringify({
              id_mezzo: vehicle.id_mezzo,
              id_corsa: ride.id_corsa,
              id_utente: ride.id_utente,
              tipo: "batteria_bassa",
              batteria: newBattery,
              messaggio: "Batteria bassa! Raggiungi il parcheggio più vicino",
              timestamp: new Date().toISOString(),
            });
            client.publish(`Alerts/${ride.id_utente}/battery`, warningMessage);
            console.warn(
              `⚠️ ALERT BATTERIA BASSA - Utente ${ride.id_utente}, Mezzo ${vehicle.id_mezzo}: ${newBattery}%`
            );
          }

          if (newBattery < 10) {
            const criticalMessage = JSON.stringify({
              id_mezzo: vehicle.id_mezzo,
              id_corsa: ride.id_corsa,
              id_utente: ride.id_utente,
              tipo: "batteria_critica",
              batteria: newBattery,
              messaggio: "🔴 BATTERIA CRITICA! Termina immediatamente la corsa",
              timestamp: new Date().toISOString(),
            });
            client.publish(`Alerts/${ride.id_utente}/battery`, criticalMessage);
            console.error(
              `🔴 ALERT CRITICO - Utente ${ride.id_utente}, Mezzo ${vehicle.id_mezzo}: ${newBattery}%`
            );
          }
        }
      } catch (error) {
        console.error("❌ Errore decremento batteria:", error.message);
      }
    }, 60000); // Ogni 60 secondi
  });

  client.on("error", (err) => {
    console.error("❌ Active Battery Decrementer error:", err.message);
  });
};

export default initActiveBatteryDecrementer;
