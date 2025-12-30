import mqtt from "mqtt";
import Vehicle from "../models/Vehicle.js";

// Listener MQTT per ricevere aggiornamenti di batteria dai dispositivi IoT
export const initBatteryListener = () => {
  const client = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
  );

  client.on("connect", () => {
    console.log("✅ MQTT Battery Listener connesso!");
    // Sottoscrivi a tutti i topic delle batterie
    client.subscribe("Vehicles/+/battery", (err) => {
      if (err) console.error("Errore subscribe:", err);
      else console.log("📡 Ascoltando topic: Vehicles/+/battery");
    });
  });

  client.on("message", async (topic, message) => {
    try {
      // Estrai id_mezzo dal topic: Vehicles/{id_mezzo}/battery
      const idMezzo = topic.split("/")[1];
      const batteryData = JSON.parse(message.toString());

      // Aggiorna la batteria nel DB
      const vehicle = await Vehicle.findByPk(idMezzo);
      if (vehicle) {
        vehicle.stato_batteria = Math.max(0, batteryData.level);
        await vehicle.save();
        console.log(`⚡ Batteria mezzo ${idMezzo}: ${batteryData.level}%`);
      }
    } catch (error) {
      console.error("❌ Errore elaborazione batteria:", error.message);
    }
  });

  client.on("error", (err) => {
    console.error("❌ MQTT Battery Listener error:", err.message);
  });
};

export default initBatteryListener;
