// backend/routes/reports.js

import express from "express";
import {
  createReport,
  getMyReports,
  getReportById,
  getAllReports,
  updateReportStatus,
  deleteReport,
} from "../controllers/reportsController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ✅ Rotte pubbliche (autenticazione richiesta)
router.post("/", verifyToken, createReport); // 1️⃣ Crea segnalazione
router.get("/my-reports", verifyToken, getMyReports); // 2️⃣ Visualizza mie segnalazioni
router.get("/:id_segnalazione", verifyToken, getReportById); // 3️⃣ Visualizza dettagli segnalazione

// ✅ Rotte admin
router.get("/admin/all-reports", verifyToken, getAllReports); // 4️⃣ Visualizza tutte (admin only)
router.patch("/:id_segnalazione/status", verifyToken, updateReportStatus); // 5️⃣ Aggiorna stato (admin only)
router.delete("/:id_segnalazione", verifyToken, deleteReport); // 6️⃣ Elimina segnalazione (admin only)

export default router;
