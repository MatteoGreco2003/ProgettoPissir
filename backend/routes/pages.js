import express from "express";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// HOME / LOGIN
router.get("/", (req, res) => {
  const token = req.cookies?.token || null;

  if (token) {
    return res.redirect("/home-utente");
  }

  res.render("auth");
});

// GET /reset-password - Pagina reset password (pubblica)
router.get("/reset-password", (req, res) => {
  res.render("reset-password");
});

// GET /home-utente - Dashboard utente (protetto)
router.get("/home-utente", authMiddleware, (req, res) => {
  res.render("home-utente");
});

// GET /profile - Profilo utente (protetto)
router.get("/profile", authMiddleware, (req, res) => {
  res.render("profile-utente");
});

// GET /ride - Pagina corsa (protetto)
router.get("/ride", authMiddleware, (req, res) => {
  const { ride_id } = req.query;
  res.render("ride", { rideId: ride_id });
});

// GET /credit - Pagina gestione credito (protetto)
router.get("/credit", authMiddleware, (req, res) => {
  res.render("credit");
});

// GET /feedback - Pagina feedback (protetto)
router.get("/feedback", authMiddleware, (req, res) => {
  res.render("feedback");
});

/*
// ✅ CORSA ATTIVA (protetto)
router.get("/active-ride", authMiddleware, (req, res) => {
  res.render("user/active-ride", {
    title: "Corsa Attiva - Mobishare",
    user: req.user,
  });
});

// ✅ DASHBOARD MANAGER (protetto + solo gestori)
router.get("/manager", authMiddleware, (req, res) => {
  // Verifica se è gestore (da implementare in future)
  if (req.user.role !== "manager" && req.user.role !== "admin") {
    return res.status(403).render("404", {
      title: "Accesso Negato",
    });
  }

  res.render("manager/dashboard", {
    title: "Dashboard Manager - Mobishare",
    user: req.user,
    isAdmin: true,
  });
});

// ✅ GESTIONE MEZZI (protetto + solo gestori)
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

// ✅ GESTIONE PARCHEGGI (protetto + solo gestori)
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

// ✅ GESTIONE SEGNALAZIONI (protetto + solo gestori)
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
});*/

export default router;
