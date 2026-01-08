import Vehicle from "../models/Vehicle.js";
import Parking from "../models/Parking.js";
import Report from "../models/Report.js";

// GET ALL VEHICLES - Lista mezzi con filtri opzionali (tipo, parcheggio, stato)
export const getAllVehicles = async (req, res) => {
  try {
    const { tipo_mezzo, id_parcheggio, stato } = req.query;

    const where = {};
    if (tipo_mezzo) where.tipo_mezzo = tipo_mezzo;
    if (id_parcheggio) where.id_parcheggio = id_parcheggio;
    if (stato) where.stato = stato;

    const vehicles = await Vehicle.findAll({
      where,
      include: [
        {
          model: Parking,
          as: "parking",
          attributes: ["id_parcheggio", "nome", "latitudine", "longitudine"],
        },
      ],
    });

    res.status(200).json({
      message: "Lista mezzi recuperata",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicles:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET VEHICLE BY ID - Dettagli mezzo singolo
export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id, {
      include: [
        {
          model: Parking,
          as: "parking",
          attributes: ["id_parcheggio", "nome", "latitudine", "longitudine"],
        },
      ],
    });

    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    const reportInLavorazione = await Report.count({
      where: {
        id_mezzo: id,
        stato_segnalazione: "in_lavorazione",
      },
    });

    res.status(200).json({
      message: "Mezzo recuperato",
      vehicle,
      report_in_lavorazione: reportInLavorazione,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicle by ID:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// CREATE VEHICLE - Crea mezzo (utente admin)
export const createVehicle = async (req, res) => {
  try {
    const { tipo_mezzo, id_parcheggio, codice_identificativo } = req.body;

    if (!tipo_mezzo || !id_parcheggio) {
      return res.status(400).json({
        error: "tipo_mezzo e id_parcheggio sono obbligatori",
      });
    }

    const tipi_validi = [
      "monopattino",
      "bicicletta_muscolare",
      "bicicletta_elettrica",
    ];
    if (!tipi_validi.includes(tipo_mezzo)) {
      return res.status(400).json({
        error: `Tipo mezzo non valido. Validi: ${tipi_validi.join(", ")}`,
      });
    }

    const parking = await Parking.findByPk(id_parcheggio);
    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    if (codice_identificativo) {
      const existingVehicle = await Vehicle.findOne({
        where: { codice_identificativo },
      });
      if (existingVehicle) {
        return res
          .status(400)
          .json({ error: "Codice identificativo già esistente" });
      }
    }

    let tariffa_minuto;
    switch (tipo_mezzo) {
      case "bicicletta_muscolare":
        tariffa_minuto = 0.15;
        break;
      case "bicicletta_elettrica":
        tariffa_minuto = 0.25;
        break;
      case "monopattino":
        tariffa_minuto = 0.2;
        break;
    }

    const vehicle = await Vehicle.create({
      tipo_mezzo,
      id_parcheggio,
      tariffa_minuto,
      codice_identificativo,
      stato: "disponibile",
      stato_batteria: tipo_mezzo === "bicicletta_muscolare" ? null : 100,
    });

    res.status(201).json({
      message: "Mezzo creato con successo",
      vehicle,
      tariffa_impostata: `€${tariffa_minuto}/min`,
    });
  } catch (error) {
    console.error("❌ Errore CREATE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// UPDATE VEHICLE - Modifica mezzo (utente admin)
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_mezzo, id_parcheggio, stato, stato_batteria } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    if (stato === "disponibile") {
      const activeReport = await Report.findOne({
        where: {
          id_mezzo: id,
          stato_segnalazione: "in_lavorazione",
        },
      });
      if (activeReport) {
        return res.status(400).json({
          error:
            "Non puoi rendere disponibile il mezzo. Ci sono report in lavorazione.",
          reportId: activeReport.id_report,
          stato_segnalazione: activeReport.stato_segnalazione,
          messaggio: "Risolvi tutti i report prima di renderlo disponibile",
        });
      }
    }

    if (id_parcheggio) {
      const parking = await Parking.findByPk(id_parcheggio);
      if (!parking) {
        return res.status(404).json({ error: "Parcheggio non trovato" });
      }
    }

    if (tipo_mezzo) {
      const tipi_validi = [
        "monopattino",
        "bicicletta_muscolare",
        "bicicletta_elettrica",
      ];
      if (!tipi_validi.includes(tipo_mezzo)) {
        return res.status(400).json({
          error: `Tipo mezzo non valido. Validi: ${tipi_validi.join(", ")}`,
        });
      }
    }

    if (tipo_mezzo) {
      vehicle.tipo_mezzo = tipo_mezzo;

      switch (tipo_mezzo) {
        case "bicicletta_muscolare":
          vehicle.tariffa_minuto = 0.15;
          break;
        case "bicicletta_elettrica":
          vehicle.tariffa_minuto = 0.25;
          break;
        case "monopattino":
          vehicle.tariffa_minuto = 0.2;
          break;
      }
    }

    if (id_parcheggio) vehicle.id_parcheggio = id_parcheggio;
    if (stato) vehicle.stato = stato;

    if (stato_batteria !== undefined) {
      if (vehicle.tipo_mezzo === "bicicletta_muscolare") {
        return res.status(400).json({
          error: "La bicicletta muscolare non ha batteria",
        });
      }

      if (stato_batteria < 0 || stato_batteria > 100) {
        return res.status(400).json({
          error: "Batteria deve essere tra 0 e 100",
        });
      }

      vehicle.stato_batteria = stato_batteria;
    }

    if (tipo_mezzo === "bicicletta_muscolare") {
      vehicle.stato_batteria = null;
    }

    await vehicle.save();

    res.status(200).json({
      message: "Mezzo aggiornato con successo",
      vehicle,
      tariffa_impostata: `€${vehicle.tariffa_minuto}/min`,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// DELETE VEHICLE - Elimina mezzo (utente admin)
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    await vehicle.destroy();

    res.status(200).json({
      message: "Mezzo eliminato con successo",
      id_mezzo: id,
    });
  } catch (error) {
    console.error("❌ Errore DELETE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET VEHICLES BY PARKING - Mezzi in un parcheggio specifico
export const getVehiclesByParking = async (req, res) => {
  try {
    const { id_parcheggio } = req.params;

    const vehicles = await Vehicle.findAll({
      where: { id_parcheggio },
      include: [
        {
          model: Parking,
          as: "parking",
          attributes: ["id_parcheggio", "nome"],
        },
      ],
    });

    res.status(200).json({
      message: `Mezzi nel parcheggio ${id_parcheggio}`,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicles by parking:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// RECHARGE VEHICLE BATTERY - Ricarica batteria mezzo (utente admin)
export const rechargeVehicleBattery = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuova_percentuale_batteria } = req.body;

    if (nuova_percentuale_batteria === undefined) {
      return res.status(400).json({
        error: "nuova_percentuale_batteria è obbligatorio",
      });
    }

    const batteria = parseFloat(nuova_percentuale_batteria);

    if (isNaN(batteria) || batteria < 0 || batteria > 100) {
      return res.status(400).json({
        error: "Batteria deve essere un numero tra 0 e 100",
      });
    }

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    if (vehicle.tipo_mezzo === "bicicletta_muscolare") {
      return res.status(400).json({
        error: "La bicicletta muscolare non ha batteria",
      });
    }

    const batteriaPrecedente = vehicle.stato_batteria;

    vehicle.stato_batteria = batteria;

    // Se batteria > 20%, torna a disponibile; altrimenti non prelevabile
    if (batteria > 20) {
      vehicle.stato = "disponibile";
    } else if (batteria <= 20) {
      vehicle.stato = "non_prelevabile";
    }

    await vehicle.save();

    res.status(200).json({
      message: "Batteria ricaricata con successo",
      id_mezzo: vehicle.id_mezzo,
      tipo_mezzo: vehicle.tipo_mezzo,
      batteria_precedente: batteriaPrecedente,
      batteria_nuova: vehicle.stato_batteria,
      stato_mezzo: vehicle.stato,
      avviso:
        vehicle.stato_batteria <= 20
          ? "⚠️ Batteria ancora bassa - Mezzo non prelevabile"
          : "✅ Mezzo disponibile per la prenotazione",
    });
  } catch (error) {
    console.error("❌ Errore RECHARGE vehicle battery:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByParking,
  rechargeVehicleBattery,
};
