import Ride from "../models/Ride.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Parking from "../models/Parking.js";
import Transaction from "../models/Transaction.js";
import PuntiFedelta from "../models/LoyaltyPoints.js";
import mqtt from "mqtt";
import { Op } from "sequelize";

// Helper: Tariffe per tipo di mezzo
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

// Helper: Velocità media per tipo di mezzo
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

// Helper: Calcola km percorsi
const calcolaKmPercorsi = (durataMinuti, tipo_mezzo) => {
  const velocitaMedia = getVelocitaMediaByMezzo(tipo_mezzo);
  return (durataMinuti / 60) * velocitaMedia;
};

// START RIDE - Inizio corsa con sblocco MQTT
export const startRide = async (req, res) => {
  try {
    const { id_mezzo } = req.body;
    const id_utente = req.user.id_utente;

    if (!id_mezzo) {
      return res.status(400).json({ error: "id_mezzo è obbligatorio" });
    }

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Controlla stato account
    if (
      user.stato_account === "sospeso" ||
      user.stato_account === "in_attesa_approvazione"
    ) {
      return res.status(403).json({
        error:
          "Account sospeso. Ricaricare credito e richiedere approvazione al gestore.",
        stato_account: user.stato_account,
        saldo: user.saldo,
      });
    }

    // Verifica saldo minimo
    const saldoNumero = parseFloat(user.saldo);
    if (saldoNumero < 1.0) {
      return res.status(402).json({
        error:
          "Saldo insufficiente. Devi avere almeno 1.00€ per iniziare una corsa",
        saldo_attuale: saldoNumero,
        saldo_minimo_richiesto: 1.0,
      });
    }

    // Controlla se ha già una corsa attiva
    const activeRide = await Ride.findOne({
      where: { id_utente, stato_corsa: "in_corso" },
    });

    if (activeRide) {
      return res.status(400).json({
        error: "Hai già una corsa attiva",
        active_ride_id: activeRide.id_corsa,
      });
    }

    // Verifica disponibilità mezzo
    const vehicle = await Vehicle.findByPk(id_mezzo, {
      include: [{ model: Parking, as: "parking" }],
    });

    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    if (vehicle.stato !== "disponibile") {
      return res.status(400).json({
        error: `Mezzo non disponibile. Stato: ${vehicle.stato}`,
      });
    }

    // Verifica batteria minima
    if (
      vehicle.stato_batteria < 20 &&
      vehicle.tipo_mezzo != "bicicletta_muscolare"
    ) {
      return res.status(400).json({
        error: "Mezzo non disponibile. Batteria insufficiente",
        batteria_attuale: vehicle.stato_batteria,
        batteria_minima_richiesta: 20,
      });
    }

    const ride = await Ride.create({
      id_utente,
      id_mezzo,
      id_parcheggio_inizio: vehicle.id_parcheggio,
      data_ora_inizio: new Date(),
      stato_corsa: "in_corso",
    });

    vehicle.stato = "in_uso";
    await vehicle.save();

    // Invia comando MQTT UNLOCK
    try {
      const mqttClient = mqtt.connect(
        process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
      );

      mqttClient.on("connect", () => {
        const topic = `Parking/${vehicle.id_parcheggio}/StatoMezzi/${id_mezzo}`;
        const message = JSON.stringify({
          id_mezzo,
          command: "unlock",
          timestamp: new Date().toISOString(),
          user_id: id_utente,
        });

        mqttClient.publish(topic, message, { qos: 1 }, () => {
          console.log(`✅ MQTT UNLOCK pubblicato: ${topic}`);
          mqttClient.end();
        });
      });

      mqttClient.on("error", (err) => {
        console.warn("⚠️ MQTT connection error:", err.message);
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT publish fallito:", mqttError.message);
    }

    res.status(200).json({
      message: "Corsa iniziata con successo",
      id_corsa: ride.id_corsa,
      id_mezzo,
      data_ora_inizio: ride.data_ora_inizio,
      parcheggio_inizio: vehicle.parking.nome,
      tariffa_minuto: vehicle.tariffa_minuto,
      saldo_attuale: user.saldo,
    });
  } catch (error) {
    console.error("❌ Errore START ride:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// CHECK PAYMENT - Verifica saldo sufficiente per pagare
export const checkPayment = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const id_utente = req.user.id_utente;

    if (!ride_id) {
      return res.status(400).json({ error: "ride_id è obbligatorio" });
    }

    const ride = await Ride.findByPk(ride_id, {
      include: [{ model: Vehicle, as: "vehicle" }],
    });

    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    const dataFine = new Date();
    const durataMinuti = Math.ceil(
      (dataFine - ride.data_ora_inizio) / (1000 * 60)
    );

    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

    let costo;
    if (durataMinuti <= 30) {
      costo = 1.0;
    } else {
      costo = 1.0 + (durataMinuti - 30) * tariffa;
    }

    const user = await User.findByPk(id_utente);
    const saldoNumero = parseFloat(user.saldo);

    res.status(200).json({
      success: true,
      costo: parseFloat(costo.toFixed(2)),
      saldo_attuale: parseFloat(saldoNumero.toFixed(2)),
      saldo_sufficiente: saldoNumero >= costo,
      importo_mancante:
        saldoNumero >= costo ? 0 : parseFloat((costo - saldoNumero).toFixed(2)),
      durata_minuti: durataMinuti,
    });
  } catch (error) {
    console.error("❌ Errore CHECK payment:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// END RIDE WITH PAYMENT - Fine corsa con pagamento immediato
export const endRideWithPayment = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const { id_parcheggio_fine, importo_ricarica } = req.body;
    const id_utente = req.user.id_utente;

    if (!ride_id || !id_parcheggio_fine) {
      return res.status(400).json({
        error: "ride_id e id_parcheggio_fine sono obbligatori",
      });
    }

    const ride = await Ride.findByPk(ride_id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        { model: Parking, as: "parkingInizio" },
      ],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    const parkingFine = await Parking.findByPk(id_parcheggio_fine);
    if (!parkingFine) {
      return res.status(404).json({
        error: "Parcheggio di destinazione non trovato",
      });
    }

    let durataMinuti;
    let costo;
    let kmPercorsi;
    const dataFine = new Date();

    // Se corsa sospesa, usa i valori congelati
    if (ride.stato_corsa === "sospesa_batteria_esaurita") {
      durataMinuti = ride.durata_minuti;
      costo = parseFloat(ride.costo);
      kmPercorsi = ride.km_percorsi;
    } else {
      // Calcola i valori live
      durataMinuti = Math.ceil((dataFine - ride.data_ora_inizio) / (1000 * 60));

      const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

      if (durataMinuti <= 30) {
        costo = 1.0;
      } else {
        costo = 1.0 + (durataMinuti - 30) * tariffa;
      }

      kmPercorsi = calcolaKmPercorsi(durataMinuti, ride.vehicle.tipo_mezzo);
    }

    const user = await User.findByPk(id_utente);
    let saldoDisponibile = parseFloat(user.saldo);
    let punti_utilizzati = 0;

    // Se ricarica, aggiorna saldo
    if (importo_ricarica && importo_ricarica > 0) {
      saldoDisponibile += importo_ricarica;

      await Transaction.create({
        id_utente,
        tipo_transazione: "ricarica",
        importo: importo_ricarica,
        descrizione: "Ricarica per pagamento corsa",
      });
    }

    // Se vuole usare punti come sconto
    const { usa_punti } = req.body;
    if (usa_punti && user.punti > 0) {
      const puntiNecessari = Math.ceil(costo / 0.05);
      punti_utilizzati = Math.min(puntiNecessari, user.punti);
      const sconto_punti = punti_utilizzati * 0.05;

      saldoDisponibile += sconto_punti;
      user.punti -= punti_utilizzati;
    }

    // Verifica se ha abbastanza per pagare
    if (saldoDisponibile < costo) {
      return res.status(402).json({
        error: "Saldo insufficiente anche dopo la ricarica",
        costo_corsa: parseFloat(costo.toFixed(2)),
        saldo_disponibile: parseFloat(saldoDisponibile.toFixed(2)),
        importo_mancante: parseFloat((costo - saldoDisponibile).toFixed(2)),
        messaggio: "Ricaricare una cifra superiore per coprire la corsa",
      });
    }

    // Completa la ride
    ride.id_parcheggio_fine = id_parcheggio_fine;
    ride.data_ora_fine = dataFine;
    ride.durata_minuti = durataMinuti;
    ride.costo = costo;
    ride.km_percorsi = kmPercorsi;
    ride.punti_fedeltà_usati = punti_utilizzati;
    ride.stato_corsa = "completata";
    await ride.save();

    // Aggiorna mezzo
    const vehicle = ride.vehicle;

    if (vehicle.stato_batteria !== null && vehicle.stato_batteria < 20) {
      vehicle.stato = "non_prelevabile";
    } else {
      vehicle.stato = "disponibile";
    }

    vehicle.id_parcheggio = id_parcheggio_fine;
    await vehicle.save();

    // Crea transaction pagamento
    await Transaction.create({
      id_utente,
      tipo_transazione: "pagamento_corsa",
      importo: costo,
      id_corsa: ride.id_corsa,
      descrizione: `Pagamento corsa: ${durataMinuti} minuti`,
    });

    // Guadagna punti se bicicletta muscolare
    if (
      ride.vehicle.tipo_mezzo === "bicicletta_muscolare" &&
      punti_utilizzati === 0
    ) {
      const punti_guadagnati = Math.floor(durataMinuti / 5);

      user.punti += punti_guadagnati;

      await PuntiFedelta.create({
        id_utente,
        id_corsa: ride.id_corsa,
        tipo_operazione: "guadagnati",
        punti_importo: punti_guadagnati,
        descrizione: `Punti guadagnati da corsa in bicicletta muscolare (${durataMinuti} min)`,
      });
    }

    // Traccia utilizzo punti
    if (punti_utilizzati > 0) {
      await PuntiFedelta.create({
        id_utente,
        id_corsa: ride.id_corsa,
        tipo_operazione: "utilizzati",
        punti_importo: punti_utilizzati,
        descrizione: `Punti utilizzati come sconto (€${(
          punti_utilizzati * 0.05
        ).toFixed(2)})`,
      });
    }

    // Invia comando MQTT LOCK
    try {
      const mqttClient = mqtt.connect(
        process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
      );

      mqttClient.on("connect", () => {
        const topic = `Parking/${vehicle.id_parcheggio}/StatoMezzi/${vehicle.id_mezzo}`;
        const message = JSON.stringify({
          id_mezzo: vehicle.id_mezzo,
          command: "lock",
          timestamp: new Date().toISOString(),
          user_id: id_utente,
        });

        mqttClient.publish(topic, message, { qos: 1 }, () => {
          console.log(`✅ MQTT LOCK pubblicato: ${topic}`);
          mqttClient.end();
        });
      });

      mqttClient.on("error", (err) => {
        console.warn("⚠️ MQTT error:", err.message);
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT publish fallito:", mqttError.message);
    }

    // Aggiorna saldo utente
    user.saldo = saldoDisponibile - costo;
    user.stato_account = "attivo";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Corsa completata e pagata con successo",
      id_corsa: ride.id_corsa,
      durata_minuti: durataMinuti,
      costo: parseFloat(costo.toFixed(2)),
      importo_ricaricato: importo_ricarica || 0,
      saldo_residuo: parseFloat(user.saldo.toFixed(2)),
      parcheggio_fine: parkingFine.nome,
      stato_account: "attivo",
      pagamento: {
        importo_pagato_saldo: parseFloat(
          (costo - punti_utilizzati * 0.05).toFixed(2)
        ),
        sconto_punti_applicato: parseFloat(
          (punti_utilizzati * 0.05).toFixed(2)
        ),
        punti_utilizzati: punti_utilizzati,
        punti_rimasti: user.punti,
      },
      ...(ride.vehicle.tipo_mezzo === "bicicletta_muscolare" && {
        punti_fedeltà: {
          punti_guadagnati:
            punti_utilizzati > 0 ? 0 : Math.floor(durataMinuti / 5),
          punti_utilizzati: punti_utilizzati,
          sconto_applicato:
            punti_utilizzati > 0
              ? parseFloat((punti_utilizzati * 0.05).toFixed(2))
              : 0,
          punti_totali_attuali: user.punti,
        },
      }),
    });
  } catch (error) {
    console.error("❌ Errore END ride with payment:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// END RIDE WITH DEBT - Fine corsa con debito e sospensione account
export const endRideWithDebt = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const { id_parcheggio_fine } = req.body;
    const id_utente = req.user.id_utente;

    if (!ride_id || !id_parcheggio_fine) {
      return res.status(400).json({
        error: "ride_id e id_parcheggio_fine sono obbligatori",
      });
    }

    const ride = await Ride.findByPk(ride_id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        { model: Parking, as: "parkingInizio" },
      ],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    const parkingFine = await Parking.findByPk(id_parcheggio_fine);
    if (!parkingFine) {
      return res.status(404).json({
        error: "Parcheggio di destinazione non trovato",
      });
    }

    const dataFine = new Date();
    const durataMinuti = Math.ceil(
      (dataFine - ride.data_ora_inizio) / (1000 * 60)
    );

    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

    let costo;
    if (durataMinuti <= 30) {
      costo = 1.0;
    } else {
      costo = 1.0 + (durataMinuti - 30) * tariffa;
    }

    const user = await User.findByPk(id_utente);

    // Calcola debito totale (corsa attuale + prima 30min della prossima)
    const costoPrimaCorsa = 1.0;
    const debitoTotale = costo + costoPrimaCorsa;

    user.saldo = user.saldo - debitoTotale;
    user.stato_account = "sospeso";
    user.data_riapertura = null;
    user.data_sospensione = new Date();
    user.numero_sospensioni = (user.numero_sospensioni || 0) + 1;
    await user.save();

    const kmPercorsi = calcolaKmPercorsi(durataMinuti, ride.vehicle.tipo_mezzo);

    ride.id_parcheggio_fine = id_parcheggio_fine;
    ride.data_ora_fine = dataFine;
    ride.durata_minuti = durataMinuti;
    ride.costo = costo;
    ride.km_percorsi = kmPercorsi;
    ride.stato_corsa = "completata";
    await ride.save();

    const vehicle = ride.vehicle;

    if (vehicle.stato_batteria !== null && vehicle.stato_batteria < 20) {
      vehicle.stato = "non_prelevabile";
    } else {
      vehicle.stato = "disponibile";
    }

    vehicle.id_parcheggio = id_parcheggio_fine;
    await vehicle.save();

    // Crea transactions
    await Transaction.create({
      id_utente,
      tipo_transazione: "pagamento_corsa",
      importo: costo,
      id_corsa: ride.id_corsa,
      descrizione: `Pagamento corsa: ${durataMinuti} minuti (non pagato - conto sospeso)`,
    });

    await Transaction.create({
      id_utente,
      tipo_transazione: "debito_prossima_corsa",
      importo: costoPrimaCorsa,
      id_corsa: ride.id_corsa,
      descrizione:
        "Debito preventivo: costo prima 30 minuti della prossima corsa",
    });

    // Invia comando MQTT LOCK
    try {
      const mqttClient = mqtt.connect(
        process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"
      );

      mqttClient.on("connect", () => {
        const topic = `Parking/${vehicle.id_parcheggio}/StatoMezzi/${vehicle.id_mezzo}`;
        const message = JSON.stringify({
          id_mezzo: vehicle.id_mezzo,
          command: "lock",
          timestamp: new Date().toISOString(),
          user_id: id_utente,
        });

        mqttClient.publish(topic, message, { qos: 1 }, () => {
          console.log(`✅ MQTT LOCK pubblicato: ${topic}`);
          mqttClient.end();
        });
      });

      mqttClient.on("error", (err) => {
        console.warn("⚠️ MQTT error:", err.message);
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT publish fallito:", mqttError.message);
    }

    res.status(202).json({
      success: false,
      message: "Corsa completata ma account sospeso per debito",
      id_corsa: ride.id_corsa,
      durata_minuti: durataMinuti,
      costo_corsa: parseFloat(costo.toFixed(2)),
      costo_prossima_corsa_preventivo: costoPrimaCorsa,
      debito_totale: parseFloat(debitoTotale.toFixed(2)),
      saldo_dopo: parseFloat(user.saldo.toFixed(2)),
      parcheggio_fine: parkingFine.nome,
      punti_totali: user.punti,
      account_status: {
        stato_account: "sospeso",
        data_sospensione: user.data_sospensione,
        debito: Math.abs(user.saldo),
        importo_minimo_ricarica: parseFloat(
          (Math.abs(user.saldo) + costoPrimaCorsa).toFixed(2)
        ),
        messaggio: `Account sospeso. Debito totale: ${debitoTotale.toFixed(
          2
        )}€. Per riaprire ricaricare almeno ${(
          Math.abs(user.saldo) + costoPrimaCorsa
        ).toFixed(2)}€`,
      },
    });
  } catch (error) {
    console.error("❌ Errore END ride with debt:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET ACTIVE RIDE - Corsa attiva in corso
export const getActiveRide = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const ride = await Ride.findOne({
      where: {
        id_utente,
        stato_corsa: ["in_corso", "sospesa_batteria_esaurita"],
      },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo", "tariffa_minuto"],
        },
        {
          model: Parking,
          as: "parkingInizio",
          attributes: ["id_parcheggio", "nome"],
        },
      ],
    });

    if (!ride) {
      return res.status(200).json({
        success: true,
        activeRide: null,
        message: "Nessuna corsa attiva",
      });
    }

    // Se sospesa, usa i valori congelati dal database
    if (ride.stato_corsa === "sospesa_batteria_esaurita") {
      return res.status(200).json({
        id_corsa: ride.id_corsa,
        stato_corsa: ride.stato_corsa,
        id_mezzo: ride.vehicle.id_mezzo,
        tipo_mezzo: ride.vehicle.tipo_mezzo,
        data_ora_inizio: ride.data_ora_inizio,
        durata_corrente_minuti: ride.durata_minuti || 0,
        km_percorsi: ride.km_percorsi
          ? parseFloat(ride.km_percorsi).toFixed(2)
          : 0,
        costo_stimato: ride.costo ? parseFloat(ride.costo).toFixed(2) : 0,
        parcheggio_inizio: ride.parkingInizio.nome,
        tariffa_minuto: ride.vehicle.tariffa_minuto,
        avviso: "🛑 Batteria esaurita! Procedi al pagamento.",
      });
    }

    // Se attiva, calcola live
    const durataCorrenteMinuti = Math.ceil(
      (new Date() - ride.data_ora_inizio) / (1000 * 60)
    );

    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);
    const kmPercorsi = calcolaKmPercorsi(
      durataCorrenteMinuti,
      ride.vehicle.tipo_mezzo
    );

    let costStimato;
    if (durataCorrenteMinuti <= 30) {
      costStimato = 1.0;
    } else {
      costStimato = 1.0 + (durataCorrenteMinuti - 30) * tariffa;
    }

    res.status(200).json({
      id_corsa: ride.id_corsa,
      stato_corsa: ride.stato_corsa,
      id_mezzo: ride.vehicle.id_mezzo,
      tipo_mezzo: ride.vehicle.tipo_mezzo,
      stato_batteria: ride.vehicle.stato_batteria,
      data_ora_inizio: ride.data_ora_inizio,
      durata_corrente_minuti: durataCorrenteMinuti,
      km_percorsi: parseFloat(kmPercorsi.toFixed(2)),
      costo_stimato: parseFloat(costStimato.toFixed(2)),
      parcheggio_inizio: ride.parkingInizio.nome,
      tariffa_minuto: ride.vehicle.tariffa_minuto,
    });
  } catch (error) {
    console.error("❌ Errore GET active ride:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET RIDE HISTORY - Storico delle corse completate
export const getRideHistory = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;
    const { limit = 20, offset = 0 } = req.query;

    const { count, rows } = await Ride.findAndCountAll({
      where: { id_utente, stato_corsa: "completata" },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo"],
        },
        {
          model: Parking,
          as: "parkingInizio",
          attributes: ["nome"],
        },
        {
          model: Parking,
          as: "parkingFine",
          attributes: ["nome"],
        },
      ],
      order: [["data_ora_inizio", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const ridesFormatted = rows.map((ride) => ({
      id_corsa: ride.id_corsa,
      id_utente: ride.id_utente,
      id_mezzo: ride.id_mezzo,
      id_parcheggio_inizio: ride.id_parcheggio_inizio,
      id_parcheggio_fine: ride.id_parcheggio_fine,
      data_ora_inizio: ride.data_ora_inizio,
      data_ora_fine: ride.data_ora_fine,
      durata_minuti: ride.durata_minuti,
      costo_originale: parseFloat(ride.costo).toFixed(2),
      sconto_punti: parseFloat((ride.punti_fedeltà_usati * 0.05).toFixed(2)),
      importo_pagato: parseFloat(
        (ride.costo - ride.punti_fedeltà_usati * 0.05).toFixed(2)
      ),
      punti_fedeltà_usati: ride.punti_fedeltà_usati,
      km_percorsi: ride.km_percorsi,
      stato_corsa: ride.stato_corsa,
      vehicle: ride.vehicle,
      parkingInizio: ride.parkingInizio,
      parkingFine: ride.parkingFine,
    }));

    res.status(200).json({
      message: "Storico corse recuperato",
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      rides: ridesFormatted,
    });
  } catch (error) {
    console.error("❌ Errore GET ride history:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET RIDE BY ID - Dettagli singola corsa
export const getRideById = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const id_utente = req.user.id_utente;

    const ride = await Ride.findByPk(ride_id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        { model: Parking, as: "parkingInizio" },
        { model: Parking, as: "parkingFine" },
      ],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    res.status(200).json({
      message: "Dettagli corsa",
      ride,
    });
  } catch (error) {
    console.error("❌ Errore GET ride by ID:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// CANCEL RIDE - Annulla corsa in corso
export const cancelRide = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const id_utente = req.user.id_utente;

    const ride = await Ride.findByPk(ride_id, {
      include: [{ model: Vehicle, as: "vehicle" }],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: "Puoi cancellare solo corse in corso",
      });
    }

    const vehicle = ride.vehicle;

    if (vehicle.stato_batteria !== null && vehicle.stato_batteria < 20) {
      vehicle.stato = "non_prelevabile";
    } else {
      vehicle.stato = "disponibile";
    }

    await vehicle.save();

    ride.stato_corsa = "cancellata";
    await ride.save();

    res.status(200).json({
      message: "Corsa cancellata",
      id_corsa: ride.id_corsa,
    });
  } catch (error) {
    console.error("❌ Errore CANCEL ride:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET USER RIDE STATISTICS - Statistiche corse per profilo utente
export const getUserRideStatistics = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const totalRides = await Ride.count({
      where: { id_utente, stato_corsa: "completata" },
    });

    const lastRide = await Ride.findOne({
      where: { id_utente, stato_corsa: "completata" },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["tipo_mezzo"],
        },
      ],
      order: [["data_ora_fine", "DESC"]],
      limit: 1,
    });

    const rideTransactions = await Transaction.findAll({
      where: {
        id_utente,
        tipo_transazione: "pagamento_corsa",
      },
      raw: true,
    });

    const totalSpent = rideTransactions.reduce(
      (sum, t) => sum + parseFloat(t.importo),
      0
    );

    const rides = await Ride.findAll({
      where: {
        id_utente,
        stato_corsa: "completata",
      },
      attributes: ["km_percorsi"],
      raw: true,
    });

    const totalKm = rides.reduce(
      (sum, ride) => sum + parseFloat(ride.km_percorsi || 0),
      0
    );

    res.status(200).json({
      corse_totali: totalRides,
      ultimo_mezzo: lastRide ? lastRide.vehicle.tipo_mezzo : "N/A",
      spesa_totale: parseFloat(totalSpent.toFixed(2)),
      km_totali: parseFloat(totalKm.toFixed(2)),
    });
  } catch (error) {
    console.error("❌ Errore GET ride statistics:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET RIDES TODAY - Tutte le corse di oggi (admin)
export const getRidesToday = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const rides = await Ride.findAll({
      where: {
        data_ora_inizio: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["nome", "cognome"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo"],
        },
        {
          model: Parking,
          as: "parkingInizio",
          attributes: ["id_parcheggio", "nome"],
        },
        {
          model: Parking,
          as: "parkingFine",
          attributes: ["id_parcheggio", "nome"],
        },
      ],
      attributes: [
        "id_corsa",
        "id_utente",
        "id_mezzo",
        "id_parcheggio_inizio",
        "id_parcheggio_fine",
        "data_ora_inizio",
        "data_ora_fine",
        "durata_minuti",
        "costo",
        "km_percorsi",
        "stato_corsa",
        "punti_fedeltà_usati",
      ],
      order: [["data_ora_inizio", "DESC"]],
    });

    res.status(200).json({
      message: "Corse di oggi recuperate",
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("❌ Errore GET rides today:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET ALL COMPLETED RIDES - Tutte le corse completate (admin)
export const getAllCompletedRides = async (req, res) => {
  try {
    const rides = await Ride.findAll({
      where: { stato_corsa: "completata" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["nome", "cognome"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo"],
        },
        {
          model: Parking,
          as: "parkingInizio",
          attributes: ["id_parcheggio", "nome"],
        },
        {
          model: Parking,
          as: "parkingFine",
          attributes: ["id_parcheggio", "nome"],
        },
      ],
      attributes: [
        "id_corsa",
        "id_utente",
        "id_mezzo",
        "id_parcheggio_inizio",
        "id_parcheggio_fine",
        "data_ora_inizio",
        "data_ora_fine",
        "durata_minuti",
        "costo",
        "km_percorsi",
        "stato_corsa",
        "punti_fedeltà_usati",
      ],
      order: [["data_ora_fine", "DESC"]],
    });

    res.status(200).json({
      message: "Tutte le corse completate recuperate",
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("❌ Errore GET all completed rides:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  startRide,
  checkPayment,
  endRideWithPayment,
  getActiveRide,
  getRideHistory,
  getRideById,
  cancelRide,
  getUserRideStatistics,
  endRideWithDebt,
  getRidesToday,
  getAllCompletedRides,
};
