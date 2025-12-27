// backend/routes/users.js

import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  changePassword,
  getAllUsers,
  getPendingReactivations,
  getUserById,
} from "../controllers/usersController.js";

const router = express.Router();

// GET /users/me
router.get("/me", verifyToken, getProfile);
// PUT /users/me
router.put("/me", verifyToken, updateProfile);
// DELETE /users/me
router.delete("/me", verifyToken, deleteAccount);
// PUT /users/change-password
router.put("/change-password", verifyToken, changePassword);

// ADMIN ENDPOINTS
router.get("/admin/all", verifyToken, isAdmin, getAllUsers); // Lista tutti gli utenti
router.get("/admin/pending", verifyToken, isAdmin, getPendingReactivations); // Utenti sospesi
router.get("/admin/:id_utente", verifyToken, isAdmin, getUserById); // Dettagli utente
export default router;
