import express from "express";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ✅ HOME / LOGIN
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

// ✅ DASHBOARD UTENTE (protetto)
router.get("/home-utente", authMiddleware, (req, res) => {
  res.render("home-utente");
});

// ✅ PROFILO UTENTE (protetto)
router.get("/profile", authMiddleware, (req, res) => {
  res.render("user/profile", {
    title: "Profilo - Mobishare",
    user: req.user,
  });
});

// ✅ STORICO CORSE (protetto)
router.get("/rides-history", authMiddleware, (req, res) => {
  res.render("user/rides-history", {
    title: "Storico Corse - Mobishare",
    user: req.user,
  });
});

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
    isManager: true,
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
});

export default router;
