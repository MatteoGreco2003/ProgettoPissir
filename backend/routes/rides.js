import express from "express";
import {
  startRide,
  checkPayment, // 🆕
  endRideWithPayment, // 🆕
  endRideWithDebt, // 🆕
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

router.post("/start", verifyToken, startRide);
router.get("/statistics", verifyToken, getUserRideStatistics);
router.get("/active", verifyToken, getActiveRide);
router.get("/history", verifyToken, getRideHistory);
router.get("/today", verifyToken, isAdmin, getRidesToday);
router.get("/all-completed", verifyToken, isAdmin, getAllCompletedRides);
router.get("/:ride_id/check-payment", verifyToken, checkPayment);
router.get("/:ride_id", verifyToken, getRideById);
router.post("/:ride_id/end-with-payment", verifyToken, endRideWithPayment);
router.post("/:ride_id/end-with-debt", verifyToken, endRideWithDebt);
router.post("/:ride_id/cancel", verifyToken, cancelRide);

export default router;
