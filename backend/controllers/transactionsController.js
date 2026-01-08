import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Ride from "../models/Ride.js";

// RECHARGE CREDIT - Ricarica credito account utente
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

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const saldoPrecedente = user.saldo;
    const nuovoSaldo = parseFloat(
      (parseFloat(user.saldo) + importoNumerico).toFixed(2)
    );
    user.saldo = nuovoSaldo;

    if (nuovoSaldo > 0 && user.stato_account === "sospeso")
      user.stato_account = "in_attesa_approvazione";

    await user.save();

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

// GET TRANSACTION HISTORY - Storico transazioni dell'utente (con paginazione)
export const getTransactionHistory = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;
    const { limit = 20, offset = 0, tipo_transazione } = req.query;

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

    // Per transazioni di pagamento corsa, recupera i dettagli della ride
    const transactionsFormatted = await Promise.all(
      rows.map(async (transaction) => {
        if (
          transaction.tipo_transazione === "pagamento_corsa" &&
          transaction.id_corsa
        ) {
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

// GET TRANSACTION BY ID - Dettagli singola transazione
export const getTransactionById = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const id_utente = req.user.id_utente;

    const transaction = await Transaction.findByPk(transaction_id);

    if (!transaction) {
      return res.status(404).json({ error: "Transazione non trovata" });
    }

    if (transaction.id_utente !== id_utente) {
      return res.status(403).json({ error: "Accesso negato" });
    }

    let transactionFormatted = {
      id_transazione: transaction.id_transazione,
      id_utente: transaction.id_utente,
      tipo_transazione: transaction.tipo_transazione,
      id_corsa: transaction.id_corsa || null,
      data_ora: transaction.data_ora,
      descrizione: transaction.descrizione,
    };

    // Se pagamento corsa, recupera dettagli dalla ride
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

// GET CURRENT BALANCE - Saldo attuale account utente
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

// GET BALANCE SUMMARY - Riepilogo ricariche e spese utente
export const getBalanceSummary = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const ricariche = await Transaction.findAll({
      where: {
        id_utente,
        tipo_transazione: "ricarica",
      },
      raw: true,
    });

    const spese = await Transaction.findAll({
      where: {
        id_utente,
        tipo_transazione: "pagamento_corsa",
      },
    });

    const totalRicariche = ricariche.reduce(
      (sum, t) => sum + parseFloat(t.importo),
      0
    );

    // Calcola il totale speso considerando sconti da punti fedeltà
    const totalSpese = await Promise.all(
      spese.map(async (transaction) => {
        if (transaction.id_corsa) {
          const ride = await Ride.findByPk(transaction.id_corsa, {
            attributes: ["costo", "punti_fedeltà_usati"],
            raw: true,
          });

          if (ride) {
            // Calcola l'importo reale pagato (costo - sconto)
            const importoPagato = ride.costo - ride.punti_fedeltà_usati * 0.05;
            return Math.max(0, importoPagato);
          }
        }

        // Se non trovi la ride, ritorna l'importo della transaction
        return Math.abs(parseFloat(transaction.importo));
      })
    );

    const totalSpeseCalcolato = totalSpese.reduce(
      (sum, importo) => sum + importo,
      0
    );

    const user = await User.findByPk(id_utente);

    res.status(200).json({
      id_utente,
      nome: user.nome,
      saldo_attuale: parseFloat(user.saldo),
      totale_ricaricato: parseFloat(totalRicariche.toFixed(2)),
      totale_speso: parseFloat(totalSpeseCalcolato.toFixed(2)),
      numero_ricariche: ricariche.length,
      numero_corse: spese.length,
    });
  } catch (error) {
    console.error("❌ Errore GET balance summary:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// REQUEST ACCOUNT REACTIVATION - Richiesta di riapertura account utente
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

// APPROVE ACCOUNT REACTIVATION - Approva riapertura account (utente admin)
export const approveReactivation = async (req, res) => {
  try {
    const { id_utente } = req.params;

    const user = await User.findByPk(id_utente);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    if (user.stato_account !== "in_attesa_approvazione") {
      return res.status(400).json({
        error: "L'utente non è in attesa di approvazione",
      });
    }

    user.stato_account = "attivo";
    user.data_riapertura = new Date();
    user.data_sospensione = null;
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
