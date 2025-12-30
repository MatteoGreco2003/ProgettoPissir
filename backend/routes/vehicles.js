import express from "express";
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByParking,
  rechargeVehicleBattery,
} from "../controllers/vehiclesController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Route generiche (meno specifiche)
// Lista tutti i mezzi
router.get("/data", getAllVehicles);

// Dettagli mezzo singolo
router.get("/:id", getVehicleById);

// Mezzi in parcheggio specifico
router.get("/parking/:id_parcheggio", getVehiclesByParking);

// Crea mezzo (solo admin)
router.post("/", verifyToken, isAdmin, createVehicle);

// Modifica mezzo (solo admin)
router.put("/:id", verifyToken, isAdmin, updateVehicle);

// Elimina mezzo (solo admin)
router.delete("/:id", verifyToken, isAdmin, deleteVehicle);

// Route parametrizzate (specifiche) prima di quelle generiche
// Ricarica batteria (solo admin)
router.post(
  "/:id/recharge-battery",
  verifyToken,
  isAdmin,
  rechargeVehicleBattery
);

export default router;
