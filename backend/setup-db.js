// backend/setup-db.js
import sequelize from "./config/database.js";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
import Parking from "./models/Parking.js";
import Ride from "./models/Ride.js";
import Transaction from "./models/Transaction.js";
import Report from "./models/Report.js";
import Feedback from "./models/Feedback.js";
import "./models/associations.js";

console.log("🔄 Sincronizzando models con database...");

try {
  await sequelize.sync({ alter: false });

  console.log("✅ Tutti i models sincronizzati!");
  console.log("📊 Tabelle create:");
  console.log("  - utenti");
  console.log("  - parcheggi");
  console.log("  - mezzi");
  console.log("  - storico_corse");
  console.log("  - storico_transazioni");
  console.log("  - segnalazioni_malfunzionamento");
  console.log("  - feedback");

  process.exit(0);
} catch (error) {
  console.error("❌ Errore durante la sincronizzazione:", error.message);
  process.exit(1);
}
