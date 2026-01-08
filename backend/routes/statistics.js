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

// Statistiche disponibilità parcheggi (solo admin)
router.get("/parking", verifyToken, isAdmin, getParkingStatistics);

// Statistiche veicoli e performance (solo admin)
router.get("/vehicles", verifyToken, isAdmin, getVehicleStatistics);

// Riepilogo generale sistema (solo admin)
router.get("/overview", verifyToken, isAdmin, getOverviewStatistics);

// Utenti sospesi con valutazione affidabilità (solo admin)
router.get(
  "/suspended-users",
  verifyToken,
  isAdmin,
  getSuspendedUsersWithReliability
);

// Statistiche utilizzo parcheggi (solo admin)
router.get("/parking-usage", verifyToken, isAdmin, getParkingUsageStatistics);

export default router;
