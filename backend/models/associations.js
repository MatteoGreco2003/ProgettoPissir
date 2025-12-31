// backend/models/associations.js

import Vehicle from "./Vehicle.js";
import Parking from "./Parking.js";
import User from "./User.js";
import Report from "./Report.js";
import Ride from "./Ride.js";
import Feedback from "./Feedback.js";

// Vehicle appartiene a un Parking
Vehicle.belongsTo(Parking, {
  foreignKey: "id_parcheggio",
  as: "parking",
});

// Parking contiene molti Vehicle
Parking.hasMany(Vehicle, {
  foreignKey: "id_parcheggio",
  as: "vehicles",
});

// Report è collegato a User
Report.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

// Report è collegato a Vehicle - ELIMINA in cascata
Report.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "CASCADE",
});

// Ride è collegato a User
Ride.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

// Ride è collegato a Vehicle
Ride.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "SET NULL",
});

// Ride è collegato a Parking di inizio
Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_inizio",
  as: "parkingInizio",
});

// Ride è collegato a Parking di fine
Ride.belongsTo(Parking, {
  foreignKey: "id_parcheggio_fine",
  as: "parkingFine",
});

// Feedback è collegato a User
Feedback.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
});

// Feedback è collegato a Vehicle - ELIMINA in cascata
Feedback.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "CASCADE",
});

// User ha molti Feedback
User.hasMany(Feedback, {
  foreignKey: "id_utente",
  as: "feedbacks",
});

// Vehicle ha molti Feedback
Vehicle.hasMany(Feedback, {
  foreignKey: "id_mezzo",
  as: "feedbacks",
});

export { Vehicle, Parking, User, Report, Ride, Feedback };
