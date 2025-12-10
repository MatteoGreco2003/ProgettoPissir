import Vehicle from "../models/Vehicle.js";
import Parking from "../models/Parking.js";

// ✅ GET ALL VEHICLES
export const getAllVehicles = async (req, res) => {
  try {
    const { tipo_mezzo, id_parcheggio, stato } = req.query;

    // Costruisci filtri dinamici
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

// ✅ GET VEHICLE BY ID
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

    res.status(200).json({
      message: "Mezzo recuperato",
      vehicle,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicle by ID:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ CREATE VEHICLE (solo admin/gestore)
export const createVehicle = async (req, res) => {
  try {
    const { tipo_mezzo, id_parcheggio, tariffa_minuto, codice_identificativo } =
      req.body;

    // Validazione
    if (!tipo_mezzo || !id_parcheggio || !tariffa_minuto) {
      return res.status(400).json({
        error: "tipo_mezzo, id_parcheggio e tariffa_minuto sono obbligatori",
      });
    }

    // Verifica che il parcheggio esista
    const parking = await Parking.findByPk(id_parcheggio);
    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    // Verifica codice univoco
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

    const vehicle = await Vehicle.create({
      tipo_mezzo,
      id_parcheggio,
      tariffa_minuto,
      codice_identificativo,
      stato: "disponibile",
      stato_batteria: 100,
    });

    res.status(201).json({
      message: "Mezzo creato con successo",
      vehicle,
    });
  } catch (error) {
    console.error("❌ Errore CREATE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ UPDATE VEHICLE (solo admin/gestore)
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_mezzo, id_parcheggio, stato, tariffa_minuto } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    // Validazione parcheggio se viene cambiato
    if (id_parcheggio) {
      const parking = await Parking.findByPk(id_parcheggio);
      if (!parking) {
        return res.status(404).json({ error: "Parcheggio non trovato" });
      }
    }

    // Update solo i campi forniti
    if (tipo_mezzo) vehicle.tipo_mezzo = tipo_mezzo;
    if (id_parcheggio) vehicle.id_parcheggio = id_parcheggio;
    if (stato) vehicle.stato = stato;
    if (tariffa_minuto) vehicle.tariffa_minuto = tariffa_minuto;

    await vehicle.save();

    res.status(200).json({
      message: "Mezzo aggiornato con successo",
      vehicle,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ DELETE VEHICLE (solo admin/gestore)
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    await vehicle.destroy();

    res.status(204).send();
  } catch (error) {
    console.error("❌ Errore DELETE vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ UPDATE BATTERY FROM MQTT (riceve da IoT)
export const updateBatteryFromMQTT = async (req, res) => {
  try {
    const { id_mezzo, battery_level } = req.body;

    if (!id_mezzo || battery_level === undefined) {
      return res
        .status(400)
        .json({ error: "id_mezzo e battery_level sono obbligatori" });
    }

    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    vehicle.stato_batteria = battery_level;
    await vehicle.save();

    // ✅ TODO: Se batteria < 20%, crea segnalazione automatica
    if (battery_level < 20) {
      console.warn(
        `⚠️ Batteria bassa per mezzo ${id_mezzo}: ${battery_level}%`
      );
      // Qui inserirai logica per creare report automatico
    }

    res.status(200).json({
      message: "Batteria aggiornata",
      vehicle,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE battery:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET VEHICLES BY PARKING
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

export default {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateBatteryFromMQTT,
  getVehiclesByParking,
};
