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

// Avvia corsa utente
router.post("/start", verifyToken, startRide);

// Statistiche corse utente
router.get("/statistics", verifyToken, getUserRideStatistics);

// Corsa attiva dell'utente
router.get("/active", verifyToken, getActiveRide);

// Storico corse utente
router.get("/history", verifyToken, getRideHistory);

// Corse di oggi (solo admin)
router.get("/today", verifyToken, isAdmin, getRidesToday);

// Tutte le corse completate (solo admin)
router.get("/all-completed", verifyToken, isAdmin, getAllCompletedRides);

// Verifica se saldo sufficiente per la corsa
router.get("/:ride_id/check-payment", verifyToken, checkPayment);

// Dettagli corsa singola
router.get("/:ride_id", verifyToken, getRideById);

// Termina corsa con pagamento
router.post("/:ride_id/end-with-payment", verifyToken, endRideWithPayment);

// Termina corsa con debito
router.post("/:ride_id/end-with-debt", verifyToken, endRideWithDebt);

// Annulla corsa
router.post("/:ride_id/cancel", verifyToken, cancelRide);

export default router;
