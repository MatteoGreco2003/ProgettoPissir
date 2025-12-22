// backend/routes/statistics.js

import express from "express";
import {
  getParkingStatistics,
  getVehicleStatistics,
  getOverviewStatistics,
  getSuspendedUsersWithReliability,
  getParkingUsageStatistics,
} from "../controllers/statisticsController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Tutte le routes richiedono autenticazione e ruolo admin
router.get("/parking", verifyToken, isAdmin, getParkingStatistics);
router.get("/vehicles", verifyToken, isAdmin, getVehicleStatistics);
router.get("/overview", verifyToken, isAdmin, getOverviewStatistics);
router.get(
  "/suspended-users",
  verifyToken,
  isAdmin,
  getSuspendedUsersWithReliability
);
router.get("/parking-usage", verifyToken, isAdmin, getParkingUsageStatistics);
export default router;
