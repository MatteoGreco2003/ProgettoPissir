// backend/models/Parking.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Parking = sequelize.define(
  "Parking",
  {
    id_parcheggio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // Coordinate GPS per localizzazione
    latitudine: {
      type: DataTypes.DECIMAL(10, 8),
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitudine: {
      type: DataTypes.DECIMAL(11, 8),
      validate: {
        min: -180,
        max: 180,
      },
    },
    // Numero massimo di mezzi che può contenere
    capacita: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
      },
    },
    // Data di creazione automatica
    creato_il: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "parcheggi",
    timestamps: false,
    indexes: [
      {
        fields: ["nome"],
      },
    ],
  }
);

export default Parking;
