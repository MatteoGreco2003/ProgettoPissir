import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Ride from "../models/Ride.js";

// GET PROFILE - Profilo utente corrente
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
      ruolo: user.role,
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

// UPDATE PROFILE - Modifica nome e cognome utente
export const updateProfile = async (req, res) => {
  try {
    const { nome, cognome } = req.body;

    const user = await User.findByPk(req.user.id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

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

// DELETE ACCOUNT - Elimina account utente
export const deleteAccount = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const activeRide = await Ride.findOne({
      where: {
        id_utente,
        stato_corsa: ["in_corso", "sospesa_batteria_esaurita"],
      },
    });
    if (activeRide) {
      return res.status(400).json({
        error: "Non puoi eliminare il tuo account mentre hai una corsa attiva",
      });
    }

    const user = await User.findByPk(id_utente);
    await user.destroy();

    res.clearCookie("token");

    res.status(200).json({
      message: "Account eliminato con successo",
    });
  } catch (error) {
    console.error("❌ Errore DELETE account:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// CHANGE PASSWORD - Cambio password utente
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

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Password attuale non corretta" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password_hash = hashedPassword;
    await user.save();

    res.json({ message: "Password modificata con successo" });
  } catch (error) {
    console.error("❌ Errore:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET ALL USERS - Visualizza tutti gli utenti (utente admin)
export const getAllUsers = async (req, res) => {
  try {
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
      order: [["data_registrazione", "DESC"]],
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

// GET PENDING REACTIVATIONS - Visualizza gli utenti in attesa di approvazione (utente admin)
export const getPendingReactivations = async (req, res) => {
  try {
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
      order: [["data_sospensione", "DESC"]],
    });

    // Calcolo debito minimo
    const usersWithMinAmount = pendingUsers.map((user) => {
      const debito = Math.abs(user.saldo);
      const importoMinimoPrimaCorsa = 1.0;
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

// GET USER BY ID - Dettagli singolo utente (utente admin)
export const getUserById = async (req, res) => {
  try {
    const { id_utente } = req.params;

    const user = await User.findByPk(id_utente, {
      attributes: [
        "id_utente",
        "nome",
        "cognome",
        "email",
        "saldo",
        "punti",
        "stato_account",
        "data_registrazione",
        "data_sospensione",
        "data_riapertura",
        "numero_sospensioni",
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Mostra l'importo minimo da ricaricare se ha debito
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

// DELETE USER AS ADMIN - Elimina account di un utente (utente admin)
export const deleteUserAsAdmin = async (req, res) => {
  try {
    const { id_utente } = req.params;
    const adminId = req.user.id_utente;

    if (!id_utente) {
      return res.status(400).json({ error: "ID utente non fornito" });
    }

    const userIdToDelete = parseInt(id_utente);
    const currentAdminId = parseInt(adminId);

    // Non lasciar eliminare l'admin stesso
    if (userIdToDelete === currentAdminId) {
      return res.status(403).json({
        error: "Non puoi eliminare il tuo account",
      });
    }

    // Verifica che sia davvero un admin a fare la richiesta
    const requestingUser = await User.findByPk(currentAdminId);
    if (!requestingUser || requestingUser.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono eliminare utenti",
      });
    }

    const user = await User.findByPk(userIdToDelete);
    if (!user) {
      return res.status(404).json({
        error: "Utente non trovato",
      });
    }

    // Protegge l'admin principale - Non permette di eliminare admin
    if (
      userIdToDelete.role === "admin" ||
      userIdToDelete.email === "admin@gmail.com"
    ) {
      return res.status(403).json({
        error: "Non puoi eliminare un account amministratore",
      });
    }

    const activeRide = await Ride.findOne({
      where: {
        id_utente: userIdToDelete,
        stato_corsa: ["in_corso", "sospesa_batteria_esaurita"],
      },
    });
    if (activeRide) {
      return res.status(400).json({
        error:
          "Non puoi eliminare l'account di un utente che ha una corsa attiva",
      });
    }

    await user.destroy();

    res.status(200).json({
      message: "Utente eliminato con successo",
      deleted_user: {
        id_utente: user.id_utente,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Errore DELETE utente:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
