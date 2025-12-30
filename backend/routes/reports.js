// backend/routes/reports.js

import express from "express";
import {
  createReport,
  getMyReports,
  getReportById,
  getAllReports,
  updateReportStatus,
  deleteReport,
  getReportsByVehicleId,
} from "../controllers/reportsController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// I miei report
router.get("/my-reports", verifyToken, getMyReports);

// Report per mezzo specifico
router.get("/by-vehicle/:id_mezzo", getReportsByVehicleId);

// Dettagli report singolo (protetto)
router.get("/:id_segnalazione", verifyToken, getReportById);

// Crea report (protetto)
router.post("/", verifyToken, createReport);

// Tutti i report (solo admin)
router.get("/", verifyToken, isAdmin, getAllReports);

// Aggiorna stato report (solo admin)
router.patch(
  "/:id_segnalazione/status",
  verifyToken,
  isAdmin,
  updateReportStatus
);

// Elimina report (solo admin)
router.delete("/:id_segnalazione", verifyToken, isAdmin, deleteReport);

export default router;
