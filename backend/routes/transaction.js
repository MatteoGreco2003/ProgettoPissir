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

// Route generiche (meno specifiche)
// Ricarica credito (protetto)
router.post("/recharge", verifyToken, rechargeCredit);

// Storico transazioni (protetto)
router.get("/history", verifyToken, getTransactionHistory);

// Saldo attuale (protetto)
router.get("/balance", verifyToken, getCurrentBalance);

// Riepilogo spese e ricariche (protetto)
router.get("/summary", verifyToken, getBalanceSummary);

// Route parametrizzate (specifiche) prima di quelle generiche
// Dettagli transazione singola (protetto)
router.get("/:transaction_id", verifyToken, getTransactionById);

// Richiesta riapertura account (protetto)
router.post("/request-reactivation", verifyToken, requestReactivation);

// Approva riapertura account (solo admin)
router.patch(
  "/approve-reactivation/:id_utente",
  verifyToken,
  isAdmin,
  approveReactivation
);

export default router;
