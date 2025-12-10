// ==========================================
// RESET PASSWORD - MOBISHARE
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  // ===== DOM ELEMENTS =====
  const resetForm = document.getElementById("resetPasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

  // ===== PASSWORD VALIDATION =====
  /**
   * Controlla se la password rispetta i requisiti:
   * - Minimo 8 caratteri
   * - Almeno una maiuscola
   * - Almeno una minuscola
   * - Almeno un numero
   */
  function isValidPassword(password) {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
  }

  // ===== DISPLAY ERRORS =====
  /**
   * Mostra gli errori di validazione nel DOM
   * @param {Array} errors - Array di messaggi di errore
   */
  function showErrors(errors) {
    const errorContainer = document.getElementById("resetErrors");
    errorContainer.innerHTML = ""; // Pulisci errori precedenti

    errors.forEach((error) => {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.textContent = "⚠️ " + error;
      errorContainer.appendChild(errorDiv);
    });

    // Aggiungi classe error agli input
    if (errors.length > 0) {
      newPasswordInput.classList.add("input-error");
      confirmNewPasswordInput.classList.add("input-error");
    }
  }

  // ===== EXTRACT URL PARAMETERS =====
  /**
   * Estrae i parametri dalla URL (token e email)
   * @returns {Object} Oggetto con token e email
   */
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get("token"),
      email: params.get("email"),
    };
  }

  // ===== FORM SUBMISSION =====
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Previeni il reload della pagina

    // Estrai i valori dal form
    const { token, email } = getUrlParams();
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    // Pulisci gli errori e le classi precedenti
    document.getElementById("resetErrors").innerHTML = "";
    newPasswordInput.classList.remove("input-error");
    confirmNewPasswordInput.classList.remove("input-error");

    // ===== VALIDATION CHECKS =====
    // Controlla se il link è valido (token e email presenti)
    if (!token || !email) {
      showErrors(["Link non valido o scaduto"]);
      return;
    }

    // Controlla i requisiti della password
    if (!isValidPassword(newPassword)) {
      showErrors([
        "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)",
      ]);
      newPasswordInput.classList.add("input-error");
      return;
    }

    // Controlla se le password coincidono
    if (newPassword !== confirmNewPassword) {
      showErrors(["Le password non corrispondono"]);
      confirmNewPasswordInput.classList.add("input-error");
      return;
    }

    // ===== SEND REQUEST TO SERVER =====
    try {
      const response = await fetch("/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          email: email,
          newPassword: newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      const data = await response.json();

      // Gestisci la risposta dal server
      if (response.ok) {
        // Successo: mostra il messaggio e nascondi il form
        document.getElementById("resetSuccess").style.display = "block";
        resetForm.style.display = "none";

        // Reindirizza alla home dopo 2.5 secondi
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        // Errore dal server
        showErrors([data.message || "Errore nel reset della password"]);
        newPasswordInput.classList.add("input-error");
        confirmNewPasswordInput.classList.add("input-error");
      }
    } catch (error) {
      // Errore di connessione
      console.error("Errore:", error);
      showErrors(["Errore di connessione al server"]);
      newPasswordInput.classList.add("input-error");
    }
  });

  // ===== PASSWORD VISIBILITY TOGGLE =====
  /**
   * Abilita il toggle della visibilità della password
   * L'icona cambia da lucchetto (lock) a occhio (eye) quando scrivi
   */
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    const inputId = icon.getAttribute("data-input");
    const input = document.getElementById(inputId);

    /**
     * Aggiorna l'icona in base al contenuto dell'input
     * Se c'è testo: mostra occhio (eye) e rendi cliccabile
     * Se vuoto: mostra lucchetto (lock) e non cliccabile
     */
    function updateIcon() {
      if (input.value.length > 0) {
        if (!icon.classList.contains("fa-eye")) {
          icon.classList.remove("fa-lock");
          icon.classList.add("fa-eye");
          icon.style.cursor = "pointer";
        }
      } else {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-lock");
        input.type = "password";
        icon.style.cursor = "default";
      }
    }

    // Aggiorna l'icona mentre scrivi
    input.addEventListener("input", updateIcon);

    // Toggle visibilità quando clicki l'icona
    icon.addEventListener("click", () => {
      if (input.value.length > 0) {
        // Alterna tra password visibile e nascosto
        input.type = input.type === "password" ? "text" : "password";
      }
    });

    // Pulisci la classe error quando l'utente inizia a digitare
    input.addEventListener("input", () => {
      input.classList.remove("input-error");
    });

    // Inizializza l'icona al caricamento
    updateIcon();
  });
});
