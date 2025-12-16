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

    // Ogni 10 secondi, decrementa la batteria di tutti i mezzi in uso
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

          // Decrementa 1% ogni 10 secondi (6% al minuto)
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
            `⚡ Mezzo ${vehicle.id_mezzo} (corsa ${
              ride.id_corsa
            }): ${newBattery.toFixed(2)}%`
          );
        }
      } catch (error) {
        console.error("❌ Errore decremento batteria:", error.message);
      }
    }, 60000); // Ogni 10 secondi
  });

  client.on("error", (err) => {
    console.error("❌ Active Battery Decrementer error:", err.message);
  });
};

export default initActiveBatteryDecrementer;
