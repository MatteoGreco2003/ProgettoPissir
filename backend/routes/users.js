// backend/routes/users.js

import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getProfile, updateProfile } from "../controllers/usersController.js";

const router = express.Router();

// GET /api/users/me
router.get("/me", verifyToken, getProfile);

// PUT /api/users/me
router.put("/me", verifyToken, updateProfile);

export default router;
