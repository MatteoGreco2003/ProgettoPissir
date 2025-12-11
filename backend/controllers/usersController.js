// backend/controllers/usersController.js

import User from "../models/User.js";
import Ride from "../models/Ride.js";

// GET /users/me
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

// PUT /users/me
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

// DELETE /users/me
export const deleteAccount = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    // Controlla se ha corse attive
    const activeRide = await Ride.findOne({
      where: {
        id_utente,
        stato_corsa: "in_corso",
      },
    });

    if (activeRide) {
      return res.status(400).json({
        error: "Non puoi eliminare il tuo account mentre hai una corsa attiva",
      });
    }

    // Elimina l'utente
    const user = await User.findByPk(id_utente);
    await user.destroy();

    //Pulisci il cookie del token
    res.clearCookie("token");

    res.status(200).json({
      message: "Account eliminato con successo",
    });
  } catch (error) {
    console.error("❌ Errore DELETE account:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
