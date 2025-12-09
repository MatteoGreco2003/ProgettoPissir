// backend/middleware/auth.js

import jwt from "jsonwebtoken";

// Middleware che verifica il JWT token
export const verifyToken = (req, res, next) => {
  try {
    // ✅ Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token mancante" });
    }

    // ✅ Il formato è "Bearer TOKEN"
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token non valido" });
    }

    // ✅ Verifica il token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );
    req.user = decoded; // Salva i dati dell'utente per usarli nelle route
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token scaduto" });
    }
    res.status(401).json({ error: "Token non valido" });
  }
};
