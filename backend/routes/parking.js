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

// Recupera tutti i parcheggi
router.get("/data", getAllParkings);

// Disponibilità mezzo in parcheggio
router.get("/:id/availability", getParkingAvailability);

// Dettagli parcheggio singolo
router.get("/:id", getParkingById);

// Crea parcheggio (solo admin)
router.post("/", verifyToken, isAdmin, createParking);

// Modifica parcheggio (solo admin)
router.put("/:id", verifyToken, isAdmin, updateParking);

// Elimina parcheggio (solo admin)
router.delete("/:id", verifyToken, isAdmin, deleteParking);

export default router;
