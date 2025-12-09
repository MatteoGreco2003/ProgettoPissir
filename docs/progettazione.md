# 📋 MOBISHARE - Relazione Tecnica di Progettazione

### Matteo Greco & Francesco Merenda

### Università del Piemonte Orientale - A.A. 2025-20256

### Dicembre 2025

---

## 📑 INDICE

1. [SPECIFICA DEL SISTEMA](#1-specifica-del-sistema)

   - 1.1 Analisi dei Requisiti Funzionali
   - 1.2 Analisi dei Requisiti Non Funzionali
   - 1.3 Casi d'Uso
   - 1.4 Diagrammi UML

2. [PROGETTAZIONE DEL SISTEMA](#2-progettazione-del-sistema)

   - 2.1 Architettura Generale
   - 2.2 Microservizi Identificati
   - 2.3 Database Schema
   - 2.4 Architettura MQTT e IoT
   - 2.5 API REST Endpoints
   - 2.6 Diagrammi di Sequenza

3. [IMPLEMENTAZIONE](#3-implementazione)

   - 3.1 Stack Tecnologico
   - 3.2 Struttura Progetto
   - 3.3 Setup Ambiente

4. [TESTING](#4-testing)

   - 4.1 Test Unitari
   - 4.2 Test di Integrazione

5. [DEMO E CONSEGNA](#5-demo-e-consegna)

---

## 1. SPECIFICA DEL SISTEMA

### 1.1 Analisi dei Requisiti Funzionali

**RF01 - Gestione Utenti**

- Registrazione con email, nome, cognome, password
- Login con credenziali
- Visualizzazione profilo personale
- Modifica dati personali
- Ricarica credito
- Visualizzazione saldo disponibile
- Sospensione account (per gestori)

**RF02 - Gestione Mezzi**

- Visualizzazione lista mezzi disponibili
- Visualizzazione stato batteria
- Visualizzazione posizione (parcheggio)
- CRUD mezzi (solo gestori)
- Consultazione storico utilizzo mezzo
- Segnalazione malfunzionamenti

**RF03 - Gestione Corse**

- Prenotazione mezzo (sblocco via MQTT)
- Inizio corsa con timestamp
- Fine corsa con calcolo costo
- Visualizzazione durata corsa
- Visualizzazione storico corse
- Blocco mezzo automatico (via MQTT)
- Protezione durante corsa attiva (no logout, no chiusura browser)

**RF04 - Gestione Parcheggi**

- Visualizzazione lista parcheggi
- Visualizzazione posizione GPS
- Visualizzazione capacità e disponibilità
- CRUD parcheggi (solo gestori)
- Consultazione mezzi presenti

**RF05 - Sistema Transazioni**

- Registrazione pagamenti corse
- Registrazione ricariche
- Visualizzazione storico transazioni
- Bilancio saldo

**RF06 - Sistema Segnalazioni**

- Creazione segnalazioni malfunzionamenti
- Visualizzazione segnalazioni
- Cambio stato segnalazioni (solo gestori)
- Prioritizzazione manutentore

**RF07 - Comunicazione IoT (MQTT)**

- Ricezione dati batteria mezzi (topic: `Parking/+/Mezzi/battery`)
- Invio comandi sblocco/blocco (topic: `Parking/+/StatoMezzi/+`)
- Ricezione segnalazioni guasti (topic: `Parking/+/Mezzi/malfunction`)
- Invio comandi LED (topic: `Parking/+/LED/+`)

### 1.2 Analisi dei Requisiti Non Funzionali

**RNF01 - Performance**

- Risposta API < 200ms (in condizioni normali)
- Database query ottimizzate con indici
- MQTT broker con QoS 1

**RNF02 - Scalabilità**

- Architettura a microservizi per modularità
- Database relazionale (PostgreSQL) per consistenza
- Support MQTT per IoT distribuito

**RNF03 - Sicurezza**

- Password hashed con BCrypt (work factor 12)
- JWT token con expiration (24 ore)
- Middleware di autenticazione su endpoint protetti
- Validazione input tramite Pydantic/Joi
- CORS configurato

**RNF04 - Usabilità**

- Interfaccia responsive (mobile + desktop)
- Design intuitivo con Material Design
- Feedback visuale per azioni utente

**RNF05 - Disponibilità**

- MQTT reconnection automatica
- Database connection pooling
- Logging centralizzato per debugging

### 1.3 Casi d'Uso Principali

#### **UC1: Registrazione e Login**

- **Attori**: Utente
- **Precondizioni**: Accesso alla app senza autenticazione
- **Flusso**:
  1. Utente clicca "Registrati"
  2. Inserisce email, nome, cognome, password
  3. Sistema valida email (formato e unicità)
  4. Sistema hashizza password con BCrypt
  5. Sistema crea record utente in database
  6. Utente riceve conferma registrazione
  7. Utente accede con email e password
  8. Sistema genera JWT token (scadenza 24h)
  9. Sistema salva token in localStorage
  10. Utente reindirizzato a dashboard personale
- **Postcondizioni**: Utente autenticato, accesso alle funzionalità

#### **UC2: Prenotazione e Utilizzo Mezzo**

- **Attori**: Utente, Sistema MQTT
- **Precondizioni**: Utente autenticato, saldo > 0, mezzo disponibile
- **Flusso**:
  1. Utente visualizza lista mezzi in dashboard
  2. Utente clicca "Prenota" su mezzo disponibile
  3. Sistema verifica saldo sufficiente
  4. Sistema verifica assenza corsa attiva
  5. Sistema crea record corsa con stato "in_corso"
  6. Sistema pubblica comando MQTT unlock: `Parking/{id}/StatoMezzi/{id_mezzo}`
  7. Sistema pubblica comando LED on: `Parking/{id}/LED/{id_mezzo}`
  8. Dispositivo IoT sblocca mezzo
  9. Sistema aggiorna stato mezzo a "in_uso"
  10. Utente visualizza schermata "Corsa Attiva" con timer
  11. [Durante corsa] Utente vede durata e costo in tempo reale
  12. Utente seleziona parcheggio di rilascio
  13. Utente clicca "Termina Corsa"
  14. Sistema calcola durata: `durata = ora_fine - ora_inizio`
  15. Sistema calcola costo:
      - Se durata <= 30 min: costo = 1.0€
      - Se durata > 30 min: costo = 1.0€ + (durata - 30) \* 0.25€
  16. Sistema decrementa saldo utente
  17. Sistema crea record transazione
  18. Sistema pubblica comando MQTT lock: `Parking/{id}/StatoMezzi/{id_mezzo}`
  19. Sistema pubblica comando LED off: `Parking/{id}/LED/{id_mezzo}`
  20. Sistema aggiorna stato mezzo a "disponibile"
  21. Dispositivo IoT blocca mezzo
  22. Utente visualizza riepilogo corsa (durata, costo, saldo residuo)
- **Postcondizioni**: Corsa completata, mezzo disponibile, saldo aggiornato

#### **UC3: Segnalazione Malfunzionamento**

- **Attori**: Utente, Gestore
- **Precondizioni**: Mezzo ha problemi
- **Flusso**:
  1. Utente visualizza mezzo difettoso o durante corsa
  2. Utente clicca "Segnala Problema"
  3. Utente seleziona tipo problema (batteria bassa, freni, altro)
  4. Utente inserisce descrizione
  5. Sistema crea record segnalazione con stato "aperta"
  6. Utente riceve conferma
  7. [Lato Gestore] Gestore visualizza segnalazioni aperte
  8. Gestore cambia stato a "in_lavorazione"
  9. Gestore risolve problema
  10. Gestore cambia stato a "risolta"
- **Postcondizioni**: Segnalazione registrata, mezzo manutenzione programmata

#### **UC4: Visualizzazione Storico e Statistiche**

- **Attori**: Utente, Gestore, Admin
- **Precondizioni**: Utente autenticato
- **Flusso**:
  1. Utente clicca "Storico Corse"
  2. Sistema recupera tutte le corse dell'utente dal database
  3. Sistema mostra lista con: data, mezzo, durata, costo
  4. Utente può visualizzare dettagli singola corsa
  5. [Gestore] Gestore accede a dashboard admin
  6. Gestore visualizza statistiche: corse totali, ricavi, utilizzo mezzi
  7. Sistema aggrega dati da database con query SQL
- **Postcondizioni**: Dati visualizzati correttamente

### 1.4 Diagrammi UML

#### **Diagramma dei Casi d'Uso**

```
┌─────────────────────────────────────────────────┐
│                    MOBISHARE                     │
└─────────────────────────────────────────────────┘

            ┌─────────────┐
            │   Utente    │
            └─────────────┘
                  │
        ┌─────────┼─────────────┬──────────────┐
        │         │             │              │
     (UC1)     (UC2)         (UC3)          (UC4)
        │         │             │              │
   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │Registr. │ │Prenota   │ │Segnala  │ │Visualizza│
   │e Login  │ │Mezzo     │ │Problema │ │Storico   │
   └─────────┘ └──────────┘ └──────────┘ └──────────┘

            ┌──────────────┐
            │   Gestore    │
            └──────────────┘
                  │
        ┌─────────┴──────────┬──────────────┐
        │                    │              │
     (RF02)               (RF06)          (UC4)
        │                    │              │
   ┌─────────────┐   ┌──────────────┐ ┌──────────┐
   │Gestisci     │   │Gestisci      │ │Dashboard │
   │Mezzi (CRUD) │   │Segnalazioni  │ │Admin     │
   └─────────────┘   └──────────────┘ └──────────┘

            ┌──────────────┐
            │ Sistema MQTT │
            └──────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
     (RF07)              (RF07)
        │                    │
   ┌─────────────┐   ┌──────────────┐
   │Ricezione    │   │Invio Comandi │
   │Batteria/    │   │Unlock/Lock   │
   │Malfunz.     │   │LED           │
   └─────────────┘   └──────────────┘
```

#### **Diagramma delle Classi del Dominio**

```
┌──────────────────────────┐
│         User             │
├──────────────────────────┤
│ - id: integer (PK)       │
│ - email: string (unique) │
│ - password_hash: string  │
│ - nome: string           │
│ - cognome: string        │
│ - saldo: decimal         │
│ - stato: enum            │
│ - data_registrazione: ts │
├──────────────────────────┤
│ + register()             │
│ + login()                │
│ + updateProfile()        │
│ + rechargeCredit()       │
└──────────────────────────┘
          │ 1
          │ * (corse)
          ├─────────────────────────┐
          │                         │
          ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────┐
│        Ride              │  │    Transaction       │
├──────────────────────────┤  ├──────────────────────┤
│ - id: integer (PK)       │  │ - id: integer (PK)   │
│ - id_utente: fk          │  │ - id_utente: fk      │
│ - id_mezzo: fk           │  │ - tipo: enum         │
│ - id_parcheggio_inizio:fk│  │ - importo: decimal   │
│ - id_parcheggio_fine: fk │  │ - data_ora: ts       │
│ - data_ora_inizio: ts    │  │ - id_corsa: fk       │
│ - data_ora_fine: ts      │  │ - descrizione: text  │
│ - durata_minuti: integer │  ├──────────────────────┤
│ - costo: decimal         │  │ + recordRecharge()   │
│ - stato: enum            │  │ + recordPayment()    │
├──────────────────────────┤  └──────────────────────┘
│ + startRide()            │
│ + endRide()              │
│ + calculateCost()        │
└──────────────────────────┘
          │ * (mezzi)
          │
          ▼
┌──────────────────────────┐
│       Vehicle            │
├──────────────────────────┤
│ - id: integer (PK)       │
│ - tipo: enum             │
│ - id_parcheggio: fk      │
│ - stato: enum            │
│ - batteria: integer      │
│ - codice_identificativo: │
│ - tariffa_minuto: decimal│
├──────────────────────────┤
│ + unlock()               │
│ + lock()                 │
│ + updateBattery()        │
│ + reportDamage()         │
└──────────────────────────┘
          │ * (parcheggi)
          │
          ▼
┌──────────────────────────┐
│       Parking            │
├──────────────────────────┤
│ - id: integer (PK)       │
│ - nome: string           │
│ - latitudine: decimal    │
│ - longitudine: decimal   │
│ - capacita: integer      │
│ - disponibili: integer   │
├──────────────────────────┤
│ + getMezzi()             │
│ + getAvailableSpots()    │
└──────────────────────────┘

┌──────────────────────────┐
│       Report             │
├──────────────────────────┤
│ - id: integer (PK)       │
│ - id_utente: fk          │
│ - id_mezzo: fk           │
│ - tipo_problema: enum    │
│ - descrizione: text      │
│ - data_ora: ts           │
│ - stato: enum            │
├──────────────────────────┤
│ + createReport()         │
│ + updateStatus()         │
└──────────────────────────┘

┌──────────────────────────┐
│       Feedback           │
├──────────────────────────┤
│ - id: integer (PK)       │
│ - id_utente: fk          │
│ - id_mezzo: fk           │
│ - rating: integer (1-5)  │
│ - commento: text         │
│ - data_ora: ts           │
├──────────────────────────┤
│ + leaveFeedback()        │
└──────────────────────────┘
```

---

## 2. PROGETTAZIONE DEL SISTEMA

### 2.1 Architettura Generale

**Architettura a Microservizi con 3 Layer:**

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (Frontend)               │
│  HTML/CSS/JavaScript - Comunicazione via HTTP REST      │
│  - index.html (login)                                   │
│  - dashboard-utente.html (home + mezzi)                 │
│  - dashboard-gestore.html (admin panel)                 │
└─────────────────────────────────────────────────────────┘
                            │ HTTP REST
                            ▼
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Express.js Backend)             │
│  - Autenticazione (JWT + BCrypt)                        │
│  - 8 Microservizi separati (routes)                     │
│  - Validazione input                                    │
│  - CORS configurato                                     │
│                                                         │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ Auth MS  │ Users MS │Vehicles │ Parking  │ ...     │
│  │(routes/) │(routes/) │ (routes)│(routes)  │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
└─────────────────────────────────────────────────────────┘
            │ SQL                       │ MQTT
            ▼                           ▼
┌─────────────────────────────┐  ┌──────────────────┐
│  DATABASE LAYER             │  │  IoT LAYER       │
│  PostgreSQL                 │  │  MQTT Broker     │
│  - 7 Tabelle               │  │  - Subscribe     │
│  - Foreign Keys            │  │  - Publish       │
│  - Indici Optimized        │  │  - QoS 1         │
│  - Connection Pooling      │  │  - Sensors/Actuators
└─────────────────────────────┘  └──────────────────┘
```

### 2.2 Microservizi Identificati

**Responsabilità divise tra Matteo (Frontend) e Francesco (Backend):**

#### **MS01: Autenticazione (auth.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - POST `/api/auth/register` - Registrazione con validazione
  - POST `/api/auth/login` - Login con JWT token
  - Middleware di verifica token

#### **MS02: Gestione Utenti (users.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - GET `/api/users/me` - Profilo autenticato
  - PUT `/api/users/me` - Aggiornamento profilo

#### **MS03: Gestione Mezzi (vehicles.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - GET `/api/vehicles` - Lista mezzi
  - POST `/api/vehicles` - Creazione (solo gestore)
  - PUT `/api/vehicles/:id` - Modifica mezzo
  - DELETE `/api/vehicles/:id` - Eliminazione
  - Sincronizzazione batteria da MQTT

#### **MS04: Gestione Parcheggi (parking.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - GET `/api/parking` - Lista parcheggi
  - POST `/api/parking` - Creazione
  - PUT `/api/parking/:id` - Modifica
  - DELETE `/api/parking/:id` - Eliminazione

#### **MS05: Gestione Corse (rides.js)**

- **Responsabile**: Francesco (backend logic) + Matteo (UI)
- **Funzionalità**:
  - POST `/api/rides/start` - Inizio corsa + MQTT unlock
  - POST `/api/rides/:id/end` - Fine corsa + calcolo costo + MQTT lock
  - GET `/api/rides/me` - Storico corse
  - GET `/api/rides/active` - Corsa attiva
  - **Business Logic**: Calcolo costo, validazione saldo, protezione durante corsa

#### **MS06: Gestione Transazioni (transactions.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - POST `/api/transactions/recharge` - Ricarica credito
  - GET `/api/transactions/history` - Storico transazioni

#### **MS07: Gestione Segnalazioni (reports.js)**

- **Responsabile**: Francesco
- **Funzionalità**:
  - POST `/api/reports` - Creazione segnalazione
  - GET `/api/reports` - Lista (filtrate per gestore)
  - PUT `/api/reports/:id` - Cambio stato

#### **MS08: Feedback Utenti (feedback.js) - FUNZIONALITÀ ACCESSORIA**

- **Responsabile**: Francesco
- **Funzionalità**:
  - POST `/api/feedback` - Lasciare valutazione mezzo
  - GET `/api/feedback` - Liste feedback

#### **Frontend (Matteo)**

- Componente Login/Register
- Componente Dashboard Utente
- Componente Dashboard Gestore
- Componente Ride (corsa attiva)
- CSS responsive
- API Client (fetch wrapper)

### 2.3 Database Schema

**PostgreSQL con 7 Tabelle + 1 Accessoria:**

```sql
-- 1. UTENTI
CREATE TABLE utenti (
  id_utente SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(100),
  cognome VARCHAR(100),
  saldo DECIMAL(10, 2) DEFAULT 0.00,
  stato_account ENUM('attivo', 'sospeso', 'eliminato') DEFAULT 'attivo',
  data_registrazione TIMESTAMP DEFAULT NOW()
);

-- 2. PARCHEGGI
CREATE TABLE parcheggi (
  id_parcheggio SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  latitudine DECIMAL(10, 8),
  longitudine DECIMAL(11, 8),
  capacita INTEGER,
  creato_il TIMESTAMP DEFAULT NOW()
);

-- 3. MEZZI
CREATE TABLE mezzi (
  id_mezzo SERIAL PRIMARY KEY,
  tipo_mezzo VARCHAR(50), -- 'monopattino', 'bicicletta'
  id_parcheggio INTEGER NOT NULL REFERENCES parcheggi(id_parcheggio),
  stato VARCHAR(50) DEFAULT 'disponibile', -- 'disponibile', 'in_uso', 'in_manutenzione'
  stato_batteria INTEGER DEFAULT 100,
  codice_identificativo VARCHAR(100) UNIQUE,
  tariffa_minuto DECIMAL(5, 2) DEFAULT 0.25,
  creato_il TIMESTAMP DEFAULT NOW()
);

-- 4. CORSE
CREATE TABLE storico_corse (
  id_corsa SERIAL PRIMARY KEY,
  id_utente INTEGER NOT NULL REFERENCES utenti(id_utente),
  id_mezzo INTEGER NOT NULL REFERENCES mezzi(id_mezzo),
  id_parcheggio_inizio INTEGER NOT NULL REFERENCES parcheggi(id_parcheggio),
  id_parcheggio_fine INTEGER REFERENCES parcheggi(id_parcheggio),
  data_ora_inizio TIMESTAMP NOT NULL,
  data_ora_fine TIMESTAMP,
  durata_minuti INTEGER,
  costo DECIMAL(10, 2),
  stato_corsa VARCHAR(50) DEFAULT 'in_corso' -- 'in_corso', 'completata'
);

-- 5. TRANSAZIONI
CREATE TABLE storico_transazioni (
  id_transazione SERIAL PRIMARY KEY,
  id_utente INTEGER NOT NULL REFERENCES utenti(id_utente),
  tipo_transazione VARCHAR(50), -- 'ricarica', 'pagamento_corsa'
  importo DECIMAL(10, 2),
  data_ora TIMESTAMP DEFAULT NOW(),
  id_corsa INTEGER REFERENCES storico_corse(id_corsa),
  descrizione TEXT
);

-- 6. SEGNALAZIONI
CREATE TABLE segnalazioni_malfunzionamento (
  id_segnalazione SERIAL PRIMARY KEY,
  id_utente INTEGER NOT NULL REFERENCES utenti(id_utente),
  id_mezzo INTEGER NOT NULL REFERENCES mezzi(id_mezzo),
  tipo_problema VARCHAR(100),
  descrizione TEXT,
  data_ora TIMESTAMP DEFAULT NOW(),
  stato_segnalazione VARCHAR(50) DEFAULT 'aperta' -- 'aperta', 'in_lavorazione', 'risolta'
);

-- 7. FEEDBACK (ACCESSORIO)
CREATE TABLE feedback (
  id_feedback SERIAL PRIMARY KEY,
  id_utente INTEGER NOT NULL REFERENCES utenti(id_utente),
  id_mezzo INTEGER NOT NULL REFERENCES mezzi(id_mezzo),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  commento TEXT,
  data_ora TIMESTAMP DEFAULT NOW()
);

-- INDICI PER PERFORMANCE
CREATE INDEX idx_utenti_email ON utenti(email);
CREATE INDEX idx_mezzi_parcheggio ON mezzi(id_parcheggio);
CREATE INDEX idx_corse_utente ON storico_corse(id_utente);
CREATE INDEX idx_corse_mezzo ON storico_corse(id_mezzo);
CREATE INDEX idx_transazioni_utente ON storico_transazioni(id_utente);
CREATE INDEX idx_segnalazioni_mezzo ON segnalazioni_malfunzionamento(id_mezzo);
```

### 2.4 Architettura MQTT e IoT

**Topic Structure:**

```
Parking/{id_parking}/
├── Mezzi/
│   ├── battery          ← SENSORE: Livello batteria da IoT
│   └── malfunction      ← SENSORE: Guasti segnalati da IoT
├── StatoMezzi/
│   └── {id_mezzo}       ← ATTUATORE: Comandi unlock/lock dal Backend
└── LED/
    └── {id_mezzo}       ← ATTUATORE: Comandi LED dal Backend
```

**Message Formats:**

**Batteria (Subscribe - Backend riceve):**

```json
{
  "id_mezzo": 1,
  "battery_level": 85,
  "timestamp": "2024-12-09T14:30:00Z"
}
```

**Comando Unlock (Publish - Backend invia):**

```json
{
  "id_mezzo": 1,
  "command": "unlock",
  "timestamp": "2024-12-09T14:30:00Z",
  "user_id": 42
}
```

**Segnalazione Guasto (Subscribe - Backend riceve):**

```json
{
  "id_mezzo": 2,
  "issue_type": "brake_failure",
  "severity": "high",
  "timestamp": "2024-12-09T14:31:00Z"
}
```

**Configurazione QoS:** QoS 1 (At Least Once) su tutti i topic

### 2.5 API REST Endpoints

**Base URL:** `http://localhost:3000/api`

#### **Authentication Endpoints**

```yaml
POST /auth/register
  Description: Registrazione nuovo utente
  Request:
    - nome (string, required)
    - cognome (string, required)
    - email (string, required, unique format)
    - password (string, required, min 8 chars)
  Response 201:
    message: string
    user_id: integer
  Response 400:
    error: string (email duplicate, password weak, etc)

POST /auth/login
  Description: Login con credenziali
  Request:
    - email (string)
    - password (string)
  Response 200:
    access_token: string (JWT)
    token_type: "bearer"
    user:
      id_utente: integer
      nome: string
      cognome: string
      email: string
      saldo: decimal
      stato_account: enum
  Response 401:
    error: "Invalid credentials" | "Account suspended"
```

#### **Users Endpoints**

```yaml
GET /users/me
  Headers:
    Authorization: Bearer {token}
  Response 200:
    id_utente: integer
    nome: string
    cognome: string
    email: string
    saldo: decimal
    stato_account: enum

PUT /users/me
  Headers:
    Authorization: Bearer {token}
  Request:
    - nome (string, optional)
    - cognome (string, optional)
  Response 200:
    message: string
    user: { ...user_data }
```

#### **Vehicles Endpoints**

```yaml
GET /vehicles
  Query Params (optional):
    - tipo_mezzo: filter by type
    - id_parcheggio: filter by parking
    - stato: filter by state
  Response 200:
    - id_mezzo: integer
    - tipo_mezzo: string
    - stato: enum
    - stato_batteria: integer (0-100)
    - id_parcheggio: integer
    - tariffa_minuto: decimal
    - codice_identificativo: string

POST /vehicles
  Headers:
    Authorization: Bearer {token} (gestore only)
  Request:
    - tipo_mezzo: string
    - id_parcheggio: integer
    - tariffa_minuto: decimal
  Response 201: vehicle_object

PUT /vehicles/{id}
  Headers:
    Authorization: Bearer {token} (gestore only)
  Request: (partial update)
  Response 200: vehicle_object

DELETE /vehicles/{id}
  Headers:
    Authorization: Bearer {token} (gestore only)
  Response 204: No Content
```

#### **Rides Endpoints**

```yaml
POST /rides/start
  Headers:
    Authorization: Bearer {token}
  Request:
    - id_mezzo: integer
  Response 200:
    id_corsa: integer
    id_mezzo: integer
    data_ora_inizio: timestamp
    parcheggio_inizio: string
    tariffa_minuto: decimal
    message: string
  Response 400: Vehicle not available | User has active ride
  Response 402: Insufficient balance

POST /rides/{ride_id}/end
  Headers:
    Authorization: Bearer {token}
  Request:
    - id_parcheggio_fine: integer
  Response 200:
    id_corsa: integer
    durata_minuti: integer
    costo: decimal
    saldo_residuo: decimal
    parcheggio_fine: string
    message: string

GET /rides/me
  Headers:
    Authorization: Bearer {token}
  Response 200:
    - id_corsa: integer
    - id_mezzo: integer
    - data_ora_inizio: timestamp
    - data_ora_fine: timestamp
    - durata_minuti: integer
    - costo: decimal
    - stato_corsa: enum

GET /rides/active
  Headers:
    Authorization: Bearer {token}
  Response 200:
    id_corsa: integer
    id_mezzo: integer
    data_ora_inizio: timestamp
    durata_corrente_minuti: integer
    costo_stimato: decimal
  Response 404: No active ride
```

#### **Transactions Endpoints**

```yaml
POST /transactions/recharge
  Headers:
    Authorization: Bearer {token}
  Request:
    - importo: decimal (min 1.0)
  Response 200:
    message: string
    nuovo_saldo: decimal
    id_transazione: integer

GET /transactions/history
  Headers:
    Authorization: Bearer {token}
  Response 200:
    - id_transazione: integer
    - tipo_transazione: enum
    - importo: decimal
    - data_ora: timestamp
    - descrizione: string
```

#### **Parking Endpoints**

```yaml
GET /parking
  Response 200:
    - id_parcheggio: integer
    - nome: string
    - latitudine: decimal
    - longitudine: decimal
    - capacita: integer
    - disponibili: integer

POST /parking
  Headers:
    Authorization: Bearer {token} (gestore)
  Request: parking_data
  Response 201: parking_object

PUT /parking/{id}
  Headers:
    Authorization: Bearer {token} (gestore)
  Response 200: parking_object

DELETE /parking/{id}
  Headers:
    Authorization: Bearer {token} (gestore)
  Response 204: No Content
```

#### **Reports Endpoints**

```yaml
POST /reports
  Headers:
    Authorization: Bearer {token}
  Request:
    - id_mezzo: integer
    - tipo_problema: string
    - descrizione: string
  Response 201:
    id_segnalazione: integer
    message: string

GET /reports
  Headers:
    Authorization: Bearer {token} (gestore)
  Response 200:
    - id_segnalazione: integer
    - id_mezzo: integer
    - tipo_problema: string
    - stato_segnalazione: enum
    - data_ora: timestamp

PUT /reports/{id}
  Headers:
    Authorization: Bearer {token} (gestore)
  Request:
    - stato_segnalazione: enum
  Response 200: report_object
```

#### **Feedback Endpoints (ACCESSORIO)**

```yaml
POST /feedback
  Headers:
    Authorization: Bearer {token}
  Request:
    - id_mezzo: integer
    - rating: integer (1-5)
    - commento: string
  Response 201: feedback_object

GET /feedback
  Response 200: feedback_list
```

### 2.6 Diagrammi di Sequenza

#### **Sequence Diagram: Inizio Corsa**

```
Utente        Frontend        Backend        MQTT        IoT Device
  │              │               │            │               │
  │──Clicca      │               │            │               │
  │"Prenota"────>│               │            │               │
  │              │─POST /rides/  │            │               │
  │              │start────────>│            │               │
  │              │               │ Valida     │               │
  │              │               │ saldo      │               │
  │              │               │ Crea       │               │
  │              │               │ record     │               │
  │              │               │ Publish    │               │
  │              │               │ MQTT────────>│──Unlock──>│
  │              │               │ unlock     │               │
  │              │               │ Aggiorna   │               │
  │              │               │ stato      │               │
  │              │<─200 OK───────│            │               │
  │<─Dashboard   │               │            │               │
  │corsa attiva  │               │            │               │
  │              │               │            │               │
```

#### **Sequence Diagram: Fine Corsa**

```
Utente        Frontend        Backend        MQTT        Database
  │              │               │            │               │
  │──Clicca      │               │            │               │
  │"Termina"────>│               │            │               │
  │              │─POST /rides/  │            │               │
  │              │end────────────>│           │               │
  │              │               │ Calcola   │               │
  │              │               │ durata    │               │
  │              │               │ Calcola   │               │
  │              │               │ costo     │               │
  │              │               │ Lock      │               │
  │              │               │ MQTT────────>│             │
  │              │               │ Decrementa│               │
  │              │               │ saldo─────────────────────>│
  │              │               │ Crea      │               │
  │              │               │ transaz.──────────────────>│
  │              │               │           │               │
  │              │<─200 OK───────│           │               │
  │<─Riepilogo   │               │           │               │
  │corsa         │               │           │               │
  │              │               │           │               │
```

---

## 3. IMPLEMENTAZIONE

### 3.1 Stack Tecnologico

**Backend (Francesco):**

- **Runtime**: Node.js v18+
- **Framework**: Express.js 4.18+
- **ORM**: Sequelize 6.35+ (SQLAlchemy equivalent per JavaScript)
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken) + BCrypt (bcryptjs)
- **IoT**: MQTT (paho-mqtt client)
- **Validation**: Middleware custom (o express-validator)
- **CORS**: cors 2.8+
- **Environment**: dotenv 16+

**Frontend (Matteo):**

- **HTML5** + **CSS3** (Responsive)
- **JavaScript (ES6+)**
- **API Client**: Fetch API
- **Storage**: localStorage (token persistence)

**Infrastructure:**

- **Message Broker**: Mosquitto MQTT
- **VCS**: Git + GitHub

### 3.2 Struttura Progetto

```
Mobishare/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Parking.js
│   │   ├── Ride.js
│   │   ├── Transaction.js
│   │   ├── Report.js
│   │   └── Feedback.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── vehicles.js
│   │   ├── parking.js
│   │   ├── rides.js
│   │   ├── transactions.js
│   │   ├── reports.js
│   │   └── feedback.js
│   ├── middleware/
│   │   └── auth.js (JWT verification)
│   ├── mqtt/
│   │   └── client.js (MQTT connection & handlers)
│   ├── server.js (Express app entry)
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── public/
│   │   ├── index.html (login/register)
│   │   ├── dashboard-utente.html (user home)
│   │   ├── dashboard-gestore.html (admin panel)
│   │   ├── ride.html (active ride overlay)
│   │   ├── profilo.html (user profile)
│   │   ├── css/
│   │   │   ├── style.css (main styles)
│   │   │   └── responsive.css (mobile optimized)
│   │   └── js/
│   │       ├── api.js (fetch wrapper)
│   │       ├── auth.js (login/register logic)
│   │       ├── dashboard-utente.js (user UI)
│   │       ├── dashboard-gestore.js (admin UI)
│   │       └── utils.js (helpers)
│   └── .gitignore
│
├── iot-simulator/
│   ├── simulator.js (MQTT pub/sub simulator)
│   ├── package.json
│   └── scenarios.json (test scenarios)
│
├── docs/
│   ├── progettazione.md (this file)
│   ├── uml-usecase.png (export from diagrams.net)
│   ├── uml-class.png (export from diagrams.net)
│   └── uml-sequence-ride.png
│
├── .gitignore
└── README.md (setup instructions)
```

### 3.3 Setup Ambiente

**Step 1: Clone Repo**

```bash
git clone https://github.com/matteomrr/mobishare.git
cd mobishare
```

**Step 2: Backend Setup (Francesco)**

```bash
cd backend
npm install
cp .env.example .env
# Configura .env con credenziali PostgreSQL e JWT_SECRET
createdb mobishare_db
npm start  # Avvia su http://localhost:3000
```

**Step 3: Frontend Setup (Matteo)**

```bash
cd frontend
# Apri public/index.html nel browser o usa un dev server
# Opzionale: npm install -D http-server && npx http-server public
```

**Step 4: MQTT Broker**

```bash
# macOS
brew install mosquitto
brew services start mosquitto

# Linux
sudo apt-get install mosquitto
sudo systemctl start mosquitto

# Windows: Download installer
```

**Step 5: Test API**

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test","cognome":"User","email":"test@example.com","password":"Test1234"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

---

## 4. TESTING

### 4.1 Test Unitari

**Test Auth Module**

```javascript
// test/auth.test.js
describe("Auth Module", () => {
  test("register: valida email duplicata", () => {
    // 1. Register primo utente
    // 2. Register con stessa email
    // 3. Expect: error "Email already exists"
  });

  test("login: valida password corretta", () => {
    // 1. Register utente
    // 2. Login con password corretta
    // 3. Expect: JWT token returned
  });

  test("login: rifiuta password sbagliata", () => {
    // 1. Register utente
    // 2. Login con password sbagliata
    // 3. Expect: 401 Unauthorized
  });

  test("JWT token: verifica expiration", () => {
    // 1. Crea token con scadenza 1 minuto
    // 2. Aspetta 2 minuti
    // 3. Usa token in richiesta
    // 4. Expect: 401 Token expired
  });
});
```

**Test Rides Module**

```javascript
describe('Rides Module', () => {
  test('startRide: blocca se mezzo non disponibile', () => {
    // 1. Prendi mezzo disponibile
    // 2. Startride con utente A
    // 3. Startride con utente B (mezzo stesso)
    // 4. Expect: 400 Vehicle not available
  })

  test('startRide: calcola costo correttamente', () => {
    // 1. Startride
    // 2. Aspetta 45 minuti (simula con time mock)
    // 3. Endride
    // 4. Expect: costo = 1.0 + (45-30)*0.25 = 4.75
  })

  test('endRide: rifiuta se mezzo non in uso', () => {
    // 1. Crea ride con stato 'completata'
    // 2. Prova endride su ride completata
    // 3. Expect: 400 Ride already completed
  })

  test('MQTT: pubblica unlock command all'inizio', () => {
    // 1. Mock MQTT publish
    // 2. Startride
    // 3. Expect: publish called con topic "Parking/X/StatoMezzi/Y"
  })

  test('MQTT: pubblica lock command alla fine', () => {
    // 1. Startride
    // 2. Endride
    // 3. Expect: publish called con topic lock command
  })
})
```

**Test Vehicles Module**

```javascript
describe("Vehicles Module", () => {
  test("getBattery: aggiorna da MQTT message", () => {
    // 1. Simula MQTT message con batteria 85%
    // 2. Verifica database aggiornato
    // 3. Expect: vehicle.batteria === 85
  });

  test("getBattery: crea segnalazione se < 20%", () => {
    // 1. Simula MQTT message con batteria 15%
    // 2. Verifica segnalazione creata
    // 3. Expect: report.tipo_problema === 'batteria_bassa'
  });
});
```

**Test Transactions Module**

```javascript
describe("Transactions Module", () => {
  test("recharge: aumenta saldo utente", () => {
    // 1. User saldo = 10.00
    // 2. Recharge 50.00
    // 3. Expect: user.saldo === 60.00
  });

  test("payment: decrementa saldo dopo corsa", () => {
    // 1. User saldo = 100.00
    // 2. Startride + endride (costo 3.75)
    // 3. Expect: user.saldo === 96.25
  });

  test("payment: sospende account se saldo negativo", () => {
    // 1. User saldo = 2.00
    // 2. Startride + endride (costo 5.00, risultato -3.00)
    // 3. Expect: user.stato_account === 'sospeso'
  });
});
```

### 4.2 Test di Integrazione

**Test End-to-End: Full Ride Flow**

```javascript
describe("E2E: Full Ride Workflow", () => {
  test("registro -> login -> prenota -> termina -> storico", async () => {
    // 1. POST /auth/register
    //    - Crea utente nel database
    //    - Password hashata con BCrypt
    // 2. POST /auth/login
    //    - Genera JWT token
    //    - Ritorna user object con saldo
    // 3. GET /vehicles
    //    - Ritorna lista mezzi disponibili
    // 4. POST /rides/start
    //    - Valida JWT
    //    - Verifica saldo > 0
    //    - Verifica mezzo disponibile
    //    - Crea record ride con stato 'in_corso'
    //    - Pubblica MQTT unlock command
    //    - Ritorna id_corsa
    // 5. Simulate MQTT: Ricevi batteria update
    //    - Backend riceve e aggiorna vehicle.batteria
    // 6. POST /rides/{id}/end
    //    - Calcola durata: 35 minuti
    //    - Calcola costo: 1.0 + (35-30)*0.25 = 2.25
    //    - Decrementa user.saldo
    //    - Crea transaction
    //    - Pubblica MQTT lock command
    //    - Aggiorna mezzo a 'disponibile'
    // 7. GET /rides/me
    //    - Ritorna storico con corsa appena completata
    //    - Verifica costo === 2.25
    // 8. GET /users/me
    //    - Verifica saldo aggiornato (original - 2.25)
    // Expect: Tutti gli step completati con successo
  });
});
```

**Test MQTT Integration**

```javascript
describe("MQTT Integration Tests", () => {
  test("ricezione batteria aggiorna vehicle", (done) => {
    // 1. Connetti a MQTT broker
    // 2. Pubblica messaggio su 'Parking/1/Mezzi/battery'
    //    { "id_mezzo": 1, "battery_level": 75 }
    // 3. Aspetta callback on_message
    // 4. Verifica DB: SELECT batteria FROM mezzi WHERE id=1
    // 5. Expect: batteria === 75
  });

  test("segnalazione batteria bassa crea report", (done) => {
    // 1. Pubblica MQTT battery message con level 15
    // 2. Backend dovrebbe:
    //    - Aggiornare batteria
    //    - Rilevare 15 < 20
    //    - Creare segnalazione
    // 3. Verifica DB: SELECT * FROM segnalazioni WHERE id_mezzo=1
    // 4. Expect: tipo_problema === 'batteria_bassa'
  });

  test("comando unlock viene pubblicato correttamente", (done) => {
    // 1. Mock MQTT publisher
    // 2. POST /rides/start
    // 3. Verifica publisher.publish() called
    // 4. Verifica topic === "Parking/{id}/StatoMezzi/{mezzo_id}"
    // 5. Verifica message contiene "unlock"
  });
});
```

---

## 5. DEMO E CONSEGNA

### 5.1 Demo Script

**Sessione demo (15 minuti):**

1. **Intro** (1 min)

   - "Questo è Mobishare, un sistema di sharing mobility con integrazione IoT"
   - Mostrare architettura su lavagna/slide

2. **Registrazione e Login** (2 min)

   - Aprire browser → index.html
   - Registrare nuovo utente: "demo@example.com" / "Demo1234"
   - Fazer login
   - Mostrare dashboard con saldo iniziale

3. **Visualizzazione Mezzi** (1 min)

   - Mostrare lista mezzi con batteria
   - Spiegare: "Ogni mezzo ha sensore MQTT che invia batteria in tempo reale"

4. **Prenota Mezzo** (2 min)

   - Cliccare "Prenota" su un mezzo
   - Mostrare overlay corsa attiva con timer
   - Spiegare: "Backend ha pubblicato comando MQTT unlock al dispositivo"

5. **Simula MQTT** (2 min)

   - Aprire terminale
   - `mosquitto_pub -h localhost -p 1883 -t 'Parking/1/Mezzi/battery' -m '{"id_mezzo":1,"battery_level":65}'`
   - Rinfrescare dashboard → batteria aggiornata
   - Spiegare: "Backend riceve da MQTT e aggiorna real-time"

6. **Termina Corsa** (2 min)

   - Selezionare parcheggio di rilascio
   - Cliccare "Termina Corsa"
   - Mostrare calcolo costo automatico
   - Mostrare saldo decrementato
   - Backend ha pubblicato MQTT lock command

7. **Storico e Statistiche** (2 min)

   - Cliccare "Storico Corse"
   - Mostrare corsa con costo e durata
   - Mostrare storico transazioni

8. **Admin Panel** (1 min)

   - Switch a utente gestore (se tempo)
   - Mostrare dashboard con statistiche
   - Gestione mezzi/parcheggi

9. **Domande e Chiusura** (rimaining)

### 5.2 Criteri di Valutazione Docenti

**Sulla base della specifica:**

✅ **Specifica (10%)**

- [ ] UML Use Case Diagram
- [ ] UML Class Diagram (dominio)
- [ ] Descrizione casi d'uso

✅ **Progettazione (20%)**

- [ ] Architettura a microservizi documentata
- [ ] Database schema
- [ ] API endpoints (formato YAML/Swagger)
- [ ] MQTT topic structure
- [ ] Diagrammi di sequenza

✅ **Implementazione (40%)**

- [ ] Backend funzionante (8 microservizi)
- [ ] Frontend responsive
- [ ] Integrazione MQTT
- [ ] Business logic corretta (calcolo costo, etc)
- [ ] Autenticazione JWT
- [ ] Database schema implementato

✅ **Testing (15%)**

- [ ] Test unitari su moduli critici
- [ ] Test integrazione end-to-end
- [ ] Coverage > 70% funcionalità

✅ **Demo (15%)**

- [ ] Funzionamento senza errori
- [ ] Dimostra tutti i casi d'uso principali
- [ ] Spiega architettura e design decisions
- [ ] Risponde a domande tecniche

---

## CONCLUSIONE

Questo documento specifica completamente il progetto Mobishare secondo le fasi richieste:

1. ✅ **SPECIFICA**: UML + Requisiti + Casi d'uso
2. ✅ **PROGETTAZIONE**: Architettura + Microservizi + API + MQTT
3. ✅ **IMPLEMENTAZIONE**: Stack tecnologico e struttura progetto
4. ✅ **TESTING**: Test unitari e integrazione
5. ✅ **DEMO**: Script presentazione

**Timeline Implementazione:**

- **Settimana 1** (Lun-Ven): Setup + Backend Models + Frontend Auth
- **Settimana 2** (Lun-Ven): Routes + MQTT + Dashboard
- **Settimana 3** (Lun-Mer): Testing + Polish + Demo Prep
- **Giovedì-Venerdì**: Presentazione

---

**Autori:** Matteo Greco (Frontend), Francesco Merenda (Backend)  
**Data:** Dicembre 2025  
**Università:** Università del Piemonte Orientale
