// backend/middleware/auth.js

import jwt from "jsonwebtoken";

/**
 * Middleware di autenticazione universale
 * Funziona sia per API REST che per renderizzazione pagine server-side
 *
 * - Legge token da: cookie, Authorization header, o localStorage
 * - Per API REST: ritorna 401 JSON se non autenticato
 * - Per page routes: reindirizza a / se non autenticato
 */
export const verifyToken = (req, res, next) => {
  try {
    // ✅ PRIORITÀ: Leggi token da cookie (per page routes)
    let token = req.cookies?.token;

    // ✅ ALTERNATIVA: Leggi da Authorization header (per API)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(" ");

      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    // ✅ Se nessun token trovato
    if (!token) {
      // Se è una richiesta API, ritorna JSON
      if (
        req.headers.accept?.includes("application/json") ||
        req.path.startsWith("/api/")
      ) {
        return res.status(401).json({ error: "Token mancante" });
      }

      // Se è una page route, reindirizza a login
      return res.redirect("/");
    }

    // ✅ Verifica il token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );

    // ✅ Salva i dati dell'utente nella request
    req.user = decoded;
    next();
  } catch (error) {
    // ✅ Gestisci i diversi tipi di errore
    const isApiRequest =
      req.headers.accept?.includes("application/json") ||
      req.path.startsWith("/api/");

    if (error.name === "TokenExpiredError") {
      if (isApiRequest) {
        return res.status(401).json({ error: "Token scaduto" });
      } else {
        res.clearCookie("token");
        return res.redirect("/");
      }
    }

    // Token invalido o altro errore
    if (isApiRequest) {
      return res.status(401).json({ error: "Token non valido" });
    } else {
      res.clearCookie("token");
      return res.redirect("/");
    }
  }
};

/**
 * Middleware specifico per page routes
 * Reindirizza sempre a login se non autenticato
 */
export const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.redirect("/");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("token");
    res.redirect("/");
  }
};

/**
 * Middleware specifico per API REST
 * Ritorna sempre JSON se non autenticato
 */
export const apiAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token mancante" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res
        .status(401)
        .json({ error: "Formato Authorization non valido" });
    }

    const token = parts[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token scaduto" });
    }
    res.status(401).json({ error: "Token non valido" });
  }
};

/**
 * Middleware per verificare se utente è gestore/admin
 * Usa il campo "role" decodificato dal JWT
 */
export const isManager = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    // Controlla se il ruolo è manager o admin
    if (req.user.role !== "manager" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Accesso negato: solo gestori" });
    }

    next();
  } catch (error) {
    res.status(403).json({ error: "Errore di autorizzazione" });
  }
};

export default verifyToken;
