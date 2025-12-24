// backend/routes/feedback.js

import express from "express";
import {
  createFeedback,
  getFeedbackByVehicle,
  getMyFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getAllFeedbacks,
  getVehicleRating,
} from "../controllers/feedbacksController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ✅ Rotte pubbliche (autenticazione richiesta)
router.post("/", verifyToken, createFeedback); // 1️⃣ Crea feedback

router.get("/my-feedback", verifyToken, getMyFeedback); // 2️⃣ Visualizza miei feedback
router.get("/all", verifyToken, getAllFeedbacks);

router.get("/vehicle/:id_mezzo", verifyToken, getFeedbackByVehicle); // 3️⃣ Feedback di un mezzo
router.get("/vehicle/:id_mezzo/rating", verifyToken, getVehicleRating);
router.get("/:id_feedback", verifyToken, getFeedbackById); // 4️⃣ Dettagli feedback

router.patch("/:id_feedback", verifyToken, updateFeedback); // 5️⃣ Modifica feedback
router.delete("/:id_feedback", verifyToken, deleteFeedback); // 6️⃣ Elimina feedback

export default router;
