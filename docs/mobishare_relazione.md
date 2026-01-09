# Mobishare

# Piattaforma di Bike-Sharing Sostenibile

### Relazione Tecnica di Progetto

### Studenti Sviluppatori - Università Italiana

### Gennaio 2026

---

## Indice

- 1 Introduzione
  - 1.1 Obbiettivi del progetto
  - 1.2 Casi d'Uso Principali
- 2 Stack Tecnologico
  - 2.1 Backend Framework
  - 2.2 Comunicazione IoT
  - 2.3 Database e Persistenza
  - 2.4 Frontend e UI
  - 2.5 Architettura e Pattern
- 3 Analisi dei Requisiti
  - 3.1 Requisiti Funzionali
    - 3.1.1 RF01 - Gestione Utenti
    - 3.1.2 RF02 - Gestione Mezzi
    - 3.1.3 RF03 - Sistema di Noleggio
    - 3.1.4 RF04 - Gestione Parcheggi
    - 3.1.5 RF05 - Sistema Transazioni e Pagamenti
    - 3.1.6 RF06 - Sistema Segnalazioni
    - 3.1.7 RF07 - Feedback e Valutazioni
  - 3.2 Requisiti Non Funzionali
    - 3.2.1 RNF01 - Performance
    - 3.2.2 RNF02 - Scalabilità
    - 3.2.3 RNF03 - Sicurezza
    - 3.2.4 RNF04 - Usabilità
- 4 Architettura del Sistema
  - 4.1 Architettura Client-Server
    - 4.1.1 Backend Layer (Node.js/Express)
    - 4.1.2 Database Layer (PostgreSQL)
    - 4.1.3 Frontend Layer (html, css, javascript)
    - 4.1.4 MQTT Layer (Mosquitto)
  - 4.2 Pattern Architetturali
    - 4.2.1 MVC Pattern
    - 4.2.2 RESTful API Design
    - 4.2.3 JWT Authentication
  - 4.3 Architettura MQTT e IoT
    - 4.3 Topologia MQTT
      - 4.3.2 Messaggi MQTT
- 5 Implementazione
  - 5.1 Setup e Avvio Sistema
    - 5.1.1 Prerequisiti
    - 5.1.2 Installazione Backend
    - 5.1.3 Configurazione Database
  - 5.2 Accesso alle Interfacce
    - 5.2.1 Applicazione Web
    - 5.2.2 API Documentation /_eliminato_/
  - 5.3 API Endpoints Principali
    - 5.3.1 Autenticazione
    - 5.3.2 Gestione Corse
    - 5.3.3 Gestione Mezzi
    - 5.3.4 Gestione Parcheggi
- 6 Struttura Progetto
  - 6.1 Backend (Node.js/Express)
    - 6.1.1 Controllers
    - 6.1.2 Routes
    - 6.1.3 Models
    - 6.1.4 Middleware
    - 6.1.5 config
    - 6.1.6 MQTT
  - 6.2 Frontend (html, css, javascript)
    - 6.2.1 Componenti
    - 6.2.2 Pages
    - 6.2.3 Services
    - 6.2.4 Utilities e State Management
  - 6.3 Database (PostgreSQL)
    - 6.3.1 Schema
    - 6.3.2 Relazioni
- 7 Funzionalità Implementate
  - 7.1 Sistema Autenticazione e Autorizzazione
  - 7.2 Sistema Gestione Utenti
  - 7.3 Sistema Gestione Mezzi
  - 7.4 Sistema Corse e Noleggi
  - 7.5 Sistema Pagamenti e Transazioni
  - 7.6 Sistema Segnalazioni Manutenzione
  - 7.7 Dashboard Amministrativa
- Conclusione

---

## 1 Introduzione

**Mobishare** è una piattaforma completa di bike-sharing che facilita il noleggio e l'utilizzo di biciclette e monopattini elettrici in aree urbane. Il sistema integra un'architettura moderna con API RESTful, interfacce web responsive e un database relazionale robusto per la gestione dell'intero ecosistema di sharing mobility.

Il progetto implementa un sistema end-to-end che include:

- **Backend REST API** sviluppato con Node.js e Express.js
- **Frontend Web** responsivo con html5/css3/javascript es6
- **Database PostgreSQL** per la persistenza e gestione dati
- **Sistema di Autenticazione** JWT con gestione dei ruoli e cookie
- **Mappa Interattiva** con Leaflet per visualizzazione parcheggi e mezzi
- **Dashboard Amministrativa** con statistiche e monitoraggio
- **Sistema di Pagamento** integrato con gestione crediti

### 1.1 Obiettivi del Progetto

Il sistema Mobishare si pone i seguenti obiettivi:

1. **Accessibilità e Facilità d'Uso**: Interfaccia intuitiva che consente a qualsiasi utente di noleggiare velocemente un mezzo
2. **Gestione Efficiente della Flotta**: Monitoraggio completo dello stato, ubicazione e disponibilità di tutti i mezzi
3. **Sistema Transazionale Affidabile**: Gestione crediti, pagamenti automatici e calcolo tariffe dinamiche
4. **Manutenzione Proattiva**: Sistema di segnalazioni per identificare e risolvere tempestivamente problemi
5. **Scalabilità e Robustezza**: Architettura modulare e database ottimizzato per supportare crescita futura
6. **Sicurezza dei Dati**: Autenticazione robusta, autorizzazione granulare e protezione dei dati sensibili

### 1.2 Casi d'Uso Principali

#### Utente Standard

- Registrazione e autenticazione
- Visualizzazione mezzi disponibili su mappa
- Prenotazione mezzo
- Sblocco e utilizzo mezzo
- Completamento e pagamento corsa
- Visualizzazione storico corse e statistiche personali
- Ricarica credito
- Recensione mezzi utilizzati
- Segnalazione problemi riscontrati

#### Amministratore

- Gestione completa mezzi (aggiunta, modifica, eliminazione)
- Gestione parcheggi e ubicazioni
- Visualizzazione statistiche avanzate
- Gestione delle segnalazioni di manutenzione
- Gestione completa degli utenti (ban, riattivazioni)
- Dashboard amministrativa con metriche business
- Monitoraggio dello stato del sistema
- Analisi delle transazioni e ricavi
- Gestione degli account di gestori

---

## 2 Stack Tecnologico

### 2.1 Backend Framework

**Node.js con Express.js**

- Node.js v18+ come runtime JavaScript server-side
- Express.js come framework web per la creazione di API RESTful
- Sequelize ORM per la gestione del database relazionale
- Middleware per autenticazione (JWT), validazione, error handling

**Caratteristiche principali:**

- Routing modulare e ben organizzato
- Middleware custom per controllo accesso e autenticazione
- Validazione input e sanitizzazione dati
- Error handling centralizzato
- CORS configurato per sicurezza

### 2.2 Comunicazione IoT

**MQTT (Message Queuing Telemetry Transport)**

- Protocollo publish/subscribe leggero
- Ideale per IoT con banda limitata
- QoS (Quality of Service) configurabile
- Retained messages per stato persistente

**Mosquitto Broker**

- Broker MQTT open-source lightweight
- Supporto per MQTT 3.1.1 e 5.0
- Autenticazione e ACL configurabili
- Performance elevate con basso overhead

### 2.3 Database e Persistenza

**PostgreSQL v12+**

- Database relazionale per la persistenza dei dati
- Sequelize come ORM per mapping oggetto-relazionale
- Transazioni per garantire integrità dati
- Indici ottimizzati per query frequenti
- Trigger e vincoli a livello database

**Tabelle principali:**

- `users` - Gestione utenti e credenziali
- `vehicles` - Inventario mezzi con stato e batteria
- `parkings` - Ubicazioni parcheggi
- `rides` - Storico corse e transazioni
- `reports` - Segnalazioni manutenzione
- `feedback` - Valutazioni da parte degli utenti

### 2.4 Frontend e UI

**HTML5/CSS3/JavaScript Vanilla**

- HTML5 semantico per struttura pagine
- CSS3 con flexbox e grid per layout responsivo
- JavaScript vanilla (ES6+) per logica interattiva
- Manipolazione DOM con metodi nativi
- Gestione stato locale con localStorage e cookie

**Librerie complementari:**

- Leaflet.js per mappe interattive
- Bootstrap per design responsivo

### 2.5 Architettura e Pattern

**Pattern Utilizzati:**

- **MVC (Model-View-Controller)**: Separazione di responsabilità tra gestione dati, logica business e presentazione
- **RESTful API Design**: Interfacce HTTP standard con metodi GET, POST, PUT, DELETE
- **JWT Authentication**: Token-based authentication per stateless communication
- **Middleware Pattern**: Composizione di funzioni per gestire request/response pipeline
- **Repository Pattern**: Astrazione dell'accesso ai dati tramite ORM

---

## 3 Analisi dei Requisiti

### 3.1 Requisiti Funzionali

#### 3.1.1 RF01 - Gestione Utenti

**Descrizione**: Il sistema deve supportare la registrazione, autenticazione e gestione di utenti con diversi ruoli (cliente, gestore, admin).

**Dettagli**:

- Registrazione con email, password e dati personali
- Login e logout con token JWT
- Profilo utente modificabile
- Ruoli e permessi granulari (user, admin)
- Disattivazione e eliminazione account

**API Endpoints**:

- `POST /auth/register` - Registrazione nuovo utente
- `POST /auth/login` - Login utente
- `GET /users/profile` - Recupera profilo personale
- `PUT /users/profile` - Modifica profilo
- `DELETE /users/account` - Elimina account
- `POST /auth/logout` - Logout

#### 3.1.2 RF02 - Gestione Mezzi

**Descrizione**: Sistema completo di gestione biciclette e monopattini con tracking stato, batteria e ubicazione.

**Dettagli**:

- Inventario mezzi (bicicletta muscolare, bicicletta elettrica, monopattino)
- Stato mezzo (disponibile, in uso, in manutenzione, fuori servizio)
- Monitoraggio batteria per mezzi elettrici
- Tariffazione dinamica per tipo mezzo
- Associazione a parcheggi
- Cronologia manutenzione

**API Endpoints**:

- `GET /vehicles` - Lista tutti i mezzi
- `GET /vehicles/:id` - Dettagli mezzo singolo
- `POST /vehicles` - Aggiunta nuovo mezzo (admin)
- `PUT /vehicles/:id` - Modifica mezzo (admin/manager)
- `DELETE /vehicles/:id` - Rimozione mezzo (admin)

#### 3.1.3 RF03 - Sistema di Noleggio

**Descrizione**: Gestione completa del ciclo di vita del noleggio: prenotazione, sblocco, utilizzo, restituzione.

**Dettagli**:

- Visualizzazione mezzi disponibili
- Prenotazione mezzo
- Sblocco mezzo
- Tracciamento corsa (durata, distanza stimata, velocita stimata)
- Restituzione mezzo in parcheggio
- Calcolo automatico importo da pagare

**API Endpoints**:

- `GET /rides/active` - Corsa attiva utente
- `POST /rides/start` - Inizio corsa
- `PUT /rides/:id/end` - Fine corsa
- `GET /rides/history` - Storico corse utente

#### 3.1.4 RF04 - Gestione Parcheggi

**Descrizione**: Sistema di gestione ubicazioni parcheggi con capacità e posizioni geografiche.

**Dettagli**:

- Elenco parcheggi con coordinate GPS
- Capacità massima posti
- Posti disponibili in tempo reale
- Visualizzazione su mappa interattiva
- Aggiunta/modifica parcheggi (admin)

**API Endpoints**:

- `GET /parkings` - Lista tutti i parcheggi
- `GET /parkings/:id` - Dettagli parcheggio
- `POST /parkings` - Aggiunta parcheggio (admin)
- `PUT /parkings/:id` - Modifica parcheggio (admin)

#### 3.1.5 RF05 - Sistema Transazioni e Pagamenti

**Descrizione**: Gestione del sistema di crediti e transazioni economiche.

**Dettagli**:

- Ricarica credito utente
- Prelievo automatico al completamento corsa
- Calcolo tariffe basate su: tipo mezzo, durata, orario
- Storico transazioni

**API Endpoints**:

- `POST /transaction/recharge` - Ricarica credito
- `GET /transaction/balance` - Saldo credito
- `GET /transactions/history` - Storico transazioni

#### 3.1.6 RF06 - Sistema Segnalazioni

**Descrizione**: Gestione segnalazioni di problemi/manutenzione su mezzi.

**Dettagli**:

- Segnalazione problemi su mezzo
- Categorizzazione segnalazioni (danno, batteria scarica, manutenzione)
- Stato segnalazione (aperta, in_lavorazione, risolta)
- Assegnazione a gestore
- Blocco automatico mezzo durante manutenzione
- Feedback sulla risoluzione

**API Endpoints**:

- `POST /reports` - Segnalazione nuovo problema
- `GET /reports` - Lista segnalazioni
- `PUT /reports/:id/status` - Aggiorna stato segnalazione (admin)
- `GET /reports/:id` - Dettagli segnalazione

#### 3.1.7 RF07 - Feedback e Valutazioni

**Descrizione**: Sistema di feedback su mezzi per migliorare qualità servizio.

**Dettagli**:

- Valutazione mezzo dopo utilizzo
- Commenti e note costruttive
- Aggregazione feedback per mezzo
- Visualizzazione rating medio

### 3.2 Requisiti Non Funzionali

#### 3.2.1 RNF01 - Performance

- API response time < 500ms per operazioni standard
- Database query ottimizzate con indici appropriati
- Caching lato client per dati statici
- Lazy loading su mappa per grandi dataset

#### 3.2.2 RNF02 - Scalabilità

- Architettura stateless per orizzontale scaling
- Database relazionale con schema ben normalizzato
- Separazione logica tra frontend e backend
- Pronto per containerizzazione e deployment cloud

#### 3.2.3 RNF03 - Sicurezza

- Autenticazione JWT con scadenza token
- Validazione input su tutti gli endpoint
- Protezione SQL injection tramite ORM
- Hashing password con bcrypt
- CORS configurato
- Rate limiting su endpoint sensibili
- Authorization granulare per operazioni

#### 3.2.4 RNF04 - Usabilità

- Interfaccia responsive per mobile/tablet/desktop
- Mappa interattiva intuitiva per posizionamento
- Flusso noleggio semplificato
- Feedback visivo immediato per azioni
- Messaggi d'errore chiari e informativi

---

## 4 Architettura del Sistema

### 4.1 Architettura Client-Server

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│           html css js Single Page Application               │
│               - Components | Views | Javascript             |
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         │ JSON
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Server (Node.js/Express)               │
│    ┌─────────────────────────────────────────────────────┐  │
│    │  API Routes (Controllers)                           │  │
│    │  - Auth | Users | Vehicles | Rides | Parkings       │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │  Business Logic (Models/Services)                   │  │
│    │  - Validazione | Calcoli Tariffe | Transazioni      │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │  Middleware                                         │  │
│    │  - Auth | CORS | Error Handling | Logging           │  │
│    └─────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Database (PostgreSQL + Sequelize ORM)                │
│  - Users | Vehicles | Rides | Parkings | Transactions       │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.1 Backend Layer (Node.js/Express)

**Responsabilità**:

- Gestione delle rotte HTTP
- Validazione richieste
- Logica applicativa e calcoli
- Gestione database tramite ORM
- Autenticazione e autorizzazione
- Gestione errori centralizzata

**Struttura cartelle**:

```
backend/
├── controllers/      # Logica gestione richieste
├── models/          # Definizioni entità database
├── mqtt/            # Logica gestione mqtt
├── routes/          # Definizione endpoint API
├── middleware/      # Auth, validazione, logging
├── utils/           # Funzioni utility
├── config/          # Configurazioni database
└── server.js        # Entry point applicazione
```

#### 4.1.2 Database Layer (PostgreSQL)

**Responsabilità**:

- Persistenza dati
- Integrità referenziale
- Supporto transazioni
- Ottimizzazione query con indici

**Caratteristiche**:

- Schema normalizzato (3NF)
- Vincoli di integrità referenziale
- Trigger per logica business a DB level
- Stored procedures per operazioni complesse

#### 4.1.3 Frontend Layer

#### 4.1.3 Frontend Layer (HTML/CSS/JavaScript)

**Responsabilità**:

- Presentazione dati con HTML semantico
- Interazione utente con event listeners
- Gestione stato locale (localStorage)
- Comunicazione API con backend via Axios

**Architettura**:

- Moduli JavaScript riutilizzabili
- Pagine HTML per diverse sezioni
- LocalStorage per persistenza dati
- Services per logica API

### 4.1.4 MQTT Layer (Mosquitto)

**Responsabilità**:

- Gestione dei mezzi
- Notifiche real time
- Simulazione real time dispositivi IoT
- Canali di comunicazione

**Architettura**:

- File per simulazione decremento della batteria
- Sblocco e blocco dei mezzi
- Invio messaggi su canali
-

### 4.2 Pattern Architetturali

#### 4.2.1 MVC Pattern

```
Model     → Sequelize Models (struttura database)
View      → html, css, javascript Components e Templates
Control   → Express Controllers (gestione logica)
```

#### 4.2.2 RESTful API Design

Ogni risorsa ha URL predicibile:

```
GET    /vehicles              → Lista mezzi
GET    /vehicles/:id          → Dettagli mezzo
POST   /vehicles              → Crea mezzo
PUT    /vehicles/:id          → Modifica mezzo
DELETE /vehicles/:id          → Elimina mezzo
```

#### 4.2.3 JWT Authentication

- Token rilasciato al login
- Token inviato in header Authorization
- Token verificato su endpoint protetti
- Scadenza e refresh token

### 4.3 Architettura MQTT e IoT

**Descrizione**: Integrazione MQTT per comunicazione real-time tra dispositivi IoT ( sensori batteria, sensori blocco e sblocco) e backend.

**Tecnologie**:

- MQTT 3.1.1 come protocollo
- Broker MQTT (Mosquitto)
- Node.js MQTT client
- QoS configurato per garantire consegna

#### 4.3.1 Topologia MQTT

**Struttura gerarchica dei topic**:

mobishare/backend/
├── vehicles/{vehicle_id}/battery → Livello batteria (%)zo
├── commands/vehicles/{vehicle_id}/unlock → Comando sblocco
└── alerts/battery_low → Notifiche anomalie

#### 4.3.2 Messaggi MQTT

**Formato JSON standard**:

```json
{
  "id": 100,
  "type": "battery|status|alert",
  "timestamp": "2026-01-06T16:30:45Z"
}
```

---

## 5 Implementazione

### 5.1 Setup e Avvio Sistema

#### 5.1.1 Prerequisiti

**Software richiesto**:

- Node.js v18 o superiore
- PostgreSQL v12 o superiore (PgAdmin)
- Git per versionamento
- Postman per testing API (opzionale)
- Mosquitto per simulazione dispositivi IoT

**Dipendenze di sistema**:

- npm (package manager Node.js)
- client pgAdmin per gestire database

#### 5.1.2 Installazione Backend

```bash
# 1. Clonare repository
git clone <repository-url>
cd mobishare/backend

# 2. Installare dipendenze
npm install

# 3. Configurare variabili ambiente (noi le lasciamo essendo un progetto universitario)
cp .env.example .env
# Modificare .env con credenziali database

# 4. Sincronizzare database (crea il db)
node setup-db.js

# 5. Avviare server
npm start
# Server disponibile su http://localhost:3000

# 3. Avviare development server
npm run dev
# App disponibile su http://localhost:3000

```

#### 5.1.3 Installazione Frontend

```bash
# 1. Navigare cartella frontend
cd ../frontend

# 2. Installare dipendenze
npm install


```

#### 5.1.4 Configurazione Database

```bash
# Connessione PostgreSQL (se creazione a buon fine con i models si puo evitare)
psql -U postgres

# Creare database
CREATE DATABASE mobishare;

# Eseguire setup-db.js per struttura db (se serve)
node backend/setup-db.js
```

### 5.2 Accesso alle Interfacce

#### 5.2.1 Applicazione Web

- **URL**: http://localhost:3000
- **Utente test**: email: francesco@gmail.com | password: password123
- **Utente test**: email: grecomatteo2003@gmail.com | password: password123 (email reale per sender email)
- **Utente test**: email: angelo@gmail.com | password: password123
- **Admin test**: email: admin@gmail.com | password: password123

### 5.3 API Endpoints Principali

#### 5.3.1 Autenticazione

```
POST /auth/register
Body: { email, password, nome, cognome }
Response: { success, message, user }

POST /auth/login
Body: { email, password }
Response: { success, token, user }

POST /auth/logout
Response: { success, message }

POST  /auth/forgot-password
Response: {success, message }

POST /reset-password
Responde: {success, message}


```

#### 5.3.2 Gestione Corse

```
GET /rides/active
Response: { id_corsa, stato_corsa, vehicle, parcheggio_inizio, durata, costo_stimato }

POST /rides/start
Body: { id_mezzo, id_parcheggio_inizio }
Response: { success, ride }

PUT /rides/:ride_id/end-with-payment
Body: { id_parcheggio_fine, km_percorsi }
Response: { success, ride, costo_finale ... }
c
GET /rides/history
Response: [ { id_corsa, data_inizio, durata, costo, mezzo, parcheggio } ]

GET /rides/statistics
Response: { success, corse_totali, ultimo_mezzo, tipo_mezzo, spesa_totale, km_totali }

GET /rides/today
Response: { success, message, count, rides }

GET /rides/all-completed
Response: { success, message, count, rides }

GET /rides/:ride_id/check-payment
Response: { success, costo, saldo_attuale, saldo_sufficiente, importo_mancante, durata_minuti }

POST /rides/:ride_id/end-with-debt
Response: { success, message, id_corsa, durata_minuti, costo_corsa, costo_prossima_corsa_preventivo, debito_totale, saldo_dopo, parcheggio_fine, punti_totali, account_status }

POST /rides/:ride_id/cancel
Response: { success, message, id_corsa }

```

#### 5.3.3 Gestione Mezzi

```
GET /vehicles/data
Response: [ { id_mezzo, tipo_mezzo, stato, batteria, parcheggio } ]

GET /vehicles/:id
Response: { id_mezzo, tipo_mezzo, stato, batteria, parcheggio, report_in_lavorazione }

POST /vehicles (admin)
Body: { tipo_mezzo, id_parcheggio, stato }
Response: { success, vehicle }

PUT /vehicles/:id (admin)
Body: { tipo_mezzo, stato, stato_batteria, id_parcheggio }
Response: { success, vehicle }

GET /vehicles/parking/:id_parcheggio"
Response: {success, message, count, vehicles}

DELETE /vehicles/:id" (admin)
Response: {success, message, id_mezzo}

POST/vehicles/:id/recharge-battery" (admin)
Body: {stato_batteria}
Response: { success, message, id_mezzo, tipo_mezzo, batteria_precedente, batteria_nuova, stato_mezzo, avviso }

```

#### 5.3.4 Gestione Parcheggi

```
GET /parkings/data
Response: [ { id_parcheggio, nome, latitudine, longitudine, posti_disponibili } ]

GET /parkings/:id
Response: { id_parcheggio, nome, ubicazione, mezzi_presenti, posti_totali }

GET /parking/:id/availability
Response: { id_parcheggio, nome, capacita, occupati, disponibili, percentuale_occupazione }

POST /parking/
Body {nome, latitudine, longitudine, capacita}
Response: { success, message, parking }

PUT /parking/:id
Body {nome, latitudine, longitudine, capacita}
Response: { success, message, parking }

DELETE /parking/:id
Response: { success, message }

```

---

## 6 Struttura Progetto

### 6.1 Backend (Node.js/Express)

#### 6.1.1 Controllers

File: `backend/controllers/*.js`

Gestiscono la logica di business per ogni risorsa:

- `authController.js` - Registrazione, login, logout
- `usersController.js` - Profilo, modifica dati
- `vehiclesController.js` - CRUD mezzi, stato
- `ridesController.js` - Gestione corse
- `parkingsController.js` - CRUD Gestione parcheggi
- `reportsController.js` - CRUD Gestione segnalazioni
- `feedbackController.js` - CRUD Valutazioni mezzi

#### 6.1.2 Routes

File: `backend/routes/*.js`

Definiscono endpoint HTTP:

- `authRoutes.js` - POST /register, /login
- `userRoutes.js` - GET/PUT/DELETE /profile
- `vehicleRoutes.js` - GET/POST/PUT/DELETE /vehicles
- `rideRoutes.js` - POST/PUT/GET /rides
- `parkingRoutes.js` - GET/POST/PUT/DELETE /parkings
- `reportRoutes.js` - GET/POST /reports

#### 6.1.3 Models

File: `backend/models/*.js`

Definizione struttura dati:

- `User.js` - Utenti registrati
- `Vehicle.js` - Mezzi disponibili
- `Ride.js` - Storico corse
- `Parking.js` - Ubicazioni parcheggi
- `Report.js` - Segnalazioni manutenzione
- `Feedback.js` - Valutazioni
- `Transaction.js` - Transazioni
- `LoyaltyPoints.js` - Punti fedeltà

#### 6.1.4 Middleware

File: `backend/middleware/*.js`

Elaborazione richieste:

- `verifyToken.js` - Verifica JWT token ()
- `apiAuthMiddleware.js` -Middleware per API REST
- `isAdmin.js` - Middleware di autorizzazione

#### 6.1.5 Config

File: `backend/Config/*.js`

File necessari per la configurazione protetta del database

Funzioni helper\*\*\*:

- `tariffCalculator.js` - Calcolo tariffe
- `tokenManager.js` - Gestione JWT
- `validators.js` - Validazioni custom
- `errorFormatter.js` - Formattazione errori

\*\*\*\*si trovano nei singoli file

#### 6.1.6 MQTT

File: `backend/mqtt/*.js`

Gestione comunicazione real-time con dispositivi IoT:

- `mqttClient.js` - Connessione e configurazione broker MQTT
- `mqttSubscribers.js` - Listener per topic vehicle, parking, alerts
- `mqttPublishers.js` - Publish messaggi comandi (unlock, lock, locate)
- `deviceHandlers.js` - Elaborazione dati sensori e aggiornamento DB

### 6.2 Frontend (HTML/CSS/JavaScript)

#### 6.2.1 Componenti

File: `frontend/src/components/*.js`

Moduli JavaScript riutilizzabili:

- `VehicleCard.js` - Componente scheda mezzo
- `MapContainer.js` - Gestione mappa Leaflet
- `NavBar.js` - Barra navigazione
- `AuthForm.js` - Form login/registrazione
- `RideDetails.js` - Dettagli corsa attiva

#### 6.2.2 Pages

File: `frontend/src/pages/*.html` e `frontend/src/js/*.js`

Pagine HTML complete:

- `index.html` - Pagina principale con mappa
- `login.html` - Pagina autenticazione
- `profile.html` - Profilo utente
- `ride-history.html` - Storico corse
- `admin-dashboard.html` - Dashboard amministrativa
- `vehicle-management.html` - Gestione mezzi

#### 6.2.3 Services

File: `frontend/src/services/*.js`

Moduli per comunicazione con API:

- `authService.js` - Autenticazione e gestione token
- `vehicleService.js` - Richieste mezzi
- `rideService.js` - Gestione corse
- `parkingService.js` - Gestione parcheggi
- `userService.js` - Profilo utente

#### 6.2.4 Utilities e State Management

File: `frontend/src/utils/*.js`

Funzioni helper e gestione stato:

- `localStorage.js` - Gestione dati locali (utente, token, credito)
- `dom.js` - Manipolazione DOM e rendering
- `validators.js` - Validazioni lato client
- `eventHandlers.js` - Gestione eventi globali
- `constants.js` - Costanti applicazione (URL API, stati, etc)

### 6.3 Database (PostgreSQL)

#### 6.3.1 Schema

**Tabelle principali**:

```sql
users
├── id_utente (PK)
├── email (UNIQUE)
├── password_hash
├── nome, cognome
├── role (user, admin)
├── saldo
├── stato_account[attivo,sospeso,in_attesa_approvazione,eliminato]
├── password_reset_token
├── password_reset_expires
├── data_sospensione
├── data_riapertura
├── punti
├── numero_sospensioni
└── data_registrazione


vehicles
├── id_mezzo (PK)
├── tipo_mezzo (monopattino, bicicletta_muscolare, bicicletta_elettrica)
├── stato (disponibile, in_uso, in_manutenzione, fuori_servizio)
├── stato_batteria (per mezzi elettrici)
├── codice_identificativo
├── tariffa_minuto
├── id_parcheggio (FK)
└── creato_il

parkings
├── id_parcheggio (PK)
├── nome
├── latitudine, longitudine
├── capacita
└── creato_il

rides (storico_corse)
├── id_corsa (PK)
├── id_utente (FK, nullable - per utenti eliminati)
├── id_mezzo (FK, nullable - per mezzi eliminati)
├── id_parcheggio_inizio (FK, nullable - per parcheggi di inizio eliminati)
├── id_parcheggio_fine (FK, nullable - per parcheggi di fine eliminati)
├── data_ora_inizio
├── data_ora_fine
├── durata_minuti
├── km_percorsi
├── costo
├── punti_fedeltà_usati
└── stato_corsa

reports
├── id_segnalazione (PK)
├── id_mezzo (FK)
├── id_utente (FK)
├── tipo_problema
├── descrizione
├── stato_segnalazione (aperta, in_lavorazione, risolta)
└── data_ora (Data e ora automatica)

feedback
├── id_feedback (PK)
├── id_utente (FK)
├── id_mezzo (FK)
├── rating (1-5)
├── commento
└── data_ora (Data e ora automatica)

Transaction
├── id_transazione (PK)
├── id_utente (FK)
├── tipo_transazione
├── importo
└── data_ora (Data e ora automatica)

LoyaltyPoints
├── id_punto (PK)
├── id_utente (FK)
├── id_corsa (FK)
├── tipo_operazione (Guadagnati da corsa o utilizzati per sconto)
├── punti_importo (Numero di punti guadagnati o utilizzati)
├── descrizione
└──  data_operazione

```

#### 6.3.2 Relazioni

```
User 1─N Rides
User 1─N Reports
User 1─N Feedback
User 1─N LoyaltyPoints
User 1─N Transactions


Vehicle 1─N Rides
Vehicle 1─N Reports
Vehicle 1─N Feedback



Parking 1─N Vehicles
Parking 1─N Rides (come parcheggio inizio)
Parking 1─N Rides (come parcheggio fine)


Ride 1─N LoyaltyPoints
Ride 1─1 Transactions
```

---

## 7 Funzionalità Implementate

### 7.1 Sistema Autenticazione e Autorizzazione

**Funzionalità**:

- Registrazione utenti con email e password
- Login con generazione JWT token
- Logout e rimozione token
- Ruoli differenziati (user, admin)
- Protezione endpoint con middleware auth
- Permessi granulari per azioni sensibili

**Tecnologie**:

- bcryptjs per hashing password
- jsonwebtoken per token management
- Middleware custom per verifiche permessi
- mosquitto per simulazioni IoT real-time

### 7.2 Sistema Gestione Utenti

**Funzionalità**:

- Profilo utente con modifica dati
- Visualizzazione saldo credito
- Storico transazioni personale
- Eliminazione account (con cascata su dati storico)
- Gestione account sospesi (admin)
- conteggio sospensioni
- Sospensione account

### 7.3 Sistema Gestione Mezzi

**Funzionalità**:

- Inventario completo mezzi
- Visualizzazione mezzi su mappa interattiva
- Filtraggio per tipo mezzo
- Monitoraggio batteria (mezzi elettrici)
- Associazione a parcheggio
- Cambio stato mezzo (disponibile ↔ manutenzione)
- Blocco mezzo durante segnalazioni in lavorazione

**Tariffazione**:

- Bicicletta muscolare: €0.15/min
- Bicicletta elettrica: €0.25/min
- Monopattino: €0.20/min
- Tariffa minima: €1.00 per primi 30 minuti

### 7.4 Sistema Corse e Noleggi

**Funzionalità**:

- Selezione mezzo e parcheggio ritiro (a fine corsa)
- Verifica credito disponibile
- Sblocco mezzo
- Tracciamento durata e distanza
- Calcolo costo automatico
- Restituzione in parcheggio
- Generazione ricevuta (pagamento o debito con relativa sospensione)
- Storico corse con filtri

**Flusso corsa**:

1. Selezione mezzo disponibile
2. sblocco mezzo
3. Calcolo importo costante e real time
4. Utilizzo (durata e velocita misurate)
5. selezione del parcheggio finale
6. eventuali feedback o report
7. Verifica credito
8. Utilizzo di eventuali punti fedelta se desiderato
9. Pagamento tramite credito, o debito
10. blocco mezzo

### 7.5 Sistema Pagamenti e Transazioni

**Funzionalità**:

- Ricarica credito (wallet)
- Prelievo automatico al completamento corsa
- ricariche manuali
- Storico transazioni completo
- Ricevute digitali
- Export dati transazioni

**Metodi pagamento**:

- Ricarica diretta credito
- Debito automatico da credito

### 7.6 Sistema Segnalazioni Manutenzione

**Funzionalità**:

- Segnalazione problemi su mezzo
- Categorizzazione problemi
- Stato segnalazione tracciato
- Blocco automatico mezzo se richiesta in lavorazione (manutenzione)
- Cambio stato segnalazione (admin)
- Sblocco mezzo solo quando tutte le segnalazioni risolte
- Storico segnalazioni

**Categorie problemi**:

- Danno fisico
- Batteria scarica
- pneumatico bucato
- Problemi meccanici
- Pulizia necessaria
- Altro

### 7.7 Dashboard Amministrativa

**Funzionalità**:

- Statistiche totali (utenti, mezzi, corse, guadagni)
- Ricavi e transazioni
- Mezzi attivi/in manutenzione
- Corse in corso nel sistema
- Segnalazioni pendenti di riattivazione o report

---

## Conclusione

Il progetto Mobishare rappresenta una soluzione completa e moderna per la gestione di un servizio di bike-sharing urbano. L'architettura scalabile, la sicurezza robusta e l'interfaccia user-friendly lo rendono idoneo sia per deployment iniziale che per espansioni future.

**Tecnologie scelte** (Node.js, Express, html5/css3/js ES6, PostgreSQL) garantiscono performance, manutenibilità e comunità attiva di supporto.

**Implementazione terminata** con tutte le funzionalità core: autenticazione, gestione mezzi, sistema corse, pagamenti e feedback

**Possibili estensioni future**:

- Integrazione payment gateway (Stripe)
- App mobile nativa (React Native)
- notifiche push presenti nel sito, ma non app da telefono
- Sistema di abbonamenti
- Gamification (punti (gia presenti), badge)
- Integrazione MQTT per sbarre di parcheggio
- Integrazione MQTT per allarmi sui dispositivi (tracciamento utente presente ma migliorabile)
