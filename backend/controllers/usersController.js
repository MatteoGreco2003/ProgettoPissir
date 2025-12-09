// backend/controllers/usersController.js

import User from "../models/User.js";

// GET /api/users/me
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id_utente);

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    res.json({
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      saldo: user.saldo,
      stato_account: user.stato_account,
    });
  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// PUT /api/users/me
export const updateProfile = async (req, res) => {
  try {
    const { nome, cognome } = req.body;

    const user = await User.findByPk(req.user.id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Aggiorna solo se forniti
    if (nome) user.nome = nome;
    if (cognome) user.cognome = cognome;

    await user.save();

    res.json({
      message: "Profilo aggiornato",
      user: {
        id_utente: user.id_utente,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
