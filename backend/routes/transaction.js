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

router.post("/recharge", verifyToken, rechargeCredit);
router.get("/history", verifyToken, getTransactionHistory);
router.get("/balance", verifyToken, getCurrentBalance);
router.get("/summary", verifyToken, getBalanceSummary);
router.get("/:transaction_id", verifyToken, getTransactionById);
router.post("/request-reactivation", verifyToken, requestReactivation);
router.patch(
  "/approve-reactivation/:id_utente",
  verifyToken,
  isAdmin,
  approveReactivation
);

export default router;
