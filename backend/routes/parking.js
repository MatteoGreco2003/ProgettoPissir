import express from "express";
import {
  getAllParkings,
  getParkingById,
  createParking,
  updateParking,
  deleteParking,
  getParkingAvailability,
} from "../controllers/parkingController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/data", getAllParkings);
router.get("/:id/availability", getParkingAvailability);
router.get("/:id", getParkingById);
router.post("/", verifyToken, isAdmin, createParking);
router.put("/:id", verifyToken, isAdmin, updateParking);
router.delete("/:id", verifyToken, isAdmin, deleteParking);

export default router;
