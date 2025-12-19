import Ride from "../models/Ride.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Parking from "../models/Parking.js";
import Transaction from "../models/Transaction.js";
import PuntiFedelta from "../models/LoyaltyPoints.js";
import mqtt from "mqtt";

// Helper: Determina la tariffa base in base al tipo di mezzo
const getTariffaBaseByMezzo = (tipo_mezzo) => {
  switch (tipo_mezzo) {
    case "bicicletta_muscolare":
      return 0.15; // €0.15 per minuto (la più economica)
    case "bicicletta_elettrica":
      return 0.25; // €0.25 per minuto
    case "monopattino":
      return 0.2; // €0.20 per minuto
    default:
      return 0.25; // Default
  }
};

// Helper: Determina la velocità media in base al tipo di mezzo
const getVelocitaMediaByMezzo = (tipo_mezzo) => {
  switch (tipo_mezzo) {
    case "bicicletta_muscolare":
      return 15; // km/h
    case "bicicletta_elettrica":
      return 25; // km/h
    case "monopattino":
      return 20; // km/h
    default:
      return 15; // Default
  }
};

// Helper: Calcola km percorsi
const calcolaKmPercorsi = (durataMinuti, tipo_mezzo) => {
  const velocitaMedia = getVelocitaMediaByMezzo(tipo_mezzo);
  return (durataMinuti / 60) * velocitaMedia;
};

// ✅ START RIDE - Inizio corsa con sblocco MQTT
export const startRide = async (req, res) => {
  try {
    const { id_mezzo } = req.body;
    const id_utente = req.user.id_utente;

    // Validazione
    if (!id_mezzo) {
      return res.status(400).json({ error: "id_mezzo è obbligatorio" });
    }

    // 1️⃣ Verifica utente esiste
    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // 2️⃣ Verifica che account non sia sospeso
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

    // 2️⃣ Verifica saldo minimo (almeno 1.00€)
    const saldoNumero = parseFloat(user.saldo);
    if (saldoNumero < 1.0) {
      return res.status(402).json({
        error:
          "Saldo insufficiente. Devi avere almeno 1.00€ per iniziare una corsa",
        saldo_attuale: saldoNumero,
        saldo_minimo_richiesto: 1.0,
      });
    }

    // 3️⃣ Controlla se utente ha già una corsa attiva
    const activeRide = await Ride.findOne({
      where: { id_utente, stato_corsa: "in_corso" },
    });

    if (activeRide) {
      return res.status(400).json({
        error: "Hai già una corsa attiva",
        active_ride_id: activeRide.id_corsa,
      });
    }

    // 4️⃣ Verifica mezzo esiste e è disponibile
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

    // 4️⃣B NUOVO - Verifica batteria minima (almeno 20%)
    if (vehicle.stato_batteria < 20) {
      return res.status(400).json({
        error: "Mezzo non disponibile. Batteria insufficiente",
        batteria_attuale: vehicle.stato_batteria,
        batteria_minima_richiesta: 20,
      });
    }

    // 5️⃣ Crea record corsa
    const ride = await Ride.create({
      id_utente,
      id_mezzo,
      id_parcheggio_inizio: vehicle.id_parcheggio,
      data_ora_inizio: new Date(),
      stato_corsa: "in_corso",
    });

    // 6️⃣ Aggiorna stato mezzo a "in_uso"
    vehicle.stato = "in_uso";
    await vehicle.save();

    // 7️⃣ MQTT: Pubblica comando UNLOCK
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
        console.warn("⚠️ MQTT connection error (non critico):", err.message);
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

// ✅ CHECK PAYMENT - Controlla se ha credito sufficiente
export const checkPayment = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const id_utente = req.user.id_utente;

    // Validazione
    if (!ride_id) {
      return res.status(400).json({ error: "ride_id è obbligatorio" });
    }

    // 1️⃣ Verifica corsa esiste (CON INCLUDE!)
    const ride = await Ride.findByPk(ride_id, {
      include: [{ model: Vehicle, as: "vehicle" }],
    });

    // 2️⃣ Verifica che la corsa appartiene all'utente
    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    // 3️⃣ Verifica che la corsa è ancora in corso o sospesa
    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    // 4️⃣ Calcola durata e costo
    const dataFine = new Date();
    const durataMinuti = Math.ceil(
      (dataFine - ride.data_ora_inizio) / (1000 * 60)
    );

    // Determina la tariffa in base al tipo di mezzo
    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

    let costo;
    if (durataMinuti <= 30) {
      costo = 1.0;
    } else {
      costo = 1.0 + (durataMinuti - 30) * tariffa;
    }

    // 5️⃣ Recupera saldo utente
    const user = await User.findByPk(id_utente);
    const saldoNumero = parseFloat(user.saldo);

    // 6️⃣ Ritorna check result
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

// ✅ END RIDE WITH PAYMENT - Fine corsa, pagamento immediato
export const endRideWithPayment = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const { id_parcheggio_fine, importo_ricarica } = req.body;
    const id_utente = req.user.id_utente;

    // Validazione
    if (!ride_id || !id_parcheggio_fine) {
      return res.status(400).json({
        error: "ride_id e id_parcheggio_fine sono obbligatori",
      });
    }

    // 1️⃣ Verifica corsa esiste
    const ride = await Ride.findByPk(ride_id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        { model: Parking, as: "parkingInizio" },
      ],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    // 2️⃣ Verifica che la corsa appartiene all'utente
    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    // 3️⃣ Verifica che la corsa è ancora in corso (O sospesa per batteria)
    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    // 4️⃣ Verifica parcheggio fine esiste
    const parkingFine = await Parking.findByPk(id_parcheggio_fine);
    if (!parkingFine) {
      return res.status(404).json({
        error: "Parcheggio di destinazione non trovato",
      });
    }

    // 5️⃣ Calcola durata e costo
    const dataFine = new Date();
    const durataMinuti = Math.ceil(
      (dataFine - ride.data_ora_inizio) / (1000 * 60)
    );

    // Determina la tariffa in base al tipo di mezzo
    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

    let costo;
    if (durataMinuti <= 30) {
      costo = 1.0;
    } else {
      costo = 1.0 + (durataMinuti - 30) * tariffa;
    }

    // 6️⃣ Recupera utente
    const user = await User.findByPk(id_utente);
    let saldoDisponibile = parseFloat(user.saldo);
    let punti_utilizzati = 0;

    // 7️⃣ Se l'utente chiede di ricaricare, aggiungi l'importo
    if (importo_ricarica && importo_ricarica > 0) {
      saldoDisponibile += importo_ricarica;

      // Crea transaction ricarica
      await Transaction.create({
        id_utente,
        tipo_transazione: "ricarica",
        importo: importo_ricarica,
        descrizione: "Ricarica per pagamento corsa",
      });
    }

    // 7️⃣B Se l'utente vuole usare punti come sconto
    const { usa_punti } = req.body; // Boolean dal frontend
    if (usa_punti && user.punti > 0) {
      // 1 punto = €0.05 di sconto
      const sconto_punti = user.punti * 0.05;
      punti_utilizzati = user.punti;

      saldoDisponibile += sconto_punti;
      user.punti = 0; // Resetta i punti dopo l'uso
    }

    // 8️⃣ Verifica se ha abbastanza per pagare
    if (saldoDisponibile < costo) {
      return res.status(402).json({
        error: "Saldo insufficiente anche dopo la ricarica",
        costo_corsa: parseFloat(costo.toFixed(2)),
        saldo_disponibile: parseFloat(saldoDisponibile.toFixed(2)),
        importo_mancante: parseFloat((costo - saldoDisponibile).toFixed(2)),
        messaggio: "Ricaricare una cifra superiore per coprire la corsa",
      });
    }

    // 9️⃣ PAGAMENTO CONFERMATO - Aggiorna tutto
    // Calcola km percorsi
    const kmPercorsi = calcolaKmPercorsi(durataMinuti, ride.vehicle.tipo_mezzo);

    // Completa la ride
    ride.id_parcheggio_fine = id_parcheggio_fine;
    ride.data_ora_fine = dataFine;
    ride.durata_minuti = durataMinuti;
    ride.costo = costo;
    ride.km_percorsi = kmPercorsi;
    ride.stato_corsa = "completata";
    await ride.save();

    // 🔟 Aggiorna mezzo
    const vehicle = ride.vehicle;

    // Controllo batteria: se < 20% → non prelevabile
    if (vehicle.stato_batteria < 20) {
      vehicle.stato = "non_prelevabile";
    } else {
      vehicle.stato = "disponibile";
    }

    vehicle.id_parcheggio = id_parcheggio_fine;
    await vehicle.save();

    // Crea transaction pagamento corsa
    await Transaction.create({
      id_utente,
      tipo_transazione: "pagamento_corsa",
      importo: costo,
      id_corsa: ride.id_corsa,
      descrizione: `Pagamento corsa: ${durataMinuti} minuti`,
    });

    //  Calcola e salva punti fedeltà se è bicicletta muscolare
    // ?MA SOLO SE NON HA USATO PUNTI IN QUESTA CORSA
    if (
      ride.vehicle.tipo_mezzo === "bicicletta_muscolare" &&
      punti_utilizzati === 0
    ) {
      const punti_guadagnati = Math.floor(durataMinuti / 5); // 1 punto ogni 5 minuti

      user.punti += punti_guadagnati;

      // Traccia l'operazione nella tabella punti_fedelta
      await PuntiFedelta.create({
        id_utente,
        id_corsa: ride.id_corsa,
        tipo_operazione: "guadagnati",
        punti_importo: punti_guadagnati,
        descrizione: `Punti guadagnati da corsa in bicicletta muscolare (${durataMinuti} min)`,
      });
    }

    // Se ha usato punti, traccia l'utilizzo
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

    // 1️⃣1️⃣ MQTT Lock
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
        console.warn("⚠️ MQTT error (non critico):", err.message);
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT publish fallito:", mqttError.message);
    }

    // Aggiorna saldo utente
    user.saldo = saldoDisponibile - costo;
    user.stato_account = "attivo"; // Rimane attivo perché ha pagato
    await user.save();

    // ✅ Risposta successo
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
      punti_fedeltà: {
        punti_guadagnati:
          punti_utilizzati > 0 ? 0 : Math.floor(durataMinuti / 5), // Se ha usato punti, non guadagna altri
        punti_utilizzati: punti_utilizzati,
        sconto_applicato:
          punti_utilizzati > 0
            ? parseFloat((punti_utilizzati * 0.05).toFixed(2))
            : 0,
        punti_totali_attuali: user.punti,
      },
    });
  } catch (error) {
    console.error("❌ Errore END ride with payment:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ END RIDE WITH DEBT - Fine corsa, crea debito e sospende account
export const endRideWithDebt = async (req, res) => {
  try {
    const { ride_id } = req.params;
    const { id_parcheggio_fine } = req.body;
    const id_utente = req.user.id_utente;

    // Validazione
    if (!ride_id || !id_parcheggio_fine) {
      return res.status(400).json({
        error: "ride_id e id_parcheggio_fine sono obbligatori",
      });
    }

    // 1️⃣ Verifica corsa esiste
    const ride = await Ride.findByPk(ride_id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        { model: Parking, as: "parkingInizio" },
      ],
    });

    if (!ride) {
      return res.status(404).json({ error: "Corsa non trovata" });
    }

    // 2️⃣ Verifica che la corsa appartiene all'utente
    if (ride.id_utente !== id_utente) {
      return res.status(403).json({ error: "Questa corsa non ti appartiene" });
    }

    // 3️⃣ Verifica che la corsa è ancora in corso (O sospesa per batteria)
    if (
      ride.stato_corsa !== "in_corso" &&
      ride.stato_corsa !== "sospesa_batteria_esaurita"
    ) {
      return res.status(400).json({
        error: `Corsa non è in corso. Stato: ${ride.stato_corsa}`,
      });
    }

    // 4️⃣ Verifica parcheggio fine esiste
    const parkingFine = await Parking.findByPk(id_parcheggio_fine);
    if (!parkingFine) {
      return res.status(404).json({
        error: "Parcheggio di destinazione non trovato",
      });
    }

    // 5️⃣ Calcola durata e costo
    const dataFine = new Date();
    const durataMinuti = Math.ceil(
      (dataFine - ride.data_ora_inizio) / (1000 * 60)
    );

    // Determina la tariffa in base al tipo di mezzo
    const tariffa = getTariffaBaseByMezzo(ride.vehicle.tipo_mezzo);

    let costo;
    if (durataMinuti <= 30) {
      costo = 1.0;
    } else {
      costo = 1.0 + (durataMinuti - 30) * tariffa;
    }

    // 6️⃣ Recupera utente
    const user = await User.findByPk(id_utente);

    // 7️⃣ Calcola il debito totale
    // Debito = costo corsa + costo prima 30 min della prossima corsa
    const costoPrimaCorsa = 1.0;
    const debitoTotale = costo + costoPrimaCorsa;

    // 8️⃣ Aggiorna saldo (diventa negativo = debito)
    const saldoNuovo = user.saldo - debitoTotale;

    user.saldo = saldoNuovo;
    user.stato_account = "sospeso"; // Account sospeso immediatamente
    user.data_sospensione = new Date();
    user.numero_sospensioni = (user.numero_sospensioni || 0) + 1; // aggiorna counter sospensioni
    await user.save();

    // 9️⃣ Completa la ride
    // Calcola km percorsi
    const kmPercorsi = calcolaKmPercorsi(durataMinuti, ride.vehicle.tipo_mezzo);

    ride.id_parcheggio_fine = id_parcheggio_fine;
    ride.data_ora_fine = dataFine;
    ride.durata_minuti = durataMinuti;
    ride.costo = costo;
    ride.km_percorsi = kmPercorsi;
    ride.stato_corsa = "completata";
    await ride.save();

    // 🔟 Aggiorna mezzo
    const vehicle = ride.vehicle;

    // Controllo batteria: se < 20% → non prelevabile
    if (vehicle.stato_batteria < 20) {
      vehicle.stato = "non_prelevabile";
    } else {
      vehicle.stato = "disponibile";
    }

    vehicle.id_parcheggio = id_parcheggio_fine;
    await vehicle.save();

    // 1️⃣1️⃣ Crea transaction per il pagamento corsa
    await Transaction.create({
      id_utente,
      tipo_transazione: "pagamento_corsa",
      importo: costo,
      id_corsa: ride.id_corsa,
      descrizione: `Pagamento corsa: ${durataMinuti} minuti (non pagato - conto sospeso)`,
    });

    // 1️⃣2️⃣ Crea transaction per il debito della prossima corsa
    await Transaction.create({
      id_utente,
      tipo_transazione: "debito_prossima_corsa",
      importo: costoPrimaCorsa,
      id_corsa: ride.id_corsa,
      descrizione:
        "Debito preventivo: costo prima 30 minuti della prossima corsa",
    });

    // 1️⃣3️⃣ MQTT Lock
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
        console.warn("⚠️ MQTT error (non critico):", err.message);
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT publish fallito:", mqttError.message);
    }

    // 🔴 Risposta: Account sospeso
    res.status(202).json({
      success: false,
      message: "Corsa completata ma account sospeso per debito",
      id_corsa: ride.id_corsa,
      durata_minuti: durataMinuti,
      costo_corsa: parseFloat(costo.toFixed(2)),
      costo_prossima_corsa_preventivo: costoPrimaCorsa,
      debito_totale: parseFloat(debitoTotale.toFixed(2)),
      saldo_dopo: parseFloat(saldoNuovo.toFixed(2)),
      parcheggio_fine: parkingFine.nome,
      punti_totali: user.punti,
      account_status: {
        stato_account: "sospeso",
        data_sospensione: user.data_sospensione,
        debito: Math.abs(saldoNuovo),
        importo_minimo_ricarica: parseFloat(
          (Math.abs(saldoNuovo) + costoPrimaCorsa).toFixed(2)
        ),
        messaggio: `Account sospeso. Debito totale: ${debitoTotale.toFixed(
          2
        )}€. Per riaprire ricaricare almeno ${(
          Math.abs(saldoNuovo) + costoPrimaCorsa
        ).toFixed(2)}€`,
      },
    });
  } catch (error) {
    console.error("❌ Errore END ride with debt:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET ACTIVE RIDE
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

    // ⚠️ SE SOSPESA, USA I VALORI CONGELATI DAL DB
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
          : 0, // ← Convertito perche dava errore toFixed
        costo_stimato: ride.costo ? parseFloat(ride.costo).toFixed(2) : 0, // ← Convertito perche dava errore toFixed
        parcheggio_inizio: ride.parkingInizio.nome,
        tariffa_minuto: ride.vehicle.tariffa_minuto,
        avviso: "🛑 Batteria esaurita! Procedi al pagamento.",
      });
    }

    // SE ATTIVA, CALCOLA LIVE
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

// ✅ GET RIDE HISTORY
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

    res.status(200).json({
      message: "Storico corse recuperato",
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      rides: rows,
    });
  } catch (error) {
    console.error("❌ Errore GET ride history:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET RIDE BY ID
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

    // Verifica ownership
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

// ✅ CANCEL RIDE (cancella corsa in corso)
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

    // Aggiorna mezzo
    const vehicle = ride.vehicle;
    vehicle.stato = "disponibile";
    await vehicle.save();

    // Cancella corsa
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

// ✅ GET USER RIDE STATISTICS (per profilo utente)
export const getUserRideStatistics = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    // 1️⃣ Conta corse totali completate
    const totalRides = await Ride.count({
      where: { id_utente, stato_corsa: "completata" },
    });

    // 2️⃣ Ottieni ultima corsa per il mezzo usato
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

    // 3️⃣ Calcola spesa totale
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

    res.status(200).json({
      corse_totali: totalRides,
      ultimo_mezzo: lastRide ? lastRide.vehicle.tipo_mezzo : "N/A",
      spesa_totale: parseFloat(totalSpent.toFixed(2)),
    });
  } catch (error) {
    console.error("❌ Errore GET ride statistics:", error.message);
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
};
