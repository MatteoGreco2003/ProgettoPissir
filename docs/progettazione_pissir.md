# ProgettoPissir - Documentazione di Progettazione

## Indice

1. [Introduzione](#introduzione)
2. [Architettura Generale](#architettura-generale)
3. [Sottosistemi](#sottosistemi)
4. [Diagrammi UML delle Classi](#diagrammi-uml-delle-classi)
5. [Diagrammi di Sequenza](#diagrammi-di-sequenza)
6. [Diagrammi dei Package](#diagrammi-dei-package)

---

## Introduzione

**ProgettoPissir** è un sistema di gestione di **micro-mobilità urbana** (biciclette, monopattini). Permette agli utenti di:

- Prenotare e noleggiare mezzi di trasporto
- Tracciare corse in tempo reale
- Gestire pagamenti e transazioni
- Lasciare feedback sui mezzi
- Accumulare punti fedeltà

Il sistema è strutturato in **8 sottosistemi principali**, ognuno con responsabilità specifiche.

---

## Architettura Generale

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (EJS)                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  Home Utente │  Ride View   │  Profile     │  Credit      │  │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤  │
│  │  Feedback    │  Reports     │  Vehicles    │  Reporting   │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ REST API ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Routes | Controllers | Middleware | Config              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Subsystems: Users | Rides | Vehicles | Transactions     │   │
│  │              Parking | Feedback | Reports | Statistics   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ORM (Sequelize) ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL/MySQL)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ MQTT Broker ↓
┌─────────────────────────────────────────────────────────────────┐
│              Real-time Communication (IoT/Tracking)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sottosistemi

### 1. **Users Subsystem** - Gestione Utenti

**Responsabilità**: Autenticazione, profili utente, gestione account

**Classi Principali**:

- `User` - Entità utente
- `UserController` - Logica di controllo
- `UserRouter` - Routing endpoints

**Attributi User**:

- `id`: PK, UUID
- `email`: Univoco
- `password`: Hash
- `firstName`, `lastName`
- `role`: 'user' | 'admin'
- `createdAt`, `updatedAt`
- `creditBalance`: Saldo credito
- `loyaltyPoints`: Punti fedeltà
- `status`: 'active' | 'suspended'

---

### 2. **Rides Subsystem** - Gestione Corse

**Responsabilità**: Prenotazione, tracking, completamento corse

**Classi Principali**:

- `Ride` - Entità corsa
- `RideController` - Logica corse
- `RideRouter` - Routin
- `RideTracker` (MQTT) - Battery tracing real-time

**Attributi Ride**:

- `id`: PK, UUID
- `userId`: FK → User
- `vehicleId`: FK → Vehicle
- `status`: 'pending' | 'active' | 'completed' | 'cancelled'
- `startTime`, `endTime`
- `startLocation`, `endLocation`
- `distance`: KM percorsi
- `cost`: Prezzo finale
- `duration`: Minuti

---

### 3. **Vehicles Subsystem** - Gestione Veicoli

**Responsabilità**: Catalogo mezzi, disponibilità, manutenzione

**Classi Principali**:

- `Vehicle` - Entità veicolo
- `VehicleController`
- `VehicleRouter
- `VehicleStatus` - Enum stati

**Attributi Vehicle**:

- `id`: PK (Codice Mezzo)
- `type`: 'scooter' | 'bicycle' | 'bike'
- `status`: 'available' | 'in_use' | 'maintenance' | 'not_available'
- `batteryLevel`: 0-100%
- `parkingSpotId`: FK → ParkingSpot
- `rating`: Media stelline
- `totalRides`: Numero corse
- `lastServiceDate`

---

### 4. **Transactions Subsystem** - Gestione Transazioni

**Responsabilità**: Pagamenti, ricariche, storico transazioni

**Classi Principali**:

- `Transaction` - Entità transazione
- `TransactionController`
- `TransactionRouter`
- `PaymentService` - Integrazione pagamenti
- `TransactionLogger` - Auditing

**Attributi Transaction**:

- `id`: PK, UUID
- `userId`: FK → User
- `type`: 'recharge' | 'ride_payment' | 'refund'
- `amount`: €
- `currency`: 'EUR'
- `status`: 'pending' | 'completed' | 'failed'
- `paymentMethod`: 'credit_card' | 'paypal' | 'wallet'
- `timestamp`
- `description`

---

### 5. **Parking Subsystem** - Gestione Parcheggi

**Responsabilità**: Zone di parcheggio, disponibilità posti, validazione

**Classi Principali**:

- `ParkingSpot` - Entità zona parcheggio
- `ParkingController`
- `ParkingRouter`
- `ParkingService`
- `SpaceValidator` - Validazione zone

**Attributi ParkingSpot**:

- `id`: PK, UUID
- `name`: Nome zona
- `location`: Coordinate GPS
- `capacity`: Numero massimo mezzi
- `currentVehicles`: Conteggio mezzi presenti
- `type`: 'managed' | 'free'
- `operatingHours`: Orari operativi

---

### 6. **Feedback Subsystem** - Gestione Feedback

**Responsabilità**: Valutazioni mezzi, commenti, moderazione

**Classi Principali**:

- `Feedback` - Entità feedback
- `FeedbackController`
- `FeedbackRouter`
- `FeedbackService`
- `RatingCalculator` - Media stelline

**Attributi Feedback**:

- `id`: PK, UUID
- `userId`: FK → User
- `vehicleId`: FK → Vehicle
- `rideId`: FK → Ride
- `rating`: 1-5 stelle
- `comment`: Testo
- `status`: 'pending' | 'approved' | 'rejected'
- `createdAt`

---

### 7. **Reports Subsystem** - Gestione Segnalazioni

**Responsabilità**: Anomalie, danni, problemi meccanici

**Classi Principali**:

- `Report` - Entità segnalazione
- `ReportController`
- `ReportRouter`
- `ReportService`
- `ReportAssigner` - Assegnazione manutentori

**Attributi Report**:

- `id`: PK, UUID
- `vehicleId`: FK → Vehicle
- `userId`: FK → User
- `problemType`: 'damage' | 'mechanical' | 'missing' | 'other'
- `description`: Testo
- `status`: 'open' | 'in_progress' | 'resolved' | 'closed'
- `priority`: 'low' | 'medium' | 'high' | 'critical'
- `createdAt`, `resolvedAt`

---

### 8. **Statistics Subsystem** - Analytics e Report

**Responsabilità**: Dati aggregati, metriche, analytics

**Classi Principali**:

- `Statistics` - Entità stat
- `StatisticsController`
- `StatisticsRouter`
- `StatisticsService`
- `DataAggregator` - Aggregazione dati
- `ReportGenerator` - Generazione report

**Attributi Statistics**:

- `id`: PK, UUID
- `userId`: FK → User (opzionale)
- `vehicleId`: FK → Vehicle (opzionale)
- `totalRides`: Numero corse
- `totalDistance`: KM totali
- `totalCost`: €€ spesi
- `averageRating`: Media voti

---

## Diagrammi UML delle Classi

### 1. Users Subsystem - Class Diagram

```
┌─────────────────────────┐
│        User             │
├─────────────────────────┤
│ - id: UUID              │
│ - email: String         │
│ - password: String      │
│ - firstName: String     │
│ - lastName: String      │
│ - role: String          │
│ - creditBalance: Decimal│
│ - loyaltyPoints: Int    │
│ - status: String        │
| - DataSosp: Date        |
| - DataRiapertura: Date  |
| - NumSospensioni: Int   |
│ - createdAt: DateTime   │
│ - updatedAt: DateTime   │
├─────────────────────────┤
│ + updateProfile()       │
│ + getProgile()          │
│ + DeleteProfile()       │
│ + ChangePassword()      │
└─────────────────────────┘
        ▲
        │ uses
        │
┌─────────────────────────┐
│ UserService             │
├─────────────────────────┤
│ - userRepository        │
├─────────────────────────┤
│ + authenticate()        │
│ + createUser()          │
│ + updateUser()          │
│ + deleteUser()          │
│ + getUserById()         │
└─────────────────────────┘
```

### 2. Rides Subsystem - Class Diagram

```
┌──────────────────────────┐
│        Ride              │
├──────────────────────────┤
│ - id: UUID               │
│ - userId: UUID (FK)      │
│ - vehicleId: UUID (FK)   │
│ - status: String         │
│ - startTime: DateTime    │
│ - endTime: DateTime      │
│ - startLocation: String  │
│ - endLocation: String    │
│ - distance: Decimal      │
│ - cost: Decimal          │
│ - duration: Int (minutes)│
|  - UsedPoints: Int        |
├──────────────────────────┤
│ + startRide()            │
│ + getActiveRide()        │
│ + endRide()              │
│ + Checkpayment()         │
│ + getRideHystory()       │
│ + getRideById()          │
│ + cancel()               │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ RideService              │
├──────────────────────────┤
│ - rideRepository         │
│ - vehicleService         │
│ - transactionService     │
├──────────────────────────┤
│ + createRide()           │
│ + getRideById()          │
│ + getUserRides()         │
│ + completeRide()         |
│ + calculateBattery()     │
└──────────────────────────┘
        │
        │ notifies
        ▼
┌──────────────────────────┐
│ RideTracker (MQTT)       │
├──────────────────────────┤
│ - mqttClient             │
├──────────────────────────┤
│ + UnlockVehicle()        │
│ + BatteryUpdates()       │
│ + BatteryAlertBroadcast()│
└──────────────────────────┘
```

### 3. Vehicles Subsystem - Class Diagram

```
┌──────────────────────────┐
│      Vehicle             │
├──────────────────────────┤
│ - id: String (PK)        │
│ - type: String           │
│ - status: String         │
│ - batteryLevel: Int      │
│ - parkingSpotId: UUID(fk)│
│ - vehicleCode: String    │
│ - vehicleCostxMin: Int   │
│ - CreatedAt: Date        │
├──────────────────────────┤
│ + CreateVehicle()        │
│ + GetVehicleByPark()     │
│ + UpdateVehicle()        │
│ + DeleteVehicle()        │
│ + GetVehicleById()       │
│ + GetAllVehicle()        │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ VehicleService           │
├──────────────────────────┤
│ - vehicleRepository      │
│ - parkingService         │
├──────────────────────────┤
│ + createVehicle()        │
│ + getAvailableVehicles() │
│ + updateStatus()         │
│ + getParkingLocation()   │
│ + getVehicleBattery()    │
└──────────────────────────┘
```

### 4. Transactions Subsystem - Class Diagram

```
┌──────────────────────────┐
│    Transaction           │
├──────────────────────────┤
│ - id: UUID               │
│ - userId: UUID (FK)      │
│ - type: String           │
│ - amount: Decimal        │
│ - rideId: UUID   (FK)    │
│ - timestamp: DateTime    │
│ - description: String    │
├──────────────────────────┤
│ + Recharge()             │
│ + GetTransactionById()   │
│ + getHystory()           │
│ + GetBalance()           │
│ + GetBalanceSummary()    │
│ + RequestReactivation()  │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ TransactionService       │
├──────────────────────────┤
│ - transactionRepository  │
├──────────────────────────┤
│ + processPayment()       │
│ + rechargeWallet()       │
│ + getTransactionHistory()│
└──────────────────────────┘
        │
        │ integrates
        ▼
┌──────────────────────────┐
│ PaymentGateway           │
├──────────────────────────┤
│ - apiKey: String         │
│ - endpoint: String       │
├──────────────────────────┤
│ + authorize()            │
│ + charge()               │
└──────────────────────────┘
```

### 5. Parking Subsystem - Class Diagram

```
┌──────────────────────────┐
│    ParkingSpot           │
├──────────────────────────┤
│ - id: UUID               │
│ - name: String           │
│ - location: Coordinates  │
│ - capacity: Int          │
│ - CreatedAt: Date        │
├──────────────────────────┤
│ + getAvailableSpaces()   │
│ + Createpark()           │
│ + UpdatePark()           │
│ + deletePark()           │
│ + getAllParking()        │
│ + getParkingById()       │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ ParkingService           │
├──────────────────────────┤
│ - parkingRepository      │
├──────────────────────────┤
│ + reserveSpace()         │
│ + releaseSpace()         │
│ + getOccupancyStats()    │
│ + getUsedStatistics()    │
└──────────────────────────┘
```

### 6. Feedback Subsystem - Class Diagram

```
┌──────────────────────────┐
│      Feedback            │
├──────────────────────────┤
│ - id: UUID               │
│ - userId: UUID (FK)      │
│ - vehicleId: UUID (FK)   │
│ - rating: Int (1-5)      │
│ - comment: String        │
│ - createdAt: DateTime    │
├──────────────────────────┤
│ + create()               │
│ + update()               │
│ + delete()               │
│ + GetByVehicle()         │
│ + GetmyFeedback()        │
│ + GetFeedbackById()      │
│ + GetVehicleRating()     │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ FeedbackService          │
├──────────────────────────┤
│ - feedbackRepository     │
│ - ratingCalculator       │
├──────────────────────────┤
│ + createFeedback()       │
│ + getFeedbackByVehicle() │
│ + approveFeedback()      │
│ + updateVehicleRating()  │
└──────────────────────────┘
```

### 7. Reports Subsystem - Class Diagram

```
┌──────────────────────────┐
│       Report             │
├──────────────────────────┤
│ - id: UUID               │
│ - vehicleId: UUID (FK)   │
│ - userId: UUID (FK)      │
│ - problemType: String    │
│ - description: String    │
│ - status: String         │
│ - createdAt: DateTime    │
├──────────────────────────┤
│ + create()               │
│ + update()               │
│ + GetmyReport()          │
│ + GetReportById()        │
│ + GetReportByVehicleId() │
│ + Delete() │
└──────────────────────────┘
        ▲
        │ uses
        │
┌──────────────────────────┐
│ ReportService            │
├──────────────────────────┤
│ - reportRepository       │
│ - vehicleService         │
│ - notificationService    │
├──────────────────────────┤
│ + createReport()         │
│ + getOpenReports()       │
│ + assignMaintenance()    │
│ + resolveReports()       │
└──────────────────────────┘
```

---

## Diagrammi dei Package

```
┌────────────────────────────────────────────────────────────────┐
│                     ProgettoPissir                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   API Layer      │  │   Web Layer      │                    │
│  │  (Controllers)   │  │  (EJS Views)     │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                              │
│           └─────────┬───────────┘                              │
│                     │                                          │
│  ┌──────────────────▼──────────────────────────────────────┐   │
│  │             Service Layer                               │   |
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │   |
│  │  │ Users    │  │ Rides    │  │ Vehicles │  │Parking │   │   |
│  │  │ Service  │  │ Service  │  │ Service  │  │Service │   │   |
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘   │   |
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │   |
│  │  │Transact. │  │ Feedback │  │ Reports  │  │Statistics  |   |
│  │  │ Service  │  │ Service  │  │ Service  │  │Service │   |   |
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘   │   |
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │                                          │
│  ┌──────────────────▼──────────────────────────────────────┐   │
│  │          Data Access Layer (Repositories)               │   |
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │   |
│  │  │User      │  │Ride      │  │Vehicle   │  │Parking │   │   |
│  │  │Repository│  │Repository│  │Repository│  │Repository  |   |
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘   │   |
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │                                          │
│  ┌──────────────────▼────────────────────────────────────┐     │
│  │              Database Layer (Sequelize ORM)           │     │
│  │  - Models Definition                                  │     │
│  │  - Migrations & Associations                          │     │
│  └───────────┬──────────────────┬────────────────────────┘     │
│              │                  │                              │
└──────────────┼──────────────────┼──────────────────────────────┘
               │                  │
        ┌──────▼──────┐    ┌──────▼──────┐
        │  PostgreSQL │    │   MQTT      │
        │  Database   │    │   Broker    │
        └─────────────┘    └─────────────┘
```

---

## Diagrammi di Sequenza

### Sequenza 1: Prenotazione e Inizio Corsa (Ride Booking & Start)

```
┌─────────┐         ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │         │API Server│      │ Ride Srvc│      │ Database │
└────┬────┘         └────┬─────┘      └────┬─────┘      └────┬─────┘
     │ POST /rides       │              │              │
     │ (userId, vehicleId)              │              │
     ├─────────────────>│              │              │
     │                  │ validateUser()│              │
     │                  ├──────────────>│ SELECT User  │
     │                  │<──────────────┤<────────────>│
     │                  │ checkVehicle()│              │
     │                  ├──────────────>│ SELECT Veh.  │
     │                  │<──────────────┤<────────────>│
     │                  │ createRide()  │              │
     │                  ├──────────────>│ INSERT Ride  │
     │                  │<──────────────┤<────────────>│
     │                  │ publishMQTT() │              │
     │                  │─ topic: rides/active (unclock) ─>     │
     │ 200 OK {ride}    │              │              │
     │<─────────────────┤              │              │
     │                  │              │              │
```

**Descrizione**: L'utente richiede una corsa. Il sistema valida utente e veicolo, crea la corsa nel DB e fa l'unlock del mezzo via MQTT.

---

### Sequenza 2: Completamento Corsa e Pagamento (Ride Completion & Payment)

```
┌─────────┐         ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │         │API Server│      │Ride Srvc │      │Trans Srvc│
└────┬────┘         └────┬─────┘      └────┬─────┘      └────┬─────┘
     │ POST /rides/:id   │              │              │
     │ /endwith...         │              │              │
     ├─────────────────>│              │              │
     │                  │ endRide()    │              │
     │                  ├─────────────>│              │
     │                  │<─────────────┤ (calc fare)  │
     │                  │ processPayment()           │
     │                  ├──────────────────────────>│
     │                  │              │ authorizePayment()
     │                  │<──────────────────────────┤
     │                  │ updateRideStatus()        │
     │                  ├─────────────>│ UPDATE Ride │
     │                  │              │              │
     │ 200 OK           │              │              │
     │<─────────────────┤              │              │
     │                  │ MQTT: rides/completed(lock)      │
     │                  │─────────────────────────>  │
```

**Descrizione**: Alla fine della corsa il sistema calcola il costo, processa il pagamento (o debito) e aggiorna lo stato sia nel DB che via MQTT per il lock del mezzo.

---

### Sequenza 3: Segnalazione Anomalia (Report Issue)

```
┌─────────┐         ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │         │API Server│      │Report Srvc      │ Database │
└────┬────┘         └────┬─────┘      └────┬─────┘      └────┬─────┘
     │ POST /reports     │              │              │
     │ (vehicleId,       │              │              │
     │  problemType)     │              │              │
     ├─────────────────>│              │              │
     │                  │ validateVehicle()          │
     │                  ├──────────────>│ SELECT Veh. │
     │                  │<──────────────┤<───────────>│
     │                  │ createReport()│              │
     │                  ├─────────────>│ INSERT Report│
     │                  │              │<───────────>│
     │                  │ getOpenReports()           │
     │                  ├─────────────>│ SELECT *    │
     │                  │<─────────────┤<───────────>│
     │                  │ assignMaintenance()        │
     │ 201 Created      │              │              │
     │<─────────────────┤              │              │
     │                  │              │              │
```

**Descrizione**: Un utente segnala un problema sul mezzo. Il sistema crea il report che verra guardato e gestito dall'admin.

---

### Sequenza 4: Gestione Credito e Transazioni (Credit Management)

```
┌─────────┐         ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │         │API Server│      │Trans Srvc│      │ DB       │
└────┬────┘         └────┬─────┘      └────┬─────┘      └────┬─────┘
     │ POST /recharge    │              │                    |
     │ (amount)          │              │                  │
     ├─────────────────>│              │                  │
     │                  │ validateUser()│                 │
     │                  ├─────────────>│                  │
     │                  │ processPayment()               │
     │                  ├──────────────────────────────>│
     │                  │              │ chargeCard()   │
     │                  │<──────────────────────────────┤
     │                  │ createTransaction()            │
     │                  ├─────────────>│ INSERT Trans.  │
     │                  │              │                  │
     │                  │ updateCreditBalance()          │
     │                  ├─────────────>│ UPDATE User    │
     │ 200 OK {balance} │              │                  │
     │<─────────────────┤              │                  │
     │                  │              │                  │
```

**Descrizione**: Ricarica del credito wallet. Validazione utente, creazione transazione e aggiornamento saldo.

---

### Sequenza 5: Interazione Multi-Servizi - Feedback e Rating (Multi-Service Interaction)

```
┌─────────┐         ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Browser │         │API Server│      │Feed. Srvc│      │Vehicle Srvc
└────┬────┘         └────┬─────┘      └────┬─────┘      └────┬─────┘
     │ POST /feedback    │              │              │
     │ (vehicleId,       │              │              │
     │  rideId, rating)  │              │              │
     ├─────────────────>│              │              │
     │                  │ createFeedback()            │
     │                  ├─────────────>│              │
     │                  │<─────────────┤ (saved)      │
     │                  │ calculateNewRating()        │
     │                  ├─────────────>│              │
     │                  │<─────────────┤ (avg rating) │
     │                  │ updateVehicleRating()       │
     │                  ├──────────────────────────>│
     │                  │              │ UPDATE Vehicle
     │                  │              │ rating=4.5   │
     │                  │<──────────────────────────┤
     │ 201 Created      │              │              │
     │<─────────────────┤              │              │
```

**Descrizione**: Quando l'utente lascia feedback, il sistema crea il feedback, ricalcola la media dei voti del veicolo e aggiorna il rating nel servizio Vehicle.

---

## Relazioni tra i Sottosistemi

### Grafo delle Dipendenze

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐           │
│  │  Users   │◄─────┤  Rides   ├─────►│ Vehicles │           │
│  └──────────┘      └─────┬────┘      └──────────┘           │
│       ▲                  │                  │               │
│       │                  │                  ▼               │
│       │            ┌──────▼────┐      ┌──────────┐          │
│       │            │Transactions      │ Parking  │          │
│       │            └──────┬────┘      └──────────┘          │
│       │                   │                                 │
│       └──────────────────┬┴──────────────────────────┐      │
│                          │                           │      │
│                   ┌──────▼──────┐              ┌──────▼──┐  │
│                   │  Feedback   │              │ Reports │  │
│                   └─────────────┘              └─────────┘  │
│                          │                          │       │
│                          └──────────┬───────────────┘       │
│                                     │                       │
│                            ┌────────▼────────┐              │
│                            │ Statistics      │              │
│                            │ (Aggregates all)|              │
│                            └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Matrice di Interazione

| From         | To           | Tipo         | Motivo                               |
| ------------ | ------------ | ------------ | ------------------------------------ |
| Rides        | Users        | Query/Update | Validazione utente, addebito credito |
| Rides        | Vehicles     | Query/Update | Disponibilità mezzo                  |
| Rides        | Transactions | Create       | Pagamento corsa                      |
| Rides        | Parking      | Update       | Mezzo ritorna a parcheggio           |
| Feedback     | Vehicles     | Update       | Aggiornamento rating mezzo           |
| Reports      | Vehicles     | Update       | Cambio stato manutenzione            |
| Statistics   | Rides        | Query        | Aggregazione dati corse              |
| Statistics   | Users        | Query        | Statistiche utente                   |
| Statistics   | Vehicles     | Query        | Statistiche veicoli                  |
| Transactions | Users        | Update       | Aggiornamento saldo credito          |

---

## Regole di Business Implementate

### 1. **Calcolo Tariffa**

```
Tariffa = €1.00 (primi 30 minuti) + (durataMinuti - 30) × tariffa_al_minuto

```

### 2. **Validazione Corsa**

- Utente deve avere credito sufficiente
- Veicolo deve essere disponibile
- Veicolo non in manutenzione
- Batteria > 20%

### 3. **Punti Fedeltà**

- 1 punto = 0.05 euro di corsa (solo biciclette muscolari)
- 100 punti = €5.00 di sconto
- Sconto applicato su richiesta

### 4. **Moderazione Report**

- Report approvato -> stato report in_lavorazione
- Report in_lavorazione -> stato veicolo in_manutenzione
- tutti report in_lavorazione risolti per un veicolo -> stato veicolo disponibile

---

## Conclusioni

Questo documento definisce l'architettura completa di **ProgettoPissir** attraverso:

✅ **8 sottosistemi ben definiti** con responsabilità chiare  
✅ **Diagrammi UML** delle classi per ogni servizio  
✅ **Diagrammi di sequenza** per le interazioni principali  
✅ **Diagrammi dei package** per l'organizzazione logica  
✅ **Matrice di dipendenze** tra servizi  
✅ **Regole di business** implementate

La struttura è pronta per la fase di **implementazione dettagliata**.
