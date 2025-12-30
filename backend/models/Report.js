// backend/models/Report.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Report = sequelize.define(
  "Report",
  {
    id_segnalazione: {
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
    // Categoria del problema (es: "batteria bassa", "pneumatico bucato", etc.)
    tipo_problema: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Descrizione dettagliata del problema
    descrizione: DataTypes.TEXT,
    // Data e ora automatica
    data_ora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // Stato della segnalazione
    stato_segnalazione: {
      type: DataTypes.STRING(50),
      defaultValue: "aperta",
      validate: {
        isIn: [["aperta", "in_lavorazione", "risolta"]],
      },
    },
  },
  {
    tableName: "segnalazioni_malfunzionamento",
    timestamps: false,
    indexes: [
      {
        fields: ["id_mezzo"],
      },
    ],
  }
);

export default Report;
