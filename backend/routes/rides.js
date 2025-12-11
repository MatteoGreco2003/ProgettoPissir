import express from "express";
import {
  startRide,
  endRide,
  getActiveRide,
  getRideHistory,
  getRideById,
  cancelRide,
} from "../controllers/ridesController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/start", verifyToken, startRide);
router.post("/:ride_id/end", verifyToken, endRide);
router.get("/active", verifyToken, getActiveRide);
router.get("/history", verifyToken, getRideHistory);
router.get("/:ride_id", verifyToken, getRideById);
router.post("/:ride_id/cancel", verifyToken, cancelRide);

export default router;
