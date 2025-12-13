import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import pagesRoutes from "./routes/pages.js";
import vehicleRoutes from "./routes/vehicles.js";
import parkingRoutes from "./routes/parking.js";
import ridesRoutes from "./routes/rides.js";
import transactionRoutes from "./routes/transaction.js";
import reportRoutes from "./routes/reports.js";
import feedbackRoutes from "./routes/feedback.js";
import initBatteryListener from "./mqtt/batteryListener.js";
import initActiveBatteryDecrementer from "./mqtt/activeBatteryDecrementer.js";
import "./models/associations.js"; //!dopo tutte (ne usi tanti)
import cookieParser from "cookie-parser";

// Carica variabili d'ambiente
dotenv.config();

// Gestisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========== CONFIGURAZIONE EJS ==========
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// ========== SERVIRE FILE STATICI ==========
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Test connessione database
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connesso correttamente");
  } catch (err) {
    console.error("❌ Errore connessione database:", err.message);
    process.exit(1);
  }
}

// ========== ROUTES ==========

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

//route
// pagesRoutes (renderizza le pagine server-side)
app.use("/", pagesRoutes);
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/parking", parkingRoutes);
app.use("/rides", ridesRoutes);
app.use("/transactions", transactionRoutes);
app.use("/reports", reportRoutes);
app.use("/feedback", feedbackRoutes);

// // 404 Handler
// app.use((req, res) => {
//   res.status(404).render("404", { title: "Pagina non trovata" });
// });

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
    console.log(`🔗 Prova: curl http://localhost:${PORT}/api/health`);
  });
}

start().catch((err) => {
  console.error("Errore durante startup:", err);
  process.exit(1);
});

// Dopo che il server è avviato:
initBatteryListener();
console.log("🔋 Battery Listener avviato!");

// Dopo che il server è avviato (automatico su tutte le corse attive):
initActiveBatteryDecrementer();
console.log("🔋 Active Battery Decrementer avviato!");
