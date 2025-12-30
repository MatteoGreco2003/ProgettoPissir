// backend/models/PuntiFedelta.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PuntiFedelta = sequelize.define(
  "PuntiFedelta",
  {
    id_punto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_utente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_corsa: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Guadagnati da corsa o utilizzati per sconto
    tipo_operazione: {
      type: DataTypes.ENUM("guadagnati", "utilizzati"),
      allowNull: false,
    },
    // Numero di punti guadagnati o utilizzati
    punti_importo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    // Descrizione dell'operazione
    descrizione: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Data e ora automatica
    data_operazione: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "punti_fedelta",
    timestamps: false,
    indexes: [
      {
        fields: ["id_utente"],
      },
      {
        fields: ["id_corsa"],
      },
    ],
  }
);

export default PuntiFedelta;
