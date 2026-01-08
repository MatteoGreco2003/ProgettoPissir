import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// REGISTER - Registrazione nuovo utente/admin
export const register = async (req, res) => {
  try {
    const { nome, cognome, email, password } = req.body;

    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "La password deve avere almeno 8 caratteri" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email già registrata" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Determina ruolo in base all'email
    let role = "user";
    if (email === process.env.ADMIN_EMAIL) {
      role = "admin";
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

// LOGIN - Login utente/admin
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password obbligatori" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    const token = jwt.sign(
      {
        id_utente: user.id_utente,
        email: user.email,
        nome: user.nome,
        cognome: user.cognome,
        role: user.role,
      },
      process.env.JWT_SECRET || "SJKAHsudfiafU($BHdsaY*HJsBjhyrYU",
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

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

// FORGOT PASSWORD - Richiesta reset password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email è obbligatoria" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(200).json({
        message:
          "Se l'email è registrata, riceverai un link per reimpostare la password",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.password_reset_token = resetTokenHash;
    user.password_reset_expires = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

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

// RESET PASSWORD - Imposta nuova password
export const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Token, email e password sono obbligatori",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Le password non corrispondono",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password minimo 8 caratteri",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({
        error: "Token scaduto. Richiedi un nuovo reset",
      });
    }

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

// Helper: Invia email reset password via SendGrid
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
    console.error("❌ ERRORE invio email SendGrid:", error);
  }
}

// LOGOUT - Elimina token e termina sessione
export const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout completato" });
};
