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

// POST /api/auth/register
router.post("/register", register);
// POST /api/auth/login
router.post("/login", login);
// POST /auth/forgot-password - Richiedi reset password
router.post("/forgot-password", forgotPassword);
// POST /auth/reset-password - Reimposta password
router.post("/reset-password", resetPassword);
// GET auth/logout
router.get("/logout", verifyToken, logout);

export default router;
