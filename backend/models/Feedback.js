// backend/models/Feedback.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Feedback = sequelize.define(
  "Feedback",
  {
    id_feedback: {
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
    // Valutazione da 1 a 5
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // Commento opzionale dell'utente
    commento: DataTypes.TEXT,
    // Data e ora automatica
    data_ora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "feedback",
    timestamps: false,
  }
);

export default Feedback;
