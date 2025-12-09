import express from "express";
import cors from "cors";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";

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

// ========== CONFIGURAZIONE EJS ==========
// Motor per renderizzare i template EJS
app.set("view engine", "ejs");
// Punta alla cartella frontend/views
app.set("views", "../frontend/views");

// ========== SERVIRE FILE STATICI ==========
// CSS, JS, IMG da frontend/public
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Setup Database Connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false, // Metti true per debug SQL queries
  }
);

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

// ✅ Routes
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});
// Pagina login (homepage)
app.get("/", (req, res) => {
  res.render("auth"); // Renderizza frontend/views/login.ejs
});
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

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
