import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import pagesRoutes from "./routes/pages.js";
import vehicleRoutes from "./routes/vehicles.js";
import parkingRoutes from "./routes/parking.js";
import ridesRoutes from "./routes/rides.js";
import transactionRoutes from "./routes/transaction.js";
import reportRoutes from "./routes/reports.js";
import feedbackRoutes from "./routes/feedback.js";
import statisticsRoutes from "./routes/statistics.js";
import initBatteryListener from "./mqtt/batteryListener.js";
import initActiveBatteryDecrementer from "./mqtt/activeBatteryDecrementer.js";
import "./models/associations.js";

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

// Configurazione EJS per server-side rendering
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Servire file statici (CSS, JS, immagini)
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

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Routes - Page rendering (server-side)
app.use("/", pagesRoutes);

// Routes - API REST
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/parking", parkingRoutes);
app.use("/rides", ridesRoutes);
app.use("/transactions", transactionRoutes);
app.use("/reports", reportRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/statistics", statisticsRoutes);

// Avvia server
const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
    console.log(`🔗 Prova: curl http://localhost:${PORT}/api/health`);

    // Avvia listener MQTT per batteria
    initBatteryListener();
    console.log("🔋 Battery Listener avviato!");

    // Avvia decremento automatico batteria per corse attive
    initActiveBatteryDecrementer();
    console.log("⚡ Active Battery Decrementer avviato!");
  });
}

start().catch((err) => {
  console.error("Errore durante startup:", err);
  process.exit(1);
});
