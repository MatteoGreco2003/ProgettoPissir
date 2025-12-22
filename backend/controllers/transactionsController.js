import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Ride from "../models/Ride.js";

// ✅ RECHARGE CREDIT
export const rechargeCredit = async (req, res) => {
  try {
    const { importo } = req.body;
    const id_utente = req.user.id_utente;

    const importoNumerico = parseFloat(importo);

    if (isNaN(importoNumerico) || importoNumerico <= 0) {
      return res
        .status(400)
        .json({ error: "Importo deve essere un numero > 0" });
    }

    if (importoNumerico < 1.0) {
      return res.status(400).json({ error: "Importo minimo €1.00" });
    }

    if (importoNumerico > 500) {
      return res.status(400).json({ error: "Importo massimo €500.00" });
    }

    // Trova utente
    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Aggiorna saldo
    const saldoPrecedente = user.saldo;
    const nuovoSaldo = parseFloat(
      (parseFloat(user.saldo) + importoNumerico).toFixed(2)
    );
    user.saldo = nuovoSaldo;

    // ✅ NUOVO: Se era sospeso, passa a "in_attesa_approvazione" (non attivo subito!)
    if (user.stato_account === "sospeso") {
      user.stato_account = "in_attesa_approvazione";
    }

    await user.save();

    // Crea transaction record
    const transaction = await Transaction.create({
      id_utente,
      tipo_transazione: "ricarica",
      importo: importoNumerico,
      descrizione: `Ricarica credito di €${importoNumerico}`,
    });

    res.status(201).json({
      message: "Ricarica completata con successo",
      id_transazione: transaction.id_transazione,
      importo_ricaricato: importoNumerico,
      saldo_precedente: parseFloat(saldoPrecedente),
      saldo_attuale: nuovoSaldo,
      stato_account: user.stato_account,
      avviso:
        user.stato_account === "in_attesa_approvazione"
          ? "Il tuo account è in attesa di approvazione dal gestore per la riapertura"
          : null,
    });
  } catch (error) {
    console.error("❌ Errore RECHARGE credit:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET TRANSACTION HISTORY
export const getTransactionHistory = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;
    const { limit = 20, offset = 0, tipo_transazione } = req.query;

    // Costruisci filtri
    const where = { id_utente };
    if (tipo_transazione) {
      where.tipo_transazione = tipo_transazione;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [["data_ora", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    //  Se è una transazione di pagamento_corsa,
    // recupera i dati dalla ride per mostrare sconto punti
    const transactionsFormatted = await Promise.all(
      rows.map(async (transaction) => {
        if (
          transaction.tipo_transazione === "pagamento_corsa" &&
          transaction.id_corsa
        ) {
          // Recupera la ride per i dati sui punti usati
          const ride = await Ride.findByPk(transaction.id_corsa, {
            attributes: ["punti_fedeltà_usati", "costo"],
          });

          if (ride) {
            return {
              id_transazione: transaction.id_transazione,
              id_utente: transaction.id_utente,
              tipo_transazione: transaction.tipo_transazione,
              id_corsa: transaction.id_corsa,
              data_ora: transaction.data_ora,
              costo_originale: parseFloat(ride.costo).toFixed(2),
              sconto_punti: parseFloat(
                (ride.punti_fedeltà_usati * 0.05).toFixed(2)
              ),
              importo_pagato: parseFloat(
                (ride.costo - ride.punti_fedeltà_usati * 0.05).toFixed(2)
              ),
              punti_fedeltà_usati: ride.punti_fedeltà_usati,
              descrizione: transaction.descrizione,
            };
          }
        }

        // Per altri tipi di transazione, ritorna come prima
        return {
          id_transazione: transaction.id_transazione,
          id_utente: transaction.id_utente,
          tipo_transazione: transaction.tipo_transazione,
          id_corsa: transaction.id_corsa || null,
          data_ora: transaction.data_ora,
          importo: parseFloat(transaction.importo).toFixed(2),
          descrizione: transaction.descrizione,
        };
      })
    );

    res.status(200).json({
      message: "Storico transazioni recuperato",
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      transactions: transactionsFormatted,
    });
  } catch (error) {
    console.error("❌ Errore GET transactions:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET TRANSACTION BY ID
export const getTransactionById = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const id_utente = req.user.id_utente;

    const transaction = await Transaction.findByPk(transaction_id);

    if (!transaction) {
      return res.status(404).json({ error: "Transazione non trovata" });
    }

    // Verifica ownership
    if (transaction.id_utente !== id_utente) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    // ← AGGIUNGI: Se è pagamento_corsa, recupera i dettagli dalla ride
    let transactionFormatted = {
      id_transazione: transaction.id_transazione,
      id_utente: transaction.id_utente,
      tipo_transazione: transaction.tipo_transazione,
      id_corsa: transaction.id_corsa || null,
      data_ora: transaction.data_ora,
      descrizione: transaction.descrizione,
    };

    if (
      transaction.tipo_transazione === "pagamento_corsa" &&
      transaction.id_corsa
    ) {
      const ride = await Ride.findByPk(transaction.id_corsa, {
        attributes: ["punti_fedeltà_usati", "costo"],
      });

      if (ride) {
        transactionFormatted = {
          ...transactionFormatted,
          costo_originale: parseFloat(ride.costo).toFixed(2),
          sconto_punti: parseFloat(
            (ride.punti_fedeltà_usati * 0.05).toFixed(2)
          ),
          importo_pagato: parseFloat(
            (ride.costo - ride.punti_fedeltà_usati * 0.05).toFixed(2)
          ),
          punti_fedeltà_usati: ride.punti_fedeltà_usati,
        };
      }
    } else {
      // Per altri tipi, mostra importo
      transactionFormatted.importo = parseFloat(transaction.importo).toFixed(2);
    }

    res.status(200).json({
      message: "Dettagli transazione",
      transaction: transactionFormatted,
    });
  } catch (error) {
    console.error("❌ Errore GET transaction by ID:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET CURRENT BALANCE
export const getCurrentBalance = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    res.status(200).json({
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      saldo: user.saldo,
      stato_account: user.stato_account,
    });
  } catch (error) {
    console.error("❌ Errore GET balance:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET BALANCE SUMMARY (statistiche)
export const getBalanceSummary = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    // Totale ricariche
    const ricariche = await Transaction.findAll({
      where: {
        id_utente,
        tipo_transazione: "ricarica",
      },
      raw: true,
    });

    // Totale spese
    const spese = await Transaction.findAll({
      where: {
        id_utente,
        tipo_transazione: "pagamento_corsa",
      },
      raw: true,
    });

    const totalRicariche = ricariche.reduce(
      (sum, t) => sum + parseFloat(t.importo),
      0
    );
    const totalSpese = spese.reduce(
      (sum, t) => sum + Math.abs(parseFloat(t.importo)),
      0
    );

    const user = await User.findByPk(id_utente);

    res.status(200).json({
      id_utente,
      nome: user.nome,
      saldo_attuale: parseFloat(user.saldo),
      totale_ricaricato: parseFloat(totalRicariche.toFixed(2)),
      totale_speso: parseFloat(totalSpese.toFixed(2)),
      numero_ricariche: ricariche.length,
      numero_corse: spese.length,
    });
  } catch (error) {
    console.error("❌ Errore GET balance summary:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ REQUEST ACCOUNT REACTIVATION - User richiede riapertura
export const requestReactivation = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    if (
      user.stato_account !== "sospeso" &&
      user.stato_account !== "in_attesa_approvazione"
    ) {
      return res.status(400).json({
        error: "Il tuo account non è sospeso",
      });
    }

    if (user.saldo < 0) {
      return res.status(400).json({
        error: "Ricarica il credito prima di richiedere la riapertura",
        debito_attuale: Math.abs(user.saldo),
      });
    }

    // Cambia stato a "in_attesa_approvazione"
    user.stato_account = "in_attesa_approvazione";
    await user.save();

    res.status(200).json({
      message:
        "Richiesta di riapertura inviata. In attesa di approvazione del gestore",
      saldo_attuale: user.saldo,
      stato_account: user.stato_account,
    });
  } catch (error) {
    console.error("❌ Errore request reactivation:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ APPROVE ACCOUNT REACTIVATION (ADMIN ONLY)
export const approveReactivation = async (req, res) => {
  try {
    const { id_utente } = req.params;

    // Verifica che sia admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Solo gli admin possono approvare le riaperture",
      });
    }

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    if (user.stato_account !== "in_attesa_approvazione") {
      return res.status(400).json({
        error: "L'utente non è in attesa di approvazione",
      });
    }

    // Riattiva account
    user.stato_account = "attivo";
    await user.save();

    res.status(200).json({
      message: "Account riattivato con successo",
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      saldo: user.saldo,
      stato_account: user.stato_account,
    });
  } catch (error) {
    console.error("❌ Errore approve reactivation:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  rechargeCredit,
  getTransactionHistory,
  getTransactionById,
  getCurrentBalance,
  getBalanceSummary,
  requestReactivation,
  approveReactivation,
};
