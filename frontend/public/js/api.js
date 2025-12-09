// ========== API CLIENT WRAPPER ==========

// Salva token JWT
function setToken(token) {
  localStorage.setItem("authToken", token);
}

// Recupera token JWT
function getToken() {
  return localStorage.getItem("authToken");
}

// Wrapper principale per tutte le chiamate API
async function apiCall(method, endpoint, body = null) {
  const baseURL = "http://localhost:3000";
  const url = `${baseURL}${endpoint}`;

  const options = {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Aggiungi token se esiste
  const token = getToken();
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  // Aggiungi body se esiste
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // Se non autenticato, redirect a login
    if (response.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return;
    }

    // Se errore server
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Ritorna i dati
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Test di connessione
async function testConnection() {
  try {
    const result = await apiCall("GET", "/api/health");
    console.log("✅ Server connesso:", result);
    return true;
  } catch (error) {
    console.error("❌ Server non raggiungibile:", error);
    return false;
  }
}

// Test al caricamento pagina
document.addEventListener("DOMContentLoaded", () => {
  testConnection();
});
