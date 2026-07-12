from vehicle_service import *

# ---------- ADD ----------
# add_vehicle(
#     "DL01AB1234",
#     "Tata Ace",
#     "Mini Truck",
#     800,
#     25000,
#     650000,
#     "Available"
# )

# ---------- UPDATE ----------
update_vehicle_status(1, "On Trip")

# ---------- RETIRE ----------
# update_vehicle_status(1, "Retired")

# ---------- DELETE ----------
# delete_vehicle(1)

# ---------- DISPLAY ----------
vehicles = get_all_vehicles()

print("\n------ VEHICLES ------")

for vehicle in vehicles:
    print(dict(vehicle))