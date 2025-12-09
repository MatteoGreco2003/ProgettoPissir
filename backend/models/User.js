// backend/models/User.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id_utente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    cognome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    saldo: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      validate: {
        min: 0,
      },
    },
    stato_account: {
      type: DataTypes.ENUM("attivo", "sospeso", "eliminato"),
      defaultValue: "attivo",
    },
    data_registrazione: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "utenti",
    timestamps: false,
    indexes: [
      {
        fields: ["email"],
      },
    ],
  }
);

export default User;
