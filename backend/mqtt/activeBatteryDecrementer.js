import mqtt from "mqtt";
import Ride from "../models/Ride.js";
import Vehicle from "../models/Vehicle.js";

// Helper: tariffa base in base al tipo mezzo
const getTariffaBaseByMezzo = (tipo_mezzo) => {
  switch (tipo_mezzo) {
    case "bicicletta_muscolare":
      return 0.15;
    case "bicicletta_elettrica":
      return 0.25;
    case "monopattino":
      return 0.2;
    default:
      return 0.25;
  }
};

// Helper: velocità media in base al tipo mezzo
const getVelocitaMediaByMezzo = (tipo_mezzo) => {
  switch (tipo_mezzo) {
    case "bicicletta_muscolare":
      return 15;
    case "bicicletta_elettrica":
      return 25;
    case "monopattino":
      return 20;
    default:
      return 15;
  }
};

// Decrementa batteria di 1% ogni minuto per mezzi in uso e gestisce avvisi (comandi MQTT)
export const initActiveBatteryDecrementer = () => {
  const client = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
  );

  client.on("connect", () => {
    console.log("✅ Active Battery Decrementer connesso!");

    // Ogni 60 secondi, decrementa la batteria di tutti i mezzi in uso
    setInterval(async () => {
      try {
        const activeRides = await Ride.findAll({
          where: {
            stato_corsa: ["in_corso", "sospesa_batteria_esaurita"],
          },
          include: [{ model: Vehicle, as: "vehicle" }],
        });

        for (const ride of activeRides) {
          const vehicle = ride.vehicle;

          // Salta biciclette muscolari (non hanno batteria)
          if (vehicle.stato_batteria === null) {
            continue;
          }

          // Salta corse già sospese
          if (ride.stato_corsa === "sospesa_batteria_esaurita") {
            continue;
          }

          const newBattery = Math.max(0, vehicle.stato_batteria - 1);
          vehicle.stato_batteria = newBattery;
          await vehicle.save();

          // Pubblica aggiornamento via MQTT
          const message = JSON.stringify({
            id_mezzo: vehicle.id_mezzo,
            level: newBattery,
            timestamp: new Date().toISOString(),
          });

          client.publish(`Vehicles/${vehicle.id_mezzo}/battery`, message);
          console.log(
            `⚡ Mezzo ${vehicle.id_mezzo} (corsa ${ride.id_corsa}): ${newBattery}%`
          );

          // Avviso batteria bassa (20-10%)
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

          // Avviso batteria critica (< 10%)
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

          // Batteria esaurita = ferma la corsa
          if (newBattery === 0) {
            const durataMinutiCalcolata = Math.ceil(
              (new Date() - ride.data_ora_inizio) / (1000 * 60)
            );

            const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);
            let costoCalcolato;
            if (durataMinutiCalcolata <= 30) {
              costoCalcolato = 1.0;
            } else {
              costoCalcolato = 1.0 + (durataMinutiCalcolata - 30) * tariffa;
            }

            const kmCalcolati =
              (durataMinutiCalcolata / 60) *
              getVelocitaMediaByMezzo(ride.vehicle.tipo_mezzo);

            ride.durata_minuti = durataMinutiCalcolata;
            ride.costo = costoCalcolato;
            ride.km_percorsi = kmCalcolati;
            ride.stato_corsa = "sospesa_batteria_esaurita";
            await ride.save();

            const batteryDeadMessage = JSON.stringify({
              id_mezzo: vehicle.id_mezzo,
              id_corsa: ride.id_corsa,
              id_utente: ride.id_utente,
              tipo: "batteria_esaurita",
              messaggio:
                "🛑 Batteria esaurita! La corsa è stata fermata. Procedi al pagamento.",
              timestamp: new Date().toISOString(),
            });
            client.publish(
              `Alerts/${ride.id_utente}/battery`,
              batteryDeadMessage
            );

            console.error(
              `🛑 BATTERIA ESAURITA - Utente ${ride.id_utente}, Mezzo ${vehicle.id_mezzo}. Corsa fermata.`
            );
          }
        }
      } catch (error) {
        console.error("❌ Errore decremento batteria:", error.message);
      }
    }, 60000);
  });

  client.on("error", (err) => {
    console.error("❌ Active Battery Decrementer error:", err.message);
  });
};

export default initActiveBatteryDecrementer;
