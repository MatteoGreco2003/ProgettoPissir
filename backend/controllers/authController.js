import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ REGISTER - Logica di registrazione
export const register = async (req, res) => {
  try {
    const { nome, cognome, email, password } = req.body;

    // Validazione input
    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "La password deve avere almeno 8 caratteri" });
    }

    // Controlla email duplicata
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email già registrata" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Determina ruolo in base all'email
    let role = "user"; // Default: utente normale
    if (email === process.env.ADMIN_EMAIL) {
      role = "admin";
    } else if (email === process.env.MANAGER_EMAIL) {
      role = "manager";
    }

    // Crea utente
    const user = await User.create({
      email,
      nome,
      cognome,
      password_hash: passwordHash,
      saldo: 0.0,
      stato_account: "attivo",
      role: role,
    });

    res.status(201).json({
      message: "Registrazione completata con successo",
      user_id: user.id_utente,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("❌ Errore registrazione:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ LOGIN - Logica di login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validazione
    if (!email || !password) {
      return res.status(400).json({ error: "Email e password obbligatori" });
    }

    // Trova utente
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // MIGLIORATO: Genera JWT con role
    const token = jwt.sign(
      {
        id_utente: user.id_utente,
        email: user.email,
        nome: user.nome,
        cognome: user.cognome,
        role: user.role, // ✅ NUOVO: Includi ruolo nel JWT
      },
      process.env.JWT_SECRET || "SJKAHsudfiafU($BHdsaY*HJsBjhyrYU",
      { expiresIn: "24h" }
    );

    // ✅ Salva token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Determina il tipo di utente basandosi su email
    const isAdmin = email === process.env.ADMIN_EMAIL;

    res.status(200).json({
      message: "Login completato",
      access_token: token,
      token_type: "Bearer",
      user: {
        id_utente: user.id_utente,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        saldo: user.saldo,
        stato_account: user.stato_account,
        isAdmin: isAdmin,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Errore login:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ FORGOT PASSWORD (REQUEST RESET)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email è obbligatoria" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({
        message:
          "Se l'email è registrata, riceverai un link per reimpostare la password",
      });
    }

    // Generate random reset token (unhashed version sent to user)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before storing (security best practice)
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token and expiry (1 hour) in DB
    user.password_reset_token = resetTokenHash;
    user.password_reset_expires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Build reset URL with unhashed token (sent to user)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

    // Send reset email via SendGrid
    await sendResetPasswordEmail(email, resetUrl);

    res.status(200).json({
      message:
        "Se l'email è registrata, riceverai un link per reimpostare la password",
    });
  } catch (error) {
    console.error("❌ Errore forgot password:", error.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// ✅ RESET PASSWORD (SET NEW PASSWORD)
export const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Token, email e password sono obbligatori",
      });
    }

    // Passwords must match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Le password non corrispondono",
      });
    }

    // Minimum length
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password minimo 8 caratteri",
      });
    }

    // Hash token to compare with DB
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token (not expired)
    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        password_reset_token: resetTokenHash,
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "Token non valido o scaduto",
      });
    }

    // Check if token expired
    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({
        error: "Token scaduto. Richiedi un nuovo reset",
      });
    }

    // Update password (hash it)
    user.password_hash = await bcrypt.hash(newPassword, 12);
    user.password_reset_token = null;
    user.password_reset_expires = null;
    await user.save();

    res.status(200).json({
      message: "Password reimpostata con successo",
    });
  } catch (error) {
    console.error("❌ Errore reset password:", error.message);
    res.status(500).json({
      error: "Errore interno del server",
    });
  }
};

// ===== HELPER: Send reset password email via SendGrid =====
async function sendResetPasswordEmail(email, resetUrl) {
  try {
    const msg = {
      to: email,
      from: process.env.SENDER_EMAIL,
      replyTo: process.env.SENDER_EMAIL,
      subject: "🔐 Recupera la tua password - MobiShare",
      text: `Clicca il link per reimpostare la password: ${resetUrl}`,
      html: `
        <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2180a4, #1a6a80); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚴‍♂️ MobiShare 🚴‍♂️</h1>
          </div>
          
          <div style="background: #f0f8ff; padding: 40px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #16163f; margin-top: 0;">Hai richiesto il reset della password</h2>
            
            <p style="color: #73738c; font-size: 16px; line-height: 1.6;">
              Clicca il bottone sottostante per reimpostare la tua password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #2180a4, #1a6a80);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
              ">
                Reimposta Password
              </a>
            </div>
            
            <p style="color: #73738c; font-size: 14px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              Oppure copia e incolla questo link nel browser:
            </p>
            <p style="color: #2180a4; font-size: 12px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <div style="background: #fff5f5; border-left: 4px solid #ff4444; padding: 16px; margin-top: 20px; border-radius: 4px;">
              <p style="color: #cc0000; margin: 0; font-weight: 600;">⏰ Attenzione:</p>
              <p style="color: #73738c; margin: 8px 0 0 0; font-size: 14px;">
                Questo link scade in <b>1 ora</b>. Se non lo usi, dovrai richiedere un nuovo reset.
              </p>
            </div>
            
            <div style="background: #e6f7ff; border-left: 4px solid #2180a4; padding: 16px; margin-top: 20px; border-radius: 4px;">
              <p style="color: #2180a4; margin: 0; font-weight: 600;">ℹ️ Sicurezza:</p>
              <p style="color: #73738c; margin: 8px 0 0 0; font-size: 14px;">
                Se non hai richiesto il reset della password, <b>ignora questa email</b>. 
                Il tuo account è al sicuro.
              </p>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
            <p style="color: #73738c; font-size: 12px; margin: 0;">
              © 2025 MobiShare - Matteo & Francesco
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error("❌ ERRORE CRITICO invio email SendGrid:", error);
  }
}

// ✅ LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout completato" });
};
