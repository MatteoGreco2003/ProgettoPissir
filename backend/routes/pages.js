import express from "express";
import authMiddleware from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Home / Login - Reindirizza a dashboard se già autenticato
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
      // Token invalido, mostra login
      res.clearCookie("token");
      return res.render("auth");
    }
  }

  res.render("auth");
});

// Reset password - Pagina pubblica
router.get("/reset-password", (req, res) => {
  res.render("reset-password");
});

// Dashboard utente (protetto)
router.get("/home-utente", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("home-utente");
});

// Profilo utente (protetto)
router.get("/profile", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.render("profile-utente", { user: req.user });
});

// Pagina corsa (protetto)
router.get("/ride", authMiddleware, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const { ride_id } = req.query;
  res.render("ride", { rideId: ride_id });
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

// Dashboard admin (protetto)
router.get("/home-admin", authMiddleware, (req, res) => {
  res.render("admin-dashboard");
});

// Gestione utenti (protetto)
router.get("/gestione-utenti", authMiddleware, (req, res) => {
  res.render("gestione-utenti");
});

// Gestione mezzi (protetto)
router.get("/gestione-mezzi", authMiddleware, (req, res) => {
  res.render("gestione-mezzi");
});

// Gestione parcheggi (protetto)
router.get("/gestione-parcheggi", authMiddleware, (req, res) => {
  res.render("gestione-parcheggi");
});

// Gestione corse (protetto)
router.get("/gestione-corse", authMiddleware, (req, res) => {
  res.render("gestione-corse");
});

// Gestione segnalazioni (protetto)
router.get("/gestione-segnalazioni", authMiddleware, (req, res) => {
  res.render("gestione-segnalazioni");
});

/*
// Gestione mezzi (protetto + solo gestori)
router.get("/manager/vehicles", authMiddleware, (req, res) => {
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    return res.status(403).render("404", {
      title: "Accesso Negato",
    });
  }

  res.render("manager/vehicles", {
    title: "Gestione Mezzi - Mobishare",
    user: req.user,
  });
});

// Gestione parcheggi (protetto + solo gestori)
router.get("/manager/parkings", authMiddleware, (req, res) => {
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    return res.status(403).render("404", {
      title: "Accesso Negato",
    });
  }

  res.render("manager/parkings", {
    title: "Gestione Parcheggi - Mobishare",
    user: req.user,
  });
});

// Gestione segnalazioni (protetto + solo gestori)
router.get("/manager/reports", authMiddleware, (req, res) => {
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    return res.status(403).render("404", {
      title: "Accesso Negato",
    });
  }

  res.render("manager/reports", {
    title: "Segnalazioni - Mobishare",
    user: req.user,
  });
});
*/

export default router;
