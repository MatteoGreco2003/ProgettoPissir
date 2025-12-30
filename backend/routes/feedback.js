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
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Crea feedback (solo utenti loggati)
router.post("/", verifyToken, createFeedback);

// Recupera i miei feedback
router.get("/my-feedback", verifyToken, getMyFeedback);

// Recupera tutti i feedback
router.get("/all", verifyToken, getAllFeedbacks);

// Valutazione media mezzo
router.get("/vehicle/:id_mezzo/rating", getVehicleRating);

// Feedback di un mezzo specifico
router.get("/vehicle/:id_mezzo", getFeedbackByVehicle);

// Dettagli feedback singolo
router.get("/:id_feedback", getFeedbackById);

// Modifica feedback (solo autore)
router.patch("/:id_feedback", verifyToken, updateFeedback);

// Elimina feedback (solo autore)
router.delete("/:id_feedback", verifyToken, deleteFeedback);

export default router;
