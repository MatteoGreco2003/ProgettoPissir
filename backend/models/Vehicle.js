// backend/models/Vehicle.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Vehicle = sequelize.define(
  "Vehicle",
  {
    id_mezzo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipo_mezzo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["monopattino", "bicicletta"]],
      },
    },
    id_parcheggio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stato: {
      type: DataTypes.STRING(50),
      defaultValue: "disponibile",
      validate: {
        isIn: [["disponibile", "in_uso", "in_manutenzione"]],
      },
    },
    stato_batteria: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100,
      },
    },
    codice_identificativo: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    tariffa_minuto: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.25,
      validate: {
        min: 0,
      },
    },
    creato_il: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "mezzi",
    timestamps: false,
    indexes: [
      {
        fields: ["id_parcheggio"],
      },
      {
        fields: ["codice_identificativo"],
      },
    ],
  }
);

export default Vehicle;
