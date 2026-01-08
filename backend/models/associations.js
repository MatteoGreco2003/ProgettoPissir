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

// Report è collegato a User - SET NULL se utente cancellato
Report.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
  onDelete: "SET NULL",
});

// Report è collegato a Vehicle - CASCADE se mezzo cancellato
Report.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "CASCADE",
});

// Ride è collegato a User - SET NULL se utente cancellato
Ride.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
  onDelete: "SET NULL",
});

// Ride è collegato a Vehicle - SET NULL se mezzo cancellato
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

// Feedback è collegato a User - SET NULL se utente cancellato
Feedback.belongsTo(User, {
  foreignKey: "id_utente",
  as: "user",
  onDelete: "SET NULL",
});

// Feedback è collegato a Vehicle - CASCADE se mezzo cancellato
Feedback.belongsTo(Vehicle, {
  foreignKey: "id_mezzo",
  as: "vehicle",
  onDelete: "CASCADE",
});

// User ha molti Feedback - SET NULL se utente cancellato
User.hasMany(Feedback, {
  foreignKey: "id_utente",
  as: "feedbacks",
  onDelete: "SET NULL",
});

// User ha molti Ride - SET NULL se utente cancellato
User.hasMany(Ride, {
  foreignKey: "id_utente",
  as: "rides",
  onDelete: "SET NULL",
});

// User ha molti Report - SET NULL se utente cancellato
User.hasMany(Report, {
  foreignKey: "id_utente",
  as: "reports",
  onDelete: "SET NULL",
});

// Vehicle ha molti Feedback - CASCADE se mezzo cancellato
Vehicle.hasMany(Feedback, {
  foreignKey: "id_mezzo",
  as: "feedbacks",
  onDelete: "CASCADE",
});

export { Vehicle, Parking, User, Report, Ride, Feedback };
