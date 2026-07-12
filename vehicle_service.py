from database import get_connection

def add_vehicle(registration_number, model, vehicle_type,
                max_load_capacity, odometer,
                acquisition_cost, status):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO vehicles
        (registration_number, model, vehicle_type,
         max_load_capacity, odometer,
         acquisition_cost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        registration_number,
        model,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status
    ))

    conn.commit()
    conn.close()

    print("Vehicle Added Successfully!")


def get_all_vehicles():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM vehicles")

    vehicles = cursor.fetchall()

    conn.close()

    return vehicles


if __name__ == "__main__":

    vehicles = get_all_vehicles()

    for vehicle in vehicles:
        print("-" * 40)
        print(f"ID: {vehicle['id']}")
        print(f"Registration: {vehicle['registration_number']}")
        print(f"Model: {vehicle['model']}")
        print(f"Type: {vehicle['vehicle_type']}")
        print(f"Capacity: {vehicle['max_load_capacity']} kg")
        print(f"Odometer: {vehicle['odometer']} km")
        print(f"Cost: ₹{vehicle['acquisition_cost']}")
        print(f"Status: {vehicle['status']}")
        print("-" * 40)