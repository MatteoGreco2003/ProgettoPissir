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
    tipo_operazione: {
      type: DataTypes.ENUM("guadagnati", "utilizzati"),
      allowNull: false,
    },
    punti_importo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    descrizione: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
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
