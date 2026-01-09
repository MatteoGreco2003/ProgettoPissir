document.addEventListener("DOMContentLoaded", function () {
  const resetForm = document.getElementById("resetPasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

  function isValidPassword(password) {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
  }

  function showErrors(errors) {
    const errorContainer = document.getElementById("resetErrors");
    errorContainer.innerHTML = "";

    errors.forEach((error) => {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.textContent = "⚠️ " + error;
      errorContainer.appendChild(errorDiv);
    });

    if (errors.length > 0) {
      newPasswordInput.classList.add("input-error");
      confirmNewPasswordInput.classList.add("input-error");
    }
  }

  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get("token"),
      email: params.get("email"),
    };
  }

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { token, email } = getUrlParams();
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    document.getElementById("resetErrors").innerHTML = "";
    newPasswordInput.classList.remove("input-error");
    confirmNewPasswordInput.classList.remove("input-error");

    if (!token || !email) {
      showErrors(["Link non valido o scaduto"]);
      return;
    }

    if (!isValidPassword(newPassword)) {
      showErrors([
        "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)",
      ]);
      newPasswordInput.classList.add("input-error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showErrors(["Le password non corrispondono"]);
      confirmNewPasswordInput.classList.add("input-error");
      return;
    }

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

      if (response.ok) {
        document.getElementById("resetSuccess").style.display = "block";
        resetForm.style.display = "none";

        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        showErrors([data.message || "Errore nel reset della password"]);
        newPasswordInput.classList.add("input-error");
        confirmNewPasswordInput.classList.add("input-error");
      }
    } catch (error) {
      console.error("Errore:", error);
      showErrors(["Errore di connessione al server"]);
      newPasswordInput.classList.add("input-error");
    }
  });

  document.querySelectorAll(".toggle-password").forEach((icon) => {
    const inputId = icon.getAttribute("data-input");
    const input = document.getElementById(inputId);

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

    input.addEventListener("input", updateIcon);

    icon.addEventListener("click", () => {
      if (input.value.length > 0) {
        input.type = input.type === "password" ? "text" : "password";
      }
    });

    input.addEventListener("input", () => {
      input.classList.remove("input-error");
    });

    updateIcon();
  });
});
