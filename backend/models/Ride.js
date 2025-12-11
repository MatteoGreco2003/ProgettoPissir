// backend/models/Ride.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Vehicle from "./Vehicle.js";
import Parking from "./Parking.js";

const Ride = sequelize.define(
  "Ride",
  {
    id_corsa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_utente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_mezzo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_parcheggio_inizio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_parcheggio_fine: DataTypes.INTEGER,
    data_ora_inizio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    data_ora_fine: DataTypes.DATE,
    durata_minuti: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
      },
    },
    costo: {
      type: DataTypes.DECIMAL(10, 2),
      validate: {
        min: 0,
      },
    },
    stato_corsa: {
      type: DataTypes.STRING(50),
      defaultValue: "in_corso",
      validate: {
        isIn: [["in_corso", "completata"]],
      },
    },
  },
  {
    tableName: "storico_corse",
    timestamps: false,
    indexes: [
      {
        fields: ["id_utente"],
      },
      {
        fields: ["id_mezzo"],
      },
    ],
  }
);

// ✅ ASSOCIAZIONI
Ride.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

Ride.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
});

Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_inizio",
  as: "parkingInizio",
});

Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_fine",
  as: "parkingFine",
});

export default Ride;
