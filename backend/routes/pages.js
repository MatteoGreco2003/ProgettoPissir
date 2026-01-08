import express from "express";
import authMiddleware from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Home o Login - Reindirizza a home se già autenticato
router.get("/", (req, res) => {
  const token = req.cookies?.token || null;

  if (token) {
    // Decodifica il token per leggere il ruolo
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_secret_key"
      );

      // Se è admin, reindirizza a home-admin
      if (decoded.role === "admin" || decoded.role === "manager") {
        return res.redirect("/home-admin");
      }

      // Altrimenti reindirizza a home-utente
      return res.redirect("/home-utente");
    } catch (error) {
      res.clearCookie("token");
      return res.render("auth");
    }
  }

  res.render("auth");
});

// Pagina di reset password
router.get("/reset-password", (req, res) => {
  res.render("reset-password");
});

// Home utente (protetto)
router.get("/home-utente", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("home-utente");
});

// Profilo utente (protetto)
router.get("/profile", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("profile-utente", { user: req.user });
});

// Gestione credito (protetto)
router.get("/credit", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("credit");
});

// Feedback (protetto)
router.get("/feedback", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("feedback");
});

// Pagina corsa utente (protetto)
router.get("/ride", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const { ride_id } = req.query;
  res.render("ride", { rideId: ride_id });
});

// Home admin (protetto)
router.get("/home-admin", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("admin-dashboard");
});

// Profilo admin (protetto) --> Stessa pagina del profilo utente

// Gestione utenti (protetto)
router.get("/gestione-utenti", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("gestione-utenti");
});

// Gestione mezzi (protetto)
router.get("/gestione-mezzi", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("gestione-mezzi");
});

// Gestione parcheggi (protetto)
router.get("/gestione-parcheggi", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("gestione-parcheggi");
});

// Gestione corse (protetto)
router.get("/gestione-corse", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("gestione-corse");
});

// Gestione segnalazioni (protetto)
router.get("/gestione-segnalazioni", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("gestione-segnalazioni");
});

export default router;
