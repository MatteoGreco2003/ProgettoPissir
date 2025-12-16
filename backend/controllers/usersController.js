// backend/controllers/usersController.js

import bcrypt from "bcryptjs";
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
      data_registrazione: user.data_registrazione,
      punti: user.punti || 0,
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

// PUT /users/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Fornisci password attuale e nuova" });
    }

    const user = await User.findByPk(req.user.id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Verifica password attuale
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Password attuale non corretta" });
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password_hash = hashedPassword;
    await user.save();

    res.json({ message: "Password modificata con successo" });
  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET ALL USERS (ADMIN ONLY) - Visualizza tutti gli utenti
export const getAllUsers = async (req, res) => {
  try {
    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono visualizzare la lista utenti",
      });
    }

    // Recupera tutti gli utenti, escludendo le password
    const users = await User.findAll({
      attributes: [
        "id_utente",
        "nome",
        "cognome",
        "email",
        "saldo",
        "stato_account",
        "data_registrazione",
        "data_sospensione",
        "data_riapertura",
      ],
      order: [["data_registrazione", "DESC"]], // Ordina per data iscrizione decrescente
    });

    res.status(200).json({
      success: true,
      total_users: users.length,
      users: users,
    });
  } catch (error) {
    console.error("❌ Errore getAllUsers:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET USERS PENDING REACTIVATION (ADMIN ONLY) - Filtra solo sospesi
export const getPendingReactivations = async (req, res) => {
  try {
    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono visualizzare le richieste di riapertura",
      });
    }

    // Recupera utenti in attesa di approvazione o sospesi
    const pendingUsers = await User.findAll({
      where: {
        stato_account: ["in_attesa_approvazione"],
      },
      attributes: [
        "id_utente",
        "nome",
        "cognome",
        "email",
        "saldo",
        "stato_account",
        "data_sospensione",
      ],
      order: [["data_sospensione", "DESC"]], // Ordina da più recente
    });

    // Arricchisci con info sul debito minimo necessario
    const usersWithMinAmount = pendingUsers.map((user) => {
      const debito = Math.abs(user.saldo);
      const importoMinimoPrimaCorsa = 1.0; // costo prima 30 minuti
      const importoMinimoRicarica = debito + importoMinimoPrimaCorsa;

      return {
        id_utente: user.id_utente,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        saldo_attuale: user.saldo,
        stato_account: user.stato_account,
        data_sospensione: user.data_sospensione,
        debito: debito > 0 ? debito : 0,
        importo_minimo_ricarica: importoMinimoRicarica,
        pronto_per_approvazione: user.saldo >= importoMinimoRicarica,
      };
    });

    res.status(200).json({
      success: true,
      total_pending: usersWithMinAmount.length,
      pending_users: usersWithMinAmount,
    });
  } catch (error) {
    console.error("❌ Errore getPendingReactivations:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET USER BY ID (ADMIN ONLY) - Dettagli utente per admin
export const getUserById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono visualizzare dettagli utenti",
      });
    }

    const { id_utente } = req.params;

    const user = await User.findByPk(id_utente, {
      attributes: [
        "id_utente",
        "nome",
        "cognome",
        "email",
        "saldo",
        "stato_account",
        "data_registrazione",
        "data_sospensione",
        "data_riapertura",
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Se sospeso, mostra anche il debito
    let debito = null;
    let importoMinimoRicarica = null;
    if (user.saldo < 0) {
      debito = Math.abs(user.saldo);
      importoMinimoRicarica = debito + 1.0;
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        debito: debito,
        importo_minimo_ricarica: importoMinimoRicarica,
      },
    });
  } catch (error) {
    console.error("❌ Errore getUserById:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
