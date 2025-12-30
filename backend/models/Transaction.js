// backend/models/Transaction.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    id_transazione: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_utente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Tipo di transazione: ricarica credito, pagamento corsa, o debito
    tipo_transazione: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["ricarica", "pagamento_corsa", "debito_prossima_corsa"]],
      },
    },
    // Importo della transazione
    importo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    // Data e ora automatica
    data_ora: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // ID corsa se transazione è pagamento di una corsa
    id_corsa: DataTypes.INTEGER,
    // Descrizione della transazione
    descrizione: DataTypes.TEXT,
  },
  {
    tableName: "storico_transazioni",
    timestamps: false,
    indexes: [
      {
        fields: ["id_utente"],
      },
    ],
  }
);

export default Transaction;
