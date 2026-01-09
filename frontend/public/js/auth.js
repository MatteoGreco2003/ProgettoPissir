const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const closeModalBtn = document.querySelector(".close");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const closeForgotBtn = document.getElementById("closeForgotBtn");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
  resetLoginForm();
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
  resetRegisterForm();
});

function resetLoginForm() {
  loginForm.reset();

  document.getElementById("loginPassword").type = "password";
  document.querySelectorAll(".login .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  clearErrors("login");
  clearInputErrors("login");
}

function resetRegisterForm() {
  registerForm.reset();

  document.getElementById("registerPassword").type = "password";
  document.getElementById("confirmPassword").type = "password";
  document.querySelectorAll(".register .toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-lock");
  });

  clearErrors("register");
  clearInputErrors("register");
}

function resetForgotPasswordForm() {
  forgotPasswordForm.reset();
  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidName(name) {
  const nameRegex =
    /^[a-zA-ZàáäâèéëêìíïîòóöôùúüûñçÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛÑÇ\s]{2,}$/;
  return nameRegex.test(name.trim());
}

function isValidPassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
}

function showErrors(formType, errors) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";

  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = "⚠️ " + error;
    errorContainer.appendChild(errorDiv);
  });
}

function showErrorsForgotPass(errors) {
  const errorContainer = document.getElementById("forgotErrors");
  errorContainer.innerHTML = "";

  errors.forEach((error) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = "⚠️ " + error;
    errorContainer.appendChild(errorDiv);
  });
}

function clearErrors(formType) {
  const errorContainer = document.getElementById(`${formType}Errors`);
  errorContainer.innerHTML = "";
}

function addInputError(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.classList.add("input-error");
  }
}

function clearInputErrors(formType) {
  const form = formType === "login" ? loginForm : registerForm;
  const inputs = form.querySelectorAll("input");
  inputs.forEach((input) => {
    input.classList.remove("input-error");
  });
}

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

  updateIcon();
});

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const firstName = document.getElementById("registerFirstName").value.trim();
  const lastName = document.getElementById("registerLastName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  clearErrors("register");
  clearInputErrors("register");

  let firstError = null;
  let firstErrorInput = null;

  if (!isValidName(firstName)) {
    firstError = "Nome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerFirstName";
  } else if (!isValidName(lastName)) {
    firstError = "Cognome non valido (minimo 2 caratteri)";
    firstErrorInput = "registerLastName";
  } else if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "registerEmail";
  } else if (!isValidPassword(password)) {
    firstError =
      "Password deve contenere minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero (es: Password123)";
    firstErrorInput = "registerPassword";
  } else if (password !== confirmPassword) {
    firstError = "Le password non corrispondono";
    firstErrorInput = "confirmPassword";
  }

  if (firstError) {
    showErrors("register", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    registerUser(firstName, lastName, email, password);
  }
});

async function registerUser(firstName, lastName, email, password) {
  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: firstName,
        cognome: lastName,
        email: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      registerForm.reset();
      window.location.href = "/";
    } else {
      showErrors("register", [data.error || "Errore di registrazione"]);
    }
  } catch (error) {
    console.error("Errore registrazione:", error);
  }
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  clearErrors("login");
  clearInputErrors("login");

  let firstError = null;
  let firstErrorInput = null;

  if (!isValidEmail(email)) {
    firstError = "Email non valida (es: user@example.com)";
    firstErrorInput = "loginEmail";
  } else if (password.length === 0) {
    firstError = "Inserisci la password";
    firstErrorInput = "loginPassword";
  }

  if (firstError) {
    showErrors("login", [firstError]);
    if (firstErrorInput) {
      addInputError(firstErrorInput);
    }
  } else {
    loginUser(email, password);
  }
});

async function loginUser(email, password) {
  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userType", data.user.stato_account);
      localStorage.setItem("userId", data.user.id_utente);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem(
        "userName",
        `${data.user.nome} ${data.user.cognome}`
      );
      localStorage.setItem("isAdmin", data.user.isAdmin);

      if (data.user.isAdmin) {
        window.location.href = "/home-admin";
      } else {
        window.location.href = "/home-utente";
      }
    } else {
      showErrors("login", [data.message || "Credenziali non valide"]);
    }
  } catch (error) {
    console.error("Errore login:", error);
  }
}

forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordModal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

window.addEventListener("click", (e) => {
  if (e.target === forgotPasswordModal) {
    forgotPasswordModal.style.display = "none";
    resetForgotPasswordForm();
  }
});

closeForgotBtn.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetForgotPasswordForm();
});

async function requestPasswordReset(email) {
  try {
    const response = await fetch("/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("forgotSuccess").style.display = "block";
      forgotPasswordForm.reset();

      setTimeout(() => {
        forgotPasswordModal.style.display = "none";
        document.getElementById("forgotSuccess").style.display = "none";
      }, 3000);
    } else {
      showErrorsForgotPass([data.message || "Errore nella richiesta"]);
    }
  } catch (error) {
    console.error("Errore:", error);
  }
}

forgotPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();

  document.getElementById("forgotErrors").innerHTML = "";
  document.getElementById("forgotSuccess").style.display = "none";

  if (!isValidEmail(email)) {
    showErrorsForgotPass(["Email non valida (es: user@example.com)"]);
    return;
  }

  requestPasswordReset(email);
});
