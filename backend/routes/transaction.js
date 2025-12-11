import express from "express";
import {
  rechargeCredit,
  getTransactionHistory,
  getTransactionById,
  getCurrentBalance,
  getBalanceSummary,
} from "../controllers/transactionsController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/recharge", verifyToken, rechargeCredit);
router.get("/history", verifyToken, getTransactionHistory);
router.get("/balance", verifyToken, getCurrentBalance);
router.get("/summary", verifyToken, getBalanceSummary);
router.get("/:transaction_id", verifyToken, getTransactionById);

export default router;
