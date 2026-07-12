import React, { createContext, useContext, useState, useEffect } from 'react';

// ==========================================
// Type Definitions
// ==========================================

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  model: string;
  type: string; // e.g., 'Van', 'Truck', 'Trailer'
  maxCapacity: number; // in kg
  odometer: number; // in km
  acquisitionCost: number;
  status: VehicleStatus;
  region: string; // e.g., 'North', 'South', 'East', 'West', 'Central'
  isDeleted?: boolean;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  type: 'Registration' | 'Insurance' | 'Pollution' | 'Fitness';
  documentNumber: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring Soon' | 'Expired';
}

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number; // 0 to 100
  status: DriverStatus;
  isDeleted?: boolean;
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number; // kg
  plannedDistance: number; // km
  actualDistance?: number; // km (entered on completion)
  status: TripStatus;
  revenue: number; // calculated or entered
  fuelConsumed?: number; // Litres (entered on completion)
  completionOdometer?: number; // km
  date: string;
  region: string; // inherited from vehicle
  isDeleted?: boolean;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string; // e.g., 'Oil Change', 'Tire Rotation', 'Engine Repair'
  description: string;
  startDate: string;
  endDate?: string;
  cost: number;
  provider: string;
  status: 'In Progress' | 'Completed';
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  fuelQuantity: number; // Litres
  fuelCost: number; // $
  date: string;
}

export type ExpenseType = 'Fuel' | 'Maintenance' | 'Toll' | 'Other';

export interface Expense {
  id: string;
  vehicleId: string;
  tripId?: string;
  expenseType: ExpenseType;
  cost: number;
  date: string;
  description: string;
}

// ==========================================
// Context Interface
// ==========================================

interface AppContextProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  
  // Data State
  vehicles: Vehicle[];
  documents: VehicleDocument[];
  drivers: Driver[];
  trips: Trip[];
  maintenanceLogs: MaintenanceLog[];
  fuelLogs: FuelLog[];
  expenses: Expense[];
  
  // Vehicles CRUD
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'status'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void; // soft delete
  
  // Document actions
  addDocument: (doc: Omit<VehicleDocument, 'id' | 'status'>) => void;
  updateDocument: (id: string, updates: Partial<VehicleDocument>) => void;
  
  // Drivers CRUD
  addDriver: (driver: Omit<Driver, 'id' | 'status' | 'safetyScore'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  deleteDriver: (id: string) => void; // soft delete
  
  // Trips CRUD & Workflows
  createTrip: (trip: Omit<Trip, 'id' | 'status' | 'revenue' | 'region' | 'date'>) => string;
  dispatchTrip: (tripId: string) => { success: boolean; error?: string };
  completeTrip: (
    tripId: string, 
    data: { finalOdometer: number; fuelConsumed: number; fuelCost: number; actualDistance: number; revenue: number }
  ) => { success: boolean; error?: string };
  cancelTrip: (tripId: string) => void;
  
  // Maintenance Workflows
  startMaintenance: (log: Omit<MaintenanceLog, 'id' | 'startDate' | 'status' | 'endDate'>) => { success: boolean; error?: string };
  closeMaintenance: (maintenanceId: string, actualCost: number, endDate: string) => void;
  
  // Expenses & Fuel Logs
  addFuelLog: (log: Omit<FuelLog, 'id' | 'date'>) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  
  // Helper functions
  checkLicenseValidity: (expiryDate: string) => 'Valid' | 'Expiring Soon' | 'Expired';
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// ==========================================
// Mock Initial Data
// ==========================================

const mockUsers: User[] = [
  { id: '1', name: 'John Fleet Manager', email: 'manager@transitops.com', role: 'Fleet Manager' },
  { id: '2', name: 'Dan Dispatcher', email: 'dispatch@transitops.com', role: 'Dispatcher' },
  { id: '3', name: 'Sarah Safety Officer', email: 'safety@transitops.com', role: 'Safety Officer' },
  { id: '4', name: 'Fiona Financial Analyst', email: 'finance@transitops.com', role: 'Financial Analyst' },
];

const initialVehicles: Vehicle[] = [
  { id: 'v1', registrationNumber: 'TX-9082', name: 'Van-05', model: 'Ford Transit', type: 'Van', maxCapacity: 500, odometer: 12450, acquisitionCost: 32000, status: 'Available', region: 'North' },
  { id: 'v2', registrationNumber: 'CA-5541', name: 'Truck-12', model: 'Freightliner M2', type: 'Truck', maxCapacity: 5000, odometer: 88400, acquisitionCost: 89000, status: 'On Trip', region: 'South' },
  { id: 'v3', registrationNumber: 'NY-3312', name: 'Sprinter-03', model: 'Mercedes Sprinter', type: 'Van', maxCapacity: 1500, odometer: 24100, acquisitionCost: 48000, status: 'In Shop', region: 'East' },
  { id: 'v4', registrationNumber: 'FL-7721', name: 'Trailer-09', model: 'Volvo VNL 64T', type: 'Trailer', maxCapacity: 15000, odometer: 185000, acquisitionCost: 135000, status: 'Retired', region: 'West' },
  { id: 'v5', registrationNumber: 'IL-9004', name: 'Van-18', model: 'Chevrolet Express', type: 'Van', maxCapacity: 800, odometer: 4200, acquisitionCost: 35000, status: 'Available', region: 'Central' }
];

const initialDocuments: VehicleDocument[] = [
  { id: 'd1', vehicleId: 'v1', type: 'Registration', documentNumber: 'REG-TX-9082', expiryDate: '2027-08-14', status: 'Valid' },
  { id: 'd2', vehicleId: 'v1', type: 'Insurance', documentNumber: 'INS-TX-9082', expiryDate: '2026-09-01', status: 'Valid' },
  { id: 'd3', vehicleId: 'v3', type: 'Pollution', documentNumber: 'POL-NY-3312', expiryDate: '2026-07-20', status: 'Expiring Soon' },
  { id: 'd4', vehicleId: 'v2', type: 'Fitness', documentNumber: 'FIT-CA-5541', expiryDate: '2025-05-12', status: 'Expired' }
];

const initialDrivers: Driver[] = [
  { id: 'dr1', name: 'Alex Miller', licenseNumber: 'LC-88390', licenseCategory: 'Class A CDL', licenseExpiryDate: '2028-11-20', contactNumber: '+1-555-0192', safetyScore: 96, status: 'Available' },
  { id: 'dr2', name: 'Bob Henderson', licenseNumber: 'LC-11920', licenseCategory: 'Class B CDL', licenseExpiryDate: '2027-04-15', contactNumber: '+1-555-0145', safetyScore: 89, status: 'On Trip' },
  { id: 'dr3', name: 'Charlie Davis', licenseNumber: 'LC-77481', licenseCategory: 'Class A CDL', licenseExpiryDate: '2026-02-10', contactNumber: '+1-555-0111', safetyScore: 42, status: 'Suspended' },
  { id: 'dr4', name: 'David Kim', licenseNumber: 'LC-99081', licenseCategory: 'Class C Standard', licenseExpiryDate: '2028-06-30', contactNumber: '+1-555-0177', safetyScore: 91, status: 'Available' }
];

const initialTrips: Trip[] = [
  { id: 't1', source: 'Austin, TX', destination: 'Dallas, TX', vehicleId: 'v2', driverId: 'dr2', cargoWeight: 4200, plannedDistance: 320, status: 'Dispatched', revenue: 1500, date: '2026-07-10', region: 'South' },
  { id: 't2', source: 'Boston, MA', destination: 'New York, NY', vehicleId: 'v1', driverId: 'dr1', cargoWeight: 350, plannedDistance: 350, actualDistance: 350, status: 'Completed', revenue: 950, fuelConsumed: 45, completionOdometer: 12450, date: '2026-07-08', region: 'North' }
];

const initialMaintenanceLogs: MaintenanceLog[] = [
  { id: 'm1', vehicleId: 'v3', type: 'Oil Change & Filter', description: 'Regular oil replacement and system check', startDate: '2026-07-11', status: 'In Progress', cost: 0, provider: 'Pro-Fleet Auto Repairs' }
];

const initialFuelLogs: FuelLog[] = [
  { id: 'f1', vehicleId: 'v1', tripId: 't2', fuelQuantity: 45, fuelCost: 180, date: '2026-07-08' }
];

const initialExpenses: Expense[] = [
  { id: 'e1', vehicleId: 'v1', tripId: 't2', expenseType: 'Fuel', cost: 180, date: '2026-07-08', description: 'Fuel purchase of 45L for Boston -> NY trip' },
  { id: 'e2', vehicleId: 'v1', expenseType: 'Toll', cost: 35, date: '2026-07-08', description: 'State Highway Toll gate charges' },
  { id: 'e3', vehicleId: 'v3', expenseType: 'Maintenance', cost: 420, date: '2026-06-15', description: 'Brake pad replacement and alignment' }
];

// ==========================================
// Provider Component
// ==========================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('transitops_user');
    return saved ? JSON.parse(saved) : mockUsers[0]; // defaults to first user (Fleet Manager)
  });
  
  const [activeRole, setActiveRole] = useState<Role>(() => {
    const saved = localStorage.getItem('transitops_role');
    return saved ? (saved as Role) : 'Fleet Manager';
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('transitops_user', JSON.stringify(currentUser));
      setActiveRole(currentUser.role);
    } else {
      localStorage.removeItem('transitops_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('transitops_role', activeRole);
  }, [activeRole]);

  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('transitops_vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  const [documents, setDocuments] = useState<VehicleDocument[]>(() => {
    const saved = localStorage.getItem('transitops_documents');
    return saved ? JSON.parse(saved) : initialDocuments;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('transitops_drivers');
    return saved ? JSON.parse(saved) : initialDrivers;
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('transitops_trips');
    return saved ? JSON.parse(saved) : initialTrips;
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('transitops_maintenance');
    return saved ? JSON.parse(saved) : initialMaintenanceLogs;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('transitops_fuel');
    return saved ? JSON.parse(saved) : initialFuelLogs;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('transitops_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem('transitops_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('transitops_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('transitops_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('transitops_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('transitops_maintenance', JSON.stringify(maintenanceLogs));
  }, [maintenanceLogs]);

  useEffect(() => {
    localStorage.setItem('transitops_fuel', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('transitops_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Helper date checking function
  const checkLicenseValidity = (expiryDate: string): 'Valid' | 'Expiring Soon' | 'Expired' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return 'Expired';
    if (daysDiff <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  // ==========================================
  // Vehicle Handlers
  // ==========================================
  const addVehicle = (newVeh: Omit<Vehicle, 'id' | 'status'>) => {
    const veh: Vehicle = {
      ...newVeh,
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      status: 'Available'
    };
    setVehicles(prev => [...prev, veh]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVehicle = (id: string) => {
    // Soft delete to avoid breaking past reports
    updateVehicle(id, { isDeleted: true });
  };

  // Vehicle Document Handlers
  const addDocument = (newDoc: Omit<VehicleDocument, 'id' | 'status'>) => {
    const doc: VehicleDocument = {
      ...newDoc,
      id: 'doc_' + Math.random().toString(36).substr(2, 9),
      status: checkLicenseValidity(newDoc.expiryDate)
    };
    setDocuments(prev => [...prev, doc]);
  };

  const updateDocument = (id: string, updates: Partial<VehicleDocument>) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        const merged = { ...d, ...updates };
        if (updates.expiryDate) {
          merged.status = checkLicenseValidity(updates.expiryDate);
        }
        return merged;
      }
      return d;
    }));
  };

  // ==========================================
  // Driver Handlers
  // ==========================================
  const addDriver = (newDriver: Omit<Driver, 'id' | 'status' | 'safetyScore'>) => {
    const d: Driver = {
      ...newDriver,
      id: 'dr_' + Math.random().toString(36).substr(2, 9),
      status: 'Available',
      safetyScore: 100 // default initial score
    };
    setDrivers(prev => [...prev, d]);
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDriver = (id: string) => {
    updateDriver(id, { isDeleted: true });
  };

  // ==========================================
  // Trip Workflows
  // ==========================================
  const createTrip = (newTrip: Omit<Trip, 'id' | 'status' | 'revenue' | 'region' | 'date'>) => {
    const vehicle = vehicles.find(v => v.id === newTrip.vehicleId);
    const id = 't_' + Math.random().toString(36).substr(2, 9);
    
    // Estimate default revenue: weight * distance * $0.40
    const estimatedRevenue = Math.round(newTrip.cargoWeight * newTrip.plannedDistance * 0.0004 * 100) / 100;

    const trip: Trip = {
      ...newTrip,
      id,
      status: 'Draft',
      revenue: Math.max(50, estimatedRevenue), // Minimum base revenue $50
      date: new Date().toISOString().split('T')[0],
      region: vehicle ? vehicle.region : 'Central'
    };

    setTrips(prev => [...prev, trip]);
    return id;
  };

  const dispatchTrip = (tripId: string): { success: boolean; error?: string } => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const driver = drivers.find(d => d.id === trip.driverId);

    if (!vehicle) return { success: false, error: 'Vehicle assigned is missing.' };
    if (!driver) return { success: false, error: 'Driver assigned is missing.' };

    // 1. Vehicle Checks
    if (vehicle.isDeleted) return { success: false, error: 'Cannot dispatch: Vehicle is deleted.' };
    if (vehicle.status === 'Retired') return { success: false, error: 'Cannot dispatch: Vehicle is Retired.' };
    if (vehicle.status === 'In Shop') return { success: false, error: 'Cannot dispatch: Vehicle is In Shop (undergoing maintenance).' };
    if (vehicle.status === 'On Trip') return { success: false, error: 'Cannot dispatch: Vehicle is already assigned to an active trip.' };

    // 2. Driver Checks
    if (driver.isDeleted) return { success: false, error: 'Cannot dispatch: Driver is deleted.' };
    if (driver.status === 'Suspended') return { success: false, error: 'Cannot dispatch: Driver is Suspended due to safety issues.' };
    if (driver.status === 'On Trip') return { success: false, error: 'Cannot dispatch: Driver is already on another active trip.' };
    
    const licenseStatus = checkLicenseValidity(driver.licenseExpiryDate);
    if (licenseStatus === 'Expired') return { success: false, error: 'Cannot dispatch: Driver license is expired!' };

    // 3. Cargo Checks
    if (trip.cargoWeight > vehicle.maxCapacity) {
      return { success: false, error: `Cannot dispatch: Cargo weight (${trip.cargoWeight}kg) exceeds vehicle maximum capacity (${vehicle.maxCapacity}kg).` };
    }

    // Execution of dispatch: update statuses
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: 'Dispatched' } : t));
    setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'On Trip' } : v));
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: 'On Trip' } : d));

    return { success: true };
  };

  const completeTrip = (
    tripId: string, 
    data: { finalOdometer: number; fuelConsumed: number; fuelCost: number; actualDistance: number; revenue: number }
  ): { success: boolean; error?: string } => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    // Validation: final odometer cannot be less than initial odometer
    if (data.finalOdometer < vehicle.odometer) {
      return { success: false, error: `Invalid final odometer. It must be at least the vehicle's current odometer (${vehicle.odometer} km).` };
    }

    // Complete Trip status
    setTrips(prev => prev.map(t => t.id === tripId ? { 
      ...t, 
      status: 'Completed',
      actualDistance: data.actualDistance,
      revenue: data.revenue,
      fuelConsumed: data.fuelConsumed,
      completionOdometer: data.finalOdometer
    } : t));

    // Release Vehicle
    setVehicles(prev => prev.map(v => v.id === trip.vehicleId ? { 
      ...v, 
      status: 'Available', 
      odometer: data.finalOdometer 
    } : v));

    // Release Driver
    setDrivers(prev => prev.map(d => d.id === trip.driverId ? { ...d, status: 'Available' } : d));

    // Log Fuel Expense
    const fuelLogId = 'f_' + Math.random().toString(36).substr(2, 9);
    const dateToday = new Date().toISOString().split('T')[0];
    
    setFuelLogs(prev => [...prev, {
      id: fuelLogId,
      vehicleId: trip.vehicleId,
      tripId,
      fuelQuantity: data.fuelConsumed,
      fuelCost: data.fuelCost,
      date: dateToday
    }]);

    setExpenses(prev => [...prev, {
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      vehicleId: trip.vehicleId,
      tripId,
      expenseType: 'Fuel',
      cost: data.fuelCost,
      date: dateToday,
      description: `Fuel purchase (${data.fuelConsumed}L) for trip ${trip.source} to ${trip.destination}`
    }]);

    return { success: true };
  };

  const cancelTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: 'Cancelled' } : t));
    
    // Release vehicle and driver if they were active on this trip
    if (trip.status === 'Dispatched') {
      setVehicles(prev => prev.map(v => v.id === trip.vehicleId ? { ...v, status: 'Available' } : v));
      setDrivers(prev => prev.map(d => d.id === trip.driverId ? { ...d, status: 'Available' } : d));
    }
  };

  // ==========================================
  // Maintenance Workflows
  // ==========================================
  const startMaintenance = (newLog: Omit<MaintenanceLog, 'id' | 'startDate' | 'status' | 'endDate'>): { success: boolean; error?: string } => {
    const vehicle = vehicles.find(v => v.id === newLog.vehicleId);
    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    if (vehicle.status === 'On Trip') {
      return { success: false, error: 'Vehicle is currently on a trip and cannot be serviced.' };
    }

    const log: MaintenanceLog = {
      ...newLog,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      startDate: new Date().toISOString().split('T')[0],
      status: 'In Progress'
    };

    setMaintenanceLogs(prev => [...prev, log]);
    setVehicles(prev => prev.map(v => v.id === newLog.vehicleId ? { ...v, status: 'In Shop' } : v));

    return { success: true };
  };

  const closeMaintenance = (maintenanceId: string, actualCost: number, endDate: string) => {
    const log = maintenanceLogs.find(m => m.id === maintenanceId);
    if (!log) return;

    setMaintenanceLogs(prev => prev.map(m => m.id === maintenanceId ? { 
      ...m, 
      status: 'Completed', 
      cost: actualCost,
      endDate 
    } : m));

    // Release vehicle
    const vehicle = vehicles.find(v => v.id === log.vehicleId);
    if (vehicle) {
      setVehicles(prev => prev.map(v => v.id === log.vehicleId ? { 
        ...v, 
        status: v.status === 'Retired' ? 'Retired' : 'Available' 
      } : v));
    }

    // Add expense record
    setExpenses(prev => [...prev, {
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      vehicleId: log.vehicleId,
      expenseType: 'Maintenance',
      cost: actualCost,
      date: endDate,
      description: `Service complete: ${log.type} (${log.description})`
    }]);
  };

  // ==========================================
  // Fuel & Expense Logging
  // ==========================================
  const addFuelLog = (newFuel: Omit<FuelLog, 'id' | 'date'>) => {
    const dateToday = new Date().toISOString().split('T')[0];
    const log: FuelLog = {
      ...newFuel,
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      date: dateToday
    };

    setFuelLogs(prev => [...prev, log]);
    
    // Log expense
    setExpenses(prev => [...prev, {
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      vehicleId: newFuel.vehicleId,
      expenseType: 'Fuel',
      cost: newFuel.fuelCost,
      date: dateToday,
      description: `Independent fuel top-up of ${newFuel.fuelQuantity}L`
    }]);
  };

  const addExpense = (newExp: Omit<Expense, 'id' | 'date'>) => {
    const dateToday = new Date().toISOString().split('T')[0];
    const exp: Expense = {
      ...newExp,
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      date: dateToday
    };

    setExpenses(prev => [...prev, exp]);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      activeRole,
      setActiveRole,
      vehicles,
      documents,
      drivers,
      trips,
      maintenanceLogs,
      fuelLogs,
      expenses,
      
      addVehicle,
      updateVehicle,
      deleteVehicle,
      
      addDocument,
      updateDocument,
      
      addDriver,
      updateDriver,
      deleteDriver,
      
      createTrip,
      dispatchTrip,
      completeTrip,
      cancelTrip,
      
      startMaintenance,
      closeMaintenance,
      
      addFuelLog,
      addExpense,
      
      checkLicenseValidity
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
