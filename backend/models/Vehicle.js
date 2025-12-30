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
    // Tipo mezzo: monopattino, bicicletta muscolare, bicicletta elettrica
    tipo_mezzo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["monopattino", "bicicletta_muscolare", "bicicletta_elettrica"]],
      },
    },
    id_parcheggio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Stato mezzo: disponibile, in uso, in manutenzione, non prelevabile
    stato: {
      type: DataTypes.STRING(50),
      defaultValue: "disponibile",
      validate: {
        isIn: [["disponibile", "in_uso", "in_manutenzione", "non_prelevabile"]],
      },
    },
    // Percentuale batteria (null per biciclette muscolari)
    stato_batteria: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    // Codice QR o identificativo univoco del mezzo
    codice_identificativo: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    // Tariffa al minuto in euro
    tariffa_minuto: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.25,
      validate: {
        min: 0,
      },
    },
    // Data di creazione automatica
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
