import express from "express";
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateBatteryFromMQTT,
  getVehiclesByParking,
  rechargeVehicleBattery,
} from "../controllers/vehiclesController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/data", getAllVehicles);
router.get("/:id", getVehicleById);
router.get("/parking/:id_parcheggio", getVehiclesByParking);
router.post("/", verifyToken, createVehicle); // admin/gestore
router.put("/:id", verifyToken, updateVehicle); // admin/gestore
router.delete("/:id", verifyToken, deleteVehicle); // admin/gestore
router.post("/mqtt/battery", updateBatteryFromMQTT); // from IoT
router.post(
  "/:id/recharge-battery",
  verifyToken,
  isAdmin,
  rechargeVehicleBattery
); // admin/gestore

export default router;
