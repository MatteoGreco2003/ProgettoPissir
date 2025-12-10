import Vehicle from "./Vehicle.js";
import Parking from "./Parking.js";

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

export { Vehicle, Parking };
