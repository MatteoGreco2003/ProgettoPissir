import Parking from "../models/Parking.js";
import Vehicle from "../models/Vehicle.js";

// GET ALL PARKINGS - Lista di tutti i parcheggi
export const getAllParkings = async (req, res) => {
  try {
    const parkings = await Parking.findAll({
      include: [
        {
          model: Vehicle,
          as: "vehicles",
          attributes: ["id_mezzo", "tipo_mezzo", "stato"],
        },
      ],
    });

    res.status(200).json({
      message: "Lista parcheggi recuperata",
      count: parkings.length,
      parkings,
    });
  } catch (error) {
    console.error("❌ Errore GET parkings:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET PARKING BY ID - Dettagli parcheggio con disponibilità
export const getParkingById = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: "vehicles",
          attributes: ["id_mezzo", "tipo_mezzo", "stato", "stato_batteria"],
        },
      ],
    });

    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    // Calcola posti disponibili
    const disponibili = parking.capacita - (parking.vehicles?.length || 0);

    res.status(200).json({
      message: "Parcheggio recuperato",
      parking: {
        ...parking.toJSON(),
        disponibili,
        occupati: parking.vehicles?.length || 0,
      },
    });
  } catch (error) {
    console.error("❌ Errore GET parking by ID:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// CREATE PARKING - Crea nuovo parcheggio (admin/gestore)
export const createParking = async (req, res) => {
  try {
    const { nome, latitudine, longitudine, capacita } = req.body;

    if (
      !nome ||
      latitudine === undefined ||
      longitudine === undefined ||
      !capacita
    ) {
      return res.status(400).json({
        error: "nome, latitudine, longitudine e capacita sono obbligatori",
      });
    }

    // Valida coordinate
    if (latitudine < -90 || latitudine > 90) {
      return res
        .status(400)
        .json({ error: "Latitudine non valida (-90 a 90)" });
    }

    if (longitudine < -180 || longitudine > 180) {
      return res
        .status(400)
        .json({ error: "Longitudine non valida (-180 a 180)" });
    }

    if (capacita < 1) {
      return res.status(400).json({ error: "Capacità minimo 1" });
    }

    const parking = await Parking.create({
      nome,
      latitudine,
      longitudine,
      capacita,
    });

    res.status(201).json({
      message: "Parcheggio creato con successo",
      parking,
    });
  } catch (error) {
    console.error("❌ Errore CREATE parking:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// UPDATE PARKING - Modifica dati parcheggio (admin/gestore)
export const updateParking = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, latitudine, longitudine, capacita } = req.body;

    const parking = await Parking.findByPk(id);
    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    // Valida coordinate se cambiate
    if (latitudine !== undefined) {
      if (latitudine < -90 || latitudine > 90) {
        return res.status(400).json({ error: "Latitudine non valida" });
      }
      parking.latitudine = latitudine;
    }

    if (longitudine !== undefined) {
      if (longitudine < -180 || longitudine > 180) {
        return res.status(400).json({ error: "Longitudine non valida" });
      }
      parking.longitudine = longitudine;
    }

    if (nome) parking.nome = nome;

    if (capacita !== undefined) {
      if (capacita < 1) {
        return res.status(400).json({ error: "Capacità minimo 1" });
      }

      // Controlla se ci sono mezzi parcheggiati
      const vehicleCount = await Vehicle.count({
        where: { id_parcheggio: id },
      });

      if (capacita < vehicleCount) {
        return res.status(400).json({
          error: `Non puoi ridurre a ${capacita}, ci sono ${vehicleCount} mezzi parcheggiati`,
        });
      }

      parking.capacita = capacita;
    }

    await parking.save();

    res.status(200).json({
      message: "Parcheggio aggiornato con successo",
      parking,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE parking:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// DELETE PARKING - Elimina parcheggio (admin/gestore)
export const deleteParking = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findByPk(id);
    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    // Non eliminare se contiene mezzi
    const vehicleCount = await Vehicle.count({
      where: { id_parcheggio: id },
    });

    if (vehicleCount > 0) {
      return res.status(400).json({
        error: `Impossibile eliminare contiene ${vehicleCount} mezzi`,
      });
    }

    await parking.destroy();

    res.status(204).send();
  } catch (error) {
    console.error("❌ Errore DELETE parking:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET PARKING AVAILABILITY - Disponibilità posti parcheggio
export const getParkingAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: "vehicles",
          attributes: ["id_mezzo"],
        },
      ],
    });

    if (!parking) {
      return res.status(404).json({ error: "Parcheggio non trovato" });
    }

    const occupati = parking.vehicles?.length || 0;
    const disponibili = parking.capacita - occupati;

    res.status(200).json({
      id_parcheggio: parking.id_parcheggio,
      nome: parking.nome,
      capacita: parking.capacita,
      occupati,
      disponibili,
      percentuale_occupazione: ((occupati / parking.capacita) * 100).toFixed(2),
    });
  } catch (error) {
    console.error("❌ Errore GET availability:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  getAllParkings,
  getParkingById,
  createParking,
  updateParking,
  deleteParking,
  getParkingAvailability,
};
