import express from "express";
import {
  getAllParkings,
  getParkingById,
  createParking,
  updateParking,
  deleteParking,
  getParkingAvailability,
} from "../controllers/parkingController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/data", getAllParkings);
router.get("/:id", getParkingById);
router.get("/:id/availability", getParkingAvailability);
router.post("/", verifyToken, createParking); // admin/gestore
router.put("/:id", verifyToken, updateParking); // admin/gestore
router.delete("/:id", verifyToken, deleteParking); // admin/gestore

export default router;
