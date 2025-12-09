import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ REGISTER - Logica di registrazione
export const register = async (req, res) => {
  try {
    const { nome, cognome, email, password } = req.body;

    // Validazione input
    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "La password deve avere almeno 8 caratteri" });
    }

    // Controlla email duplicata
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email già registrata" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crea utente
    const user = await User.create({
      email,
      nome,
      cognome,
      password_hash: passwordHash,
      saldo: 0.0,
      stato_account: "attivo",
    });

    res.status(201).json({
      message: "Registrazione completata con successo",
      user_id: user.id_utente,
      email: user.email,
    });
  } catch (error) {
    console.error("❌ Errore registrazione:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ LOGIN - Logica di login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validazione
    if (!email || !password) {
      return res.status(400).json({ error: "Email e password obbligatori" });
    }

    // Trova utente
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Controlla account sospeso
    if (user.stato_account === "sospeso") {
      return res.status(403).json({ error: "Account sospeso" });
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Genera JWT
    const token = jwt.sign(
      {
        id_utente: user.id_utente,
        email: user.email,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "24h" }
    );

    // Determina il tipo di utente basandosi su email
    const isAdmin = email === "admin@gmail.com";

    res.status(200).json({
      message: "Login completato",
      access_token: token,
      token_type: "Bearer",
      user: {
        id_utente: user.id_utente,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        saldo: user.saldo,
        stato_account: user.stato_account,
        isAdmin: isAdmin,
      },
    });
  } catch (error) {
    console.error("❌ Errore login:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
