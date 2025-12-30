import express from "express";
import {
  startRide,
  checkPayment,
  endRideWithPayment,
  endRideWithDebt,
  getActiveRide,
  getRideHistory,
  getRideById,
  cancelRide,
  getUserRideStatistics,
  getRidesToday,
  getAllCompletedRides,
} from "../controllers/ridesController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Route generiche (meno specifiche)
// Avvia corsa (protetto)
router.post("/start", verifyToken, startRide);

// Statistiche corse utente (protetto)
router.get("/statistics", verifyToken, getUserRideStatistics);

// Corsa attiva (protetto)
router.get("/active", verifyToken, getActiveRide);

// Storico corse (protetto)
router.get("/history", verifyToken, getRideHistory);

// Corse di oggi (solo admin)
router.get("/today", verifyToken, isAdmin, getRidesToday);

// Tutte le corse completate (solo admin)
router.get("/all-completed", verifyToken, isAdmin, getAllCompletedRides);

// Route parametrizzate (specifiche) prima di quelle generiche
// Verifica pagamento (protetto)
router.get("/:ride_id/check-payment", verifyToken, checkPayment);

// Dettagli corsa singola (protetto)
router.get("/:ride_id", verifyToken, getRideById);

// Termina corsa con pagamento (protetto)
router.post("/:ride_id/end-with-payment", verifyToken, endRideWithPayment);

// Termina corsa con debito (protetto)
router.post("/:ride_id/end-with-debt", verifyToken, endRideWithDebt);

// Annulla corsa (protetto)
router.post("/:ride_id/cancel", verifyToken, cancelRide);

export default router;
