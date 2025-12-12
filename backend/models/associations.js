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

Ride.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
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
});

export { Vehicle, Parking, User, Report, Ride };
