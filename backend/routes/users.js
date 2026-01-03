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
  deleteUserAsAdmin,
} from "../controllers/usersController.js";

const router = express.Router();

// Profilo utente corrente (protetto)
router.get("/me", verifyToken, getProfile);

// Modifica profilo (protetto)
router.put("/me", verifyToken, updateProfile);

// Elimina account (protetto)
router.delete("/me", verifyToken, deleteAccount);

// Cambio password (protetto)
router.put("/change-password", verifyToken, changePassword);

//ADMIN ENDPOINTS
// Lista tutti gli utenti (solo admin)
router.get("/admin/all", verifyToken, isAdmin, getAllUsers);

// Utenti in attesa di approvazione (solo admin)
router.get("/admin/pending", verifyToken, isAdmin, getPendingReactivations);

// Dettagli utente specifico (solo admin)
router.get("/admin/:id_utente", verifyToken, isAdmin, getUserById);

// Elimina utente specifico (solo admin)
router.delete("/admin/:id_utente", verifyToken, isAdmin, deleteUserAsAdmin);

export default router;
