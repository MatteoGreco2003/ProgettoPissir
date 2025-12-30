// backend/controllers/statisticsController.js

import Ride from "../models/Ride.js";
import Vehicle from "../models/Vehicle.js";
import Parking from "../models/Parking.js";
import User from "../models/User.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";

// GET PARKING STATISTICS - Disponibilità mezzi per parcheggio
export const getParkingStatistics = async (req, res) => {
  try {
    const parkings = await Parking.findAll({
      include: [
        {
          model: Vehicle,
          as: "vehicles",
          attributes: ["id_mezzo", "stato", "tipo_mezzo", "stato_batteria"],
          required: false,
        },
      ],
    });

    const parkingStats = parkings.map((parking) => {
      const vehicles = parking.vehicles || [];
      return {
        id_parcheggio: parking.id_parcheggio,
        nome: parking.nome,
        capacita: parking.capacita,
        total_mezzi: vehicles.length,
        disponibili: vehicles.filter((v) => v.stato === "disponibile").length,
        in_uso: vehicles.filter((v) => v.stato === "in_uso").length,
        in_manutenzione: vehicles.filter((v) => v.stato === "in_manutenzione")
          .length,
        non_prelevabili: vehicles.filter((v) => v.stato === "non_prelevabile")
          .length,
        dettagli_mezzi: vehicles.map((v) => ({
          id_mezzo: v.id_mezzo,
          tipo: v.tipo_mezzo,
          stato: v.stato,
          batteria: v.stato_batteria,
        })),
      };
    });

    res.status(200).json({
      message: "Statistiche parcheggi",
      total_parcheggi: parkingStats.length,
      parcheggi: parkingStats,
    });
  } catch (error) {
    console.error("❌ Errore GET parking statistics:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET VEHICLE STATISTICS - Performance e utilizzo dei mezzi
export const getVehicleStatistics = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      include: [
        {
          model: Parking,
          as: "parking",
          attributes: ["nome"],
        },
      ],
    });

    // Per ogni mezzo, calcola statistiche di utilizzo
    const vehicleStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const corse = await Ride.count({
          where: { id_mezzo: vehicle.id_mezzo, stato_corsa: "completata" },
        });

        const rideData = await Ride.findAll({
          where: { id_mezzo: vehicle.id_mezzo, stato_corsa: "completata" },
          attributes: [
            [sequelize.fn("SUM", sequelize.col("costo")), "ricavo_totale"],
            [
              sequelize.fn("AVG", sequelize.col("durata_minuti")),
              "durata_media",
            ],
          ],
          raw: true,
        });

        return {
          id_mezzo: vehicle.id_mezzo,
          tipo: vehicle.tipo_mezzo,
          parcheggio: vehicle.parking?.nome || "N/A",
          stato: vehicle.stato,
          batteria: vehicle.stato_batteria,
          corse_totali: corse,
          ricavo_totale: parseFloat(rideData[0]?.ricavo_totale || 0).toFixed(2),
          durata_media_minuti: parseFloat(
            rideData[0]?.durata_media || 0
          ).toFixed(1),
        };
      })
    );

    res.status(200).json({
      message: "Statistiche veicoli",
      total_veicoli: vehicleStats.length,
      veicoli: vehicleStats,
    });
  } catch (error) {
    console.error("❌ Errore GET vehicle statistics:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET OVERVIEW STATISTICS - Dashboard con metriche generali
export const getOverviewStatistics = async (req, res) => {
  try {
    const totalRides = await Ride.count({
      where: { stato_corsa: "completata" },
    });

    const revenueData = await Ride.findAll({
      where: { stato_corsa: "completata" },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("costo")), "ricavo_totale"],
      ],
      raw: true,
    });

    const ricavoTotale = parseFloat(revenueData[0]?.ricavo_totale || 0);

    // Utenti che hanno fatto almeno una corsa
    const activeUsers = await Ride.count({
      distinct: true,
      col: "id_utente",
      where: { stato_corsa: "completata" },
    });

    const suspendedUsers = await User.count({
      where: { stato_account: "sospeso" },
    });

    const pendingApproval = await User.count({
      where: { stato_account: "in_attesa_approvazione" },
    });

    const vehiclesNonPrelevabili = await Vehicle.count({
      where: { stato: "non_prelevabile" },
    });

    const vehiclesInMaintenance = await Vehicle.count({
      where: { stato: "in_manutenzione" },
    });

    const avgDurationData = await Ride.findAll({
      where: { stato_corsa: "completata" },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("durata_minuti")), "durata_media"],
      ],
      raw: true,
    });

    const durataMedia = parseFloat(avgDurationData[0]?.durata_media || 0);

    res.status(200).json({
      message: "Statistiche generali sistema",
      corse_totali: totalRides,
      ricavo_totale: ricavoTotale.toFixed(2),
      durata_media_minuti: durataMedia.toFixed(1),
      utenti_attivi: activeUsers,
      utenti_sospesi: suspendedUsers,
      utenti_in_attesa_approvazione: pendingApproval,
      mezzi_non_prelevabili: vehiclesNonPrelevabili,
      mezzi_in_manutenzione: vehiclesInMaintenance,
    });
  } catch (error) {
    console.error("❌ Errore GET overview statistics:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET SUSPENDED USERS WITH RELIABILITY - Utenti sospesi con valutazione
export const getSuspendedUsersWithReliability = async (req, res) => {
  try {
    const suspendedUsers = await User.findAll({
      where: { stato_account: ["sospeso", "in_attesa_approvazione"] },
      attributes: [
        "id_utente",
        "email",
        "nome",
        "cognome",
        "stato_account",
        "saldo",
        "numero_sospensioni",
        "data_sospensione",
      ],
      order: [["numero_sospensioni", "DESC"]],
    });

    const usersWithStats = await Promise.all(
      suspendedUsers.map(async (user) => {
        const totalRides = await Ride.count({
          where: { id_utente: user.id_utente, stato_corsa: "completata" },
        });

        return {
          id_utente: user.id_utente,
          email: user.email,
          nome: user.nome,
          cognome: user.cognome,
          stato_account: user.stato_account,
          saldo: parseFloat(user.saldo).toFixed(2),
          numero_sospensioni: user.numero_sospensioni,
          data_sospensione: user.data_sospensione,
          corse_totali: totalRides,
          affidabilita:
            user.numero_sospensioni === 0
              ? "Alta"
              : user.numero_sospensioni === 1
              ? "Media"
              : "Bassa",
          raccomandazione:
            user.numero_sospensioni === 0
              ? "Approvare riattivazione"
              : user.numero_sospensioni === 1
              ? "Valutare caso per caso"
              : "Non approvare - Rischio comportamento",
        };
      })
    );

    res.status(200).json({
      message: "Utenti sospesi con valutazione affidabilità",
      total_sospesi: usersWithStats.length,
      utenti: usersWithStats,
    });
  } catch (error) {
    console.error("❌ Errore GET suspended users:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// GET PARKING USAGE STATISTICS - Utilizzo e popolarità parcheggi
export const getParkingUsageStatistics = async (req, res) => {
  try {
    const parkingUsage = await Ride.findAll({
      where: { stato_corsa: "completata" },
      attributes: [
        "id_parcheggio_inizio",
        [sequelize.fn("COUNT", sequelize.col("id_corsa")), "corse_partenze"],
      ],
      group: ["id_parcheggio_inizio"],
      raw: true,
      subQuery: false,
    });

    const parkingUsageEnd = await Ride.findAll({
      where: { stato_corsa: "completata" },
      attributes: [
        "id_parcheggio_fine",
        [sequelize.fn("COUNT", sequelize.col("id_corsa")), "corse_arrivi"],
      ],
      group: ["id_parcheggio_fine"],
      raw: true,
      subQuery: false,
    });

    // Combina i dati con informazioni del parcheggio
    const parkings = await Parking.findAll({
      include: [
        {
          model: Vehicle,
          as: "vehicles",
          attributes: ["id_mezzo"],
          required: false,
        },
      ],
    });

    const parkingStatsUsage = parkings.map((parking) => {
      const partenze = parkingUsage.find(
        (p) => p.id_parcheggio_inizio === parking.id_parcheggio
      );
      const arrivi = parkingUsageEnd.find(
        (p) => p.id_parcheggio_fine === parking.id_parcheggio
      );

      const corseTotali =
        (parseInt(partenze?.corse_partenze) || 0) +
        (parseInt(arrivi?.corse_arrivi) || 0);

      return {
        id_parcheggio: parking.id_parcheggio,
        nome: parking.nome,
        capacita: parking.capacita,
        mezzi_presenti: parking.vehicles?.length || 0,
        corse_partenze: parseInt(partenze?.corse_partenze) || 0,
        corse_arrivi: parseInt(arrivi?.corse_arrivi) || 0,
        corse_totali: corseTotali,
        utilizzo_percentuale: (
          (corseTotali / Math.max(parking.capacita, 1)) *
          100
        ).toFixed(1),
      };
    });

    // Ordina per utilizzo decrescente
    parkingStatsUsage.sort((a, b) => b.corse_totali - a.corse_totali);

    res.status(200).json({
      message: "Statistiche utilizzo parcheggi",
      total_parcheggi: parkingStatsUsage.length,
      parcheggi_ordinati_per_utilizzo: parkingStatsUsage,
    });
  } catch (error) {
    console.error("❌ Errore GET parking usage statistics:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export default {
  getParkingStatistics,
  getVehicleStatistics,
  getOverviewStatistics,
  getSuspendedUsersWithReliability,
  getParkingUsageStatistics,
};
