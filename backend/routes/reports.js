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
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/my-reports", verifyToken, getMyReports);
router.get("/:id_segnalazione", verifyToken, getReportById);
router.post("/", verifyToken, createReport);

// ADMIN ONLY
router.get("/", verifyToken, isAdmin, getAllReports);
router.patch(
  "/:id_segnalazione/status",
  verifyToken,
  isAdmin,
  updateReportStatus
);
router.delete("/:id_segnalazione", verifyToken, isAdmin, deleteReport);

export default router;
