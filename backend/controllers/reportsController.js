// backend/controllers/reportsController.js

import Report from "../models/Report.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

// ✅ CREATE REPORT - Crea una nuova segnalazione
export const createReport = async (req, res) => {
  try {
    const { tipo_problema, id_mezzo, descrizione } = req.body;
    const id_utente = req.user.id_utente;

    // Validazione input
    if (!tipo_problema || !id_mezzo || !descrizione) {
      return res.status(400).json({
        error: "tipo_problema, id_mezzo e descrizione sono obbligatori",
      });
    }

    // Validazione tipo_problema
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

    // Verifica che mezzo esista
    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    // Crea segnalazione
    const report = await Report.create({
      id_utente,
      id_mezzo,
      tipo_problema,
      descrizione,
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

// ✅ GET MY REPORTS - Visualizza le mie segnalazioni
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

// ✅ GET REPORT BY ID - Visualizza dettagli segnalazione
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

    // Verifica che l'utente sia proprietario o admin
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

// ✅ GET ALL REPORTS (ADMIN ONLY) - Visualizza tutte le segnalazioni
export const getAllReports = async (req, res) => {
  try {
    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono visualizzare tutte le segnalazioni",
      });
    }

    const { stato_segnalazione, tipo_problema } = req.query;

    // Costruisci filtri
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

// ✅ UPDATE REPORT STATUS (ADMIN ONLY) - Aggiorna stato segnalazione
export const updateReportStatus = async (req, res) => {
  try {
    const { id_segnalazione } = req.params;
    const { stato_segnalazione } = req.body;

    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono aggiornare lo stato delle segnalazioni",
      });
    }

    if (!stato_segnalazione) {
      return res
        .status(400)
        .json({ error: "stato_segnalazione è obbligatorio" });
    }

    // Validazione stato
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

    // Aggiorna segnalazione
    report.stato_segnalazione = stato_segnalazione;
    await report.save();

    res.status(200).json({
      message: "Segnalazione aggiornata con successo",
      id_segnalazione: report.id_segnalazione,
      stato_segnalazione: report.stato_segnalazione,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE report status:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ DELETE REPORT (ADMIN ONLY) - Elimina segnalazione
export const deleteReport = async (req, res) => {
  try {
    const { id_segnalazione } = req.params;

    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono eliminare segnalazioni",
      });
    }

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
  getAllReports,
  updateReportStatus,
  deleteReport,
};
