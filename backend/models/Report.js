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
    tipo_problema: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descrizione: DataTypes.TEXT,
    data_ora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
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
