import express from "express";
import {
  rechargeCredit,
  getTransactionHistory,
  getTransactionById,
  getCurrentBalance,
  getBalanceSummary,
  requestReactivation,
  approveReactivation,
} from "../controllers/transactionsController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Ricarica credito utente
router.post("/recharge", verifyToken, rechargeCredit);

// Storico transazioni utente
router.get("/history", verifyToken, getTransactionHistory);

// Saldo attuale utente
router.get("/balance", verifyToken, getCurrentBalance);

// Riepilogo spese e ricariche utente
router.get("/summary", verifyToken, getBalanceSummary);

// Dettagli transazione singola
router.get("/:transaction_id", verifyToken, getTransactionById);

// Richiesta riapertura account (utente sospeso)
router.post("/request-reactivation", verifyToken, requestReactivation);

// Approva riapertura account (solo admin)
router.patch(
  "/approve-reactivation/:id_utente",
  verifyToken,
  isAdmin,
  approveReactivation
);

export default router;
