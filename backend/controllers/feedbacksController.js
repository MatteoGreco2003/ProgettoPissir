// backend/controllers/feedbackController.js

import Feedback from "../models/Feedback.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Ride from "../models/Ride.js";
import { Op } from "sequelize";

// ✅ CREATE FEEDBACK - Lascia feedback su un mezzo dopo una corsa
export const createFeedback = async (req, res) => {
  try {
    const { id_mezzo, rating, commento } = req.body;
    const id_utente = req.user.id_utente;

    // Validazione input
    if (!id_mezzo || !rating) {
      return res.status(400).json({
        error: "id_mezzo e rating sono obbligatori",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "rating deve essere tra 1 e 5",
      });
    }

    // Verifica che mezzo esista
    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    // Verifica che l'utente abbia effettivamente usato il mezzo
    const rideExists = await Ride.findOne({
      where: {
        id_utente,
        id_mezzo,
        stato_corsa: "completata",
      },
    });

    if (!rideExists) {
      return res.status(400).json({
        error: "Puoi lasciare feedback solo per mezzi che hai usato",
      });
    }

    // Crea feedback
    const feedback = await Feedback.create({
      id_utente,
      id_mezzo,
      rating,
      commento: commento || null,
      data_ora: new Date(),
    });

    res.status(201).json({
      message: "Feedback creato con successo",
      id_feedback: feedback.id_feedback,
      rating: feedback.rating,
      data_ora: feedback.data_ora,
    });
  } catch (error) {
    console.error("❌ Errore CREATE feedback:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET FEEDBACK BY VEHICLE - Visualizza tutti i feedback di un mezzo
export const getFeedbackByVehicle = async (req, res) => {
  try {
    const { id_mezzo } = req.params;

    // Verifica che mezzo esista
    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    const feedbacks = await Feedback.findAll({
      where: { id_mezzo },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id_utente", "nome", "cognome"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo", "codice_identificativo"],
        },
      ],
      order: [["data_ora", "DESC"]],
    });

    // Calcola media rating
    const avgRating =
      feedbacks.length > 0
        ? (
            feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
          ).toFixed(2)
        : 0;

    res.status(200).json({
      message: "Feedback del mezzo recuperati",
      id_mezzo,
      count: feedbacks.length,
      average_rating: parseFloat(avgRating),
      feedbacks: feedbacks,
    });
  } catch (error) {
    console.error("❌ Errore GET feedback by vehicle:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET MY FEEDBACK - Visualizza i miei feedback
export const getMyFeedback = async (req, res) => {
  try {
    const id_utente = req.user.id_utente;

    const feedbacks = await Feedback.findAll({
      where: { id_utente },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id_mezzo", "tipo_mezzo", "codice_identificativo"],
        },
      ],
      order: [["data_ora", "DESC"]],
    });

    res.status(200).json({
      message: "I miei feedback recuperati",
      count: feedbacks.length,
      feedbacks: feedbacks,
    });
  } catch (error) {
    console.error("❌ Errore GET my feedback:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET FEEDBACK BY ID - Visualizza dettagli feedback
export const getFeedbackById = async (req, res) => {
  try {
    const { id_feedback } = req.params;

    const feedback = await Feedback.findByPk(id_feedback, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id_utente", "nome", "cognome", "email"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: [
            "id_mezzo",
            "tipo_mezzo",
            "codice_identificativo",
            "stato",
          ],
        },
      ],
    });

    if (!feedback) {
      return res.status(404).json({ error: "Feedback non trovato" });
    }

    res.status(200).json({
      message: "Feedback recuperato",
      feedback: feedback,
    });
  } catch (error) {
    console.error("❌ Errore GET feedback by id:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ UPDATE FEEDBACK - Modifica il tuo feedback
export const updateFeedback = async (req, res) => {
  try {
    const { id_feedback } = req.params;
    const { rating, commento } = req.body;
    const id_utente = req.user.id_utente;

    if (!rating && !commento) {
      return res.status(400).json({
        error: "Deve essere specificato almeno rating o commento",
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: "rating deve essere tra 1 e 5",
      });
    }

    const feedback = await Feedback.findByPk(id_feedback);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback non trovato" });
    }

    // Verifica che sia il proprietario del feedback
    if (feedback.id_utente !== id_utente) {
      return res.status(403).json({
        error: "Non hai permessi per modificare questo feedback",
      });
    }

    // Aggiorna feedback
    if (rating) feedback.rating = rating;
    if (commento !== undefined) feedback.commento = commento;
    await feedback.save();

    res.status(200).json({
      message: "Feedback aggiornato con successo",
      id_feedback: feedback.id_feedback,
      rating: feedback.rating,
      commento: feedback.commento,
    });
  } catch (error) {
    console.error("❌ Errore UPDATE feedback:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ DELETE FEEDBACK - Elimina il tuo feedback
export const deleteFeedback = async (req, res) => {
  try {
    const { id_feedback } = req.params;
    const id_utente = req.user.id_utente;

    const feedback = await Feedback.findByPk(id_feedback);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback non trovato" });
    }

    // Verifica che sia il proprietario del feedback
    if (feedback.id_utente !== id_utente) {
      return res.status(403).json({
        error: "Non hai permessi per eliminare questo feedback",
      });
    }

    await feedback.destroy();

    res.status(200).json({
      message: "Feedback eliminato con successo",
      id_feedback: id_feedback,
    });
  } catch (error) {
    console.error("❌ Errore DELETE feedback:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET ALL FEEDBACKS
export const getAllFeedbacks = async (req, res) => {
  try {
    const {
      tipo_mezzo,
      min_rating,
      limit = 10,
      offset = 0,
      sort_by = "data",
    } = req.query;

    // Costruisci filtri
    const where = {};

    if (tipo_mezzo) {
      // Filtra per tipo mezzo tramite la relazione Vehicle
      // Usare un include per il filtro
    }

    if (min_rating) {
      const minRatingNum = parseInt(min_rating);
      if (minRatingNum >= 1 && minRatingNum <= 5) {
        where.rating = { [Op.gte]: minRatingNum };
      }
    }

    // Determina l'ordinamento
    let order = [["data_ora", "DESC"]];
    if (sort_by === "rating") {
      order = [["rating", "DESC"]];
    }

    // Recupera i feedback con filtri
    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["nome", "cognome"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["tipo_mezzo", "codice_identificativo"],
          // Applica filtro tipo_mezzo se presente
          where: tipo_mezzo ? { tipo_mezzo } : undefined,
          required: tipo_mezzo ? true : false,
        },
      ],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false,
    });

    // Calcola statistiche
    const allFeedbacks = await Feedback.findAll({
      attributes: ["rating"],
      raw: true,
    });

    // Average rating
    const averageRating =
      allFeedbacks.length > 0
        ? (
            allFeedbacks.reduce((sum, f) => sum + f.rating, 0) /
            allFeedbacks.length
          ).toFixed(1)
        : 0;

    // Count by rating
    const countByRating = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    allFeedbacks.forEach((f) => {
      if (f.rating >= 1 && f.rating <= 5) {
        countByRating[f.rating]++;
      }
    });

    res.status(200).json({
      message: "Feedback community recuperati",
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      feedbacks: rows,
      statistics: {
        average_rating: parseFloat(averageRating),
        count_by_rating: countByRating,
        total_feedbacks: allFeedbacks.length,
      },
    });
  } catch (error) {
    console.error("❌ Errore GET all feedbacks:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ GET VEHICLE RATING - Per mostrare le stellette
export const getVehicleRating = async (req, res) => {
  try {
    const { id_mezzo } = req.params;

    // Verifica che il mezzo esista
    const vehicle = await Vehicle.findByPk(id_mezzo);
    if (!vehicle) {
      return res.status(404).json({ error: "Mezzo non trovato" });
    }

    // Recupera tutti i feedback per questo mezzo
    const feedbacks = await Feedback.findAll({
      where: { id_mezzo },
      attributes: ["rating"],
      raw: true,
    });

    // Se nessun feedback
    if (feedbacks.length === 0) {
      return res.status(200).json({
        id_mezzo,
        average_rating: 0,
        total_feedbacks: 0,
        rating_distribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
        messaggio: "Nessun feedback per questo mezzo",
      });
    }

    // Calcola average rating
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = (totalRating / feedbacks.length).toFixed(1);

    // Calcola distribuzione per rating
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    feedbacks.forEach((f) => {
      if (f.rating >= 1 && f.rating <= 5) {
        ratingDistribution[f.rating]++;
      }
    });

    res.status(200).json({
      id_mezzo,
      tipo_mezzo: vehicle.tipo_mezzo,
      codice_identificativo: vehicle.codice_identificativo,
      average_rating: parseFloat(averageRating),
      total_feedbacks: feedbacks.length,
      rating_distribution: ratingDistribution,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicle rating:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  createFeedback,
  getFeedbackByVehicle,
  getMyFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getAllFeedbacks,
  getVehicleRating,
};
