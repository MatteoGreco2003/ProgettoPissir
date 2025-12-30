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
    // Saldo credito in euro
    saldo: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    // Stato account: attivo, sospeso, in attesa di approvazione, eliminato
    stato_account: {
      type: DataTypes.ENUM(
        "attivo",
        "sospeso",
        "in_attesa_approvazione",
        "eliminato"
      ),
      defaultValue: "attivo",
    },
    // Ruolo utente: user, admin, manager
    role: {
      type: DataTypes.STRING(50),
      defaultValue: "user",
      validate: {
        isIn: [["user", "admin", "manager"]],
      },
    },
    // Data di registrazione automatica
    data_registrazione: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // Token per reset password
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Scadenza token reset password
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Data sospensione account
    data_sospensione: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Data riapertura account
    data_riapertura: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Punti fedeltà disponibili
    punti: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    // Numero di sospensioni per tracciare affidabilità
    numero_sospensioni: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
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
