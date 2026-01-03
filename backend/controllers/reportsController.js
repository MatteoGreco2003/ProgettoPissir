// backend/controllers/reportsController.js

import Report from "../models/Report.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { Op } from "sequelize";

// CREATE REPORT - Crea nuova segnalazione per un mezzo
export const createReport = async (req, res) => {
  try {
    const { tipo_problema, id_mezzo, descrizione } = req.body;
    const id_utente = req.user.id_utente;

    if (!tipo_problema || !id_mezzo) {
      return res.status(400).json({
        error: "tipo_problema, id_mezzo e descrizione sono obbligatori",
      });
    }

    // Valida tipo di problema
    const tipiValidi = [
      "danno_fisico",
      "batteria_scarica",
      "pneumatico_bucato",
      "non_funziona",
      "sporco",
      "altro",
    ];
    if (!tipiValidi.includes(tipo_problema)) {
      return res.status(400).json({
        error: `tipo_problema non valido. Validi: ${tipiValidi.join(", ")}`,
      });
    }

    // Verifica che il mezzo esista
    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    const report = await Report.create({
      id_utente,
      id_mezzo,
      tipo_problema,
      descrizione: descrizione || null,
      stato_segnalazione: "aperta",
      data_ora: new Date(),
    });

    res.status(201).json({
      message: "Segnalazione creata con successo",
      id_segnalazione: report.id_segnalazione,
      tipo_problema: report.tipo_problema,
      stato_segnalazione: report.stato_segnalazione,
      data_ora: report.data_ora,
    });
  } catch (error) {
    console.error("❌ Errore CREATE report:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET MY REPORTS - Le mie segnalazioni
export const getMyReports = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const reports = await Report.findAll({
      where: { id_utente },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo", "codice_identificativo"],
        },
      ],
      order: [["data_ora", "DESC"]],
    });

    res.status(200).json({
      message: "Segnalazioni recuperate",
      count: reports.length,
      reports: reports,
    });
  } catch (error) {
    console.error("❌ Errore GET my reports:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET REPORT BY ID - Dettagli singola segnalazione
export const getReportById = async (req, res) => {
  try {
    const { id_segnalazione } = req.params;
    const id_utente = req.user.id_utente;

    const report = await Report.findByPk(id_segnalazione, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id_utente", "nome", "cognome", "email"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: [
            "id_mezzo",
            "tipo_mezzo",
            "codice_identificativo",
            "stato",
          ],
        },
      ],
    });

    if (!report) {
      return res.status(404).json({ error: "Segnalazione non trovata" });
    }

    // Controlla autorizzazioni
    if (report.id_utente !== id_utente && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Non hai permessi per visualizzare questa segnalazione",
      });
    }

    res.status(200).json({
      message: "Segnalazione recuperata",
      report: report,
    });
  } catch (error) {
    console.error("❌ Errore GET report by id:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET REPORTS BY VEHICLE ID - Segnalazioni di un mezzo
export const getReportsByVehicleId = async (req, res) => {
  try {
    const { id_mezzo } = req.params;

    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    const reports = await Report.findAll({
      where: { id_mezzo },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id_utente", "nome", "cognome"],
        },
      ],
      order: [["data_ora", "DESC"]],
    });

    res.status(200).json({
      message: "Segnalazioni recuperate",
      count: reports.length,
      reports: reports,
    });
  } catch (error) {
    console.error("❌ Errore GET reports by vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET ALL REPORTS - Tutte le segnalazioni (solo admin)
export const getAllReports = async (req, res) => {
  try {
    const { stato_segnalazione, tipo_problema } = req.query;

    const where = {};
    if (stato_segnalazione) where.stato_segnalazione = stato_segnalazione;
    if (tipo_problema) where.tipo_problema = tipo_problema;

    const reports = await Report.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id_utente", "nome", "cognome", "email"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo", "codice_identificativo"],
        },
      ],
      order: [["data_ora", "DESC"]],
    });

    res.status(200).json({
      message: "Tutte le segnalazioni recuperate",
      count: reports.length,
      reports: reports,
    });
  } catch (error) {
    console.error("❌ Errore GET all reports:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// UPDATE REPORT STATUS - Aggiorna stato segnalazione e mezzo (admin)
export const updateReportStatus = async (req, res) => {
  try {
    const { id_segnalazione } = req.params;
    const { stato_segnalazione } = req.body;

    if (!stato_segnalazione) {
      return res
        .status(400)
        .json({ error: "stato_segnalazione è obbligatorio" });
    }

    // Valida stato
    const statiValidi = ["aperta", "in_lavorazione", "risolta"];
    if (!statiValidi.includes(stato_segnalazione)) {
      return res.status(400).json({
        error: `stato_segnalazione non valido. Validi: ${statiValidi.join(
          ", "
        )}`,
      });
    }

    const report = await Report.findByPk(id_segnalazione);
    if (!report) {
      return res.status(404).json({ error: "Segnalazione non trovata" });
    }

    report.stato_segnalazione = stato_segnalazione;
    await report.save();

    // Aggiorna automaticamente lo stato del mezzo
    const vehicle = await Vehicle.findByPk(report.id_mezzo);
    if (vehicle) {
      if (stato_segnalazione === "in_lavorazione") {
        vehicle.stato = "in_manutenzione";
      } else if (stato_segnalazione === "risolta") {
        // Controlla se ci sono altri report non risolti
        const otherActiveReports = await Report.count({
          where: {
            id_mezzo: report.id_mezzo,
            id_segnalazione: {
              [Op.ne]: id_segnalazione, // Esclude il report corrente
            },
            stato_segnalazione: {
              [Op.ne]: "risolta", // Esclude i report risolti
            },
          },
        });

        // Se NON ci sono altri report attivi, mette a disponibile
        if (otherActiveReports === 0) {
          vehicle.stato = "disponibile";
        }
        // Altrimenti rimane in manutenzione
      }
      await vehicle.save();
    }

    res.status(200).json({
      message: "Segnalazione aggiornata con successo",
      id_segnalazione: report.id_segnalazione,
      stato_segnalazione: report.stato_segnalazione,
      vehicle_updated: vehicle
        ? {
            id_mezzo: vehicle.id_mezzo,
            nuovo_stato: vehicle.stato,
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE report status:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// DELETE REPORT - Elimina segnalazione (admin)
export const deleteReport = async (req, res) => {
  try {
    const { id_segnalazione } = req.params;

    const report = await Report.findByPk(id_segnalazione);
    if (!report) {
      return res.status(404).json({ error: "Segnalazione non trovata" });
    }

    await report.destroy();

    res.status(200).json({
      message: "Segnalazione eliminata con successo",
      id_segnalazione: id_segnalazione,
    });
  } catch (error) {
    console.error("❌ Errore DELETE report:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  createReport,
  getMyReports,
  getReportById,
  getReportsByVehicleId,
  getAllReports,
  updateReportStatus,
  deleteReport,
};
