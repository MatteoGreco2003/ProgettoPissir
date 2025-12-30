import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Registrazione utente
router.post("/register", register);

// Login utente
router.post("/login", login);

// Richiesta reset password
router.post("/forgot-password", forgotPassword);

// Reimposta password con token
router.post("/reset-password", resetPassword);

// Logout (richiede autenticazione)
router.get("/logout", verifyToken, logout);

export default router;
