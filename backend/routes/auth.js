import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET auth/logout
router.get("/logout", logout);

// POST /auth/forgot-password - Richiedi reset password
router.post("/forgot-password", forgotPassword);

// POST /auth/reset-password - Reimposta password
router.post("/reset-password", resetPassword);

export default router;
