import jwt from "jsonwebtoken";

// Middleware di autenticazione universale
// Funziona sia per API REST che per server-side rendering
// Legge token da: cookie (page routes), Authorization header (API), o localStorage
export const verifyToken = (req, res, next) => {
  try {
    // Priorità: token da cookie (per page routes)
    let token = req.cookies?.token;

    // Alternativa: token da Authorization header (per API)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const parts = authHeader.split(" ");

      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      // Se è API REST, ritorna JSON 401
      if (
        req.headers.accept?.includes("application/json") ||
        req.path.startsWith("/api/")
      ) {
        return res.status(401).json({ error: "Token mancante" });
      }

      // Se è page route, reindirizza a login
      return res.redirect("/");
    }

    // Verifica il token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );

    // Salva dati utente nella request
    req.user = decoded;
    next();
  } catch (error) {
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

    // Token invalido
    if (isApiRequest) {
      return res.status(401).json({ error: "Token non valido" });
    } else {
      res.clearCookie("token");
      return res.redirect("/");
    }
  }
};

// Middleware per page routes
// Reindirizza sempre a "/" se non autenticato
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

    // Disabilita cache per prevenire utilizzo del tasto indietro del browser
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    next();
  } catch (error) {
    res.clearCookie("token");
    res.redirect("/");
  }
};

// Middleware per API REST
// Ritorna sempre JSON 401 se non autenticato
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

// Middleware di autorizzazione
// Verifica se utente è admin (usato dopo apiAuthMiddleware)
export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Accesso negato: solo amministratori" });
    }

    next();
  } catch (error) {
    res.status(403).json({ error: "Errore di autorizzazione" });
  }
};

export default verifyToken;
