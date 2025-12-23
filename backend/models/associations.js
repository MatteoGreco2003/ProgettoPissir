// backend/models/associations.js

import Vehicle from "./Vehicle.js";
import Parking from "./Parking.js";
import User from "./User.js";
import Report from "./Report.js";
import Ride from "./Ride.js";
import Feedback from "./Feedback.js";

// ✅ Vehicle appartiene a Parking
Vehicle.belongsTo(Parking, {
  foreignKey: "id_parcheggio",
  as: "parking",
});

// ✅ Parking ha molti Vehicle
Parking.hasMany(Vehicle, {
  foreignKey: "id_parcheggio",
  as: "vehicles",
});

// ✅ Report associations
Report.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

Report.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
});

// ✅ Ride associations
Ride.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

// ✅ AGGIORNATO: Vehicle può essere cancellato senza problemi
Ride.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "SET NULL", // ✅ id_mezzo diventa NULL se Vehicle è cancellato
});

Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_inizio",
  as: "parkingInizio",
});

Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_fine",
  as: "parkingFine",
});

// ✅ Feedback associations
Feedback.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

Feedback.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "SET NULL", // ✅ id_mezzo diventa NULL se Vehicle è cancellato
});

//Associazioni inverse (hasMany) per Feedback
User.hasMany(Feedback, {
  foreignKey: "id_utente",
  as: "feedbacks",
});

Vehicle.hasMany(Feedback, {
  foreignKey: "id_mezzo",
  as: "feedbacks",
});

export { Vehicle, Parking, User, Report, Ride, Feedback };
