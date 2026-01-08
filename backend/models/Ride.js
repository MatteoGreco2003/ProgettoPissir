import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Ride = sequelize.define(
  "Ride",
  {
    id_corsa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_utente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_mezzo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_parcheggio_inizio: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_parcheggio_fine: DataTypes.INTEGER,
    data_ora_inizio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    data_ora_fine: DataTypes.DATE,
    durata_minuti: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
      },
    },
    costo: {
      type: DataTypes.DECIMAL(10, 2),
      validate: {
        min: 0,
      },
    },
    stato_corsa: {
      type: DataTypes.STRING(50),
      defaultValue: "in_corso",
      validate: {
        isIn: [
          ["in_corso", "completata", "cancellata", "sospesa_batteria_esaurita"],
        ],
      },
    },
    km_percorsi: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    punti_fedeltà_usati: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "storico_corse",
    timestamps: false,
    indexes: [
      {
        fields: ["id_utente"],
      },
      {
        fields: ["id_mezzo"],
      },
    ],
  }
);

export default Ride;
