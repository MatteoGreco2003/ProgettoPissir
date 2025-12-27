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

// FEEDBACK CREATION - Solo utenti loggati
router.post("/", verifyToken, createFeedback);
// MY FEEDBACK - Solo miei feedback (già verificato nel controller)
router.get("/my-feedback", verifyToken, getMyFeedback);
// COMMUNITY FEEDBACK - Tutti i feedback
router.get("/all", verifyToken, getAllFeedbacks);
// VEHICLE RATING - Pubblico (ma verifichiamo il mezzo esista)
router.get("/vehicle/:id_mezzo/rating", getVehicleRating);
// FEEDBACK BY VEHICLE - Pubblico (leggi feedback di un mezzo)
router.get("/vehicle/:id_mezzo", getFeedbackByVehicle);
// FEEDBACK BY ID - Pubblico (leggi dettagli)
router.get("/:id_feedback", getFeedbackById);
// UPDATE - Solo utenti loggati (controller già verifica ownership)
router.patch("/:id_feedback", verifyToken, updateFeedback);
// DELETE - Solo utenti loggati (controller già verifica ownership)
router.delete("/:id_feedback", verifyToken, deleteFeedback);

export default router;
