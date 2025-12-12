// backend/routes/users.js

import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  changePassword,
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

export default router;
