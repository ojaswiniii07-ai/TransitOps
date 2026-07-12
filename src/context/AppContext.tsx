import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  vehiclesApi, driversApi, tripsApi, expensesApi, maintenanceApi,
  notificationsApi, dashboardApi,
  type VehicleAPI, type DriverAPI, type TripAPI, type ExpenseAPI,
  type MaintenanceScheduleAPI, type NotificationAPI, type DashboardKPIs,
  type VehicleCreateAPI, type VehicleUpdateAPI,
  type DriverCreateAPI, type DriverUpdateAPI,
  type TripCreateAPI, type TripStatusUpdateAPI,
  type ExpenseCreateAPI,
  type NotificationCountAPI,
} from '../api';

// ==========================================
// Type Definitions (frontend-facing, mapped from API types)
// ==========================================

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst';

export interface User {
  id: string;       // string for frontend compat; maps to numeric backend user_id
  name: string;
  email: string;
  role: Role;
}

// Re-export API types for convenience
export type { VehicleAPI as Vehicle } from '../api';
export type { DriverAPI as Driver } from '../api';
export type { TripAPI as Trip } from '../api';
export type { ExpenseAPI as Expense } from '../api';
export type { MaintenanceScheduleAPI as MaintenanceSchedule } from '../api';
export type { NotificationAPI as Notification } from '../api';
export type { DashboardKPIs } from '../api';
export type { NotificationCountAPI as NotificationCount } from '../api';

// ==========================================
// Context Interface
// ==========================================

interface AppContextProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;

  // Data State
  vehicles: VehicleAPI[];
  drivers: DriverAPI[];
  trips: TripAPI[];
  expenses: ExpenseAPI[];
  maintenanceSchedules: MaintenanceScheduleAPI[];
  notifications: NotificationAPI[];
  notificationCount: NotificationCountAPI;
  dashboardKPIs: DashboardKPIs | null;

  // Loading & Error
  isLoading: boolean;
  error: string | null;
  clearError: () => void;

  // Refresh
  refreshAll: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshMaintenanceSchedules: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshDashboard: () => Promise<void>;

  // Vehicles CRUD
  addVehicle: (data: VehicleCreateAPI) => Promise<void>;
  updateVehicle: (id: number, data: VehicleUpdateAPI) => Promise<void>;
  deleteVehicle: (id: number) => Promise<void>;

  // Drivers CRUD
  addDriver: (data: DriverCreateAPI) => Promise<void>;
  updateDriver: (id: number, data: DriverUpdateAPI) => Promise<void>;
  deleteDriver: (id: number) => Promise<void>;
  suspendDriver: (id: number) => Promise<void>;
  activateDriver: (id: number) => Promise<void>;

  // Trips
  createTrip: (data: TripCreateAPI) => Promise<void>;
  updateTripStatus: (id: number, data: TripStatusUpdateAPI) => Promise<void>;

  // Expenses
  addExpense: (data: ExpenseCreateAPI) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;

  // Notifications
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;

  // Maintenance
  recalculateMaintenance: () => Promise<void>;

  // Helper functions
  checkLicenseValidity: (expiryDate: string) => 'Valid' | 'Expiring Soon' | 'Expired';
  getUserId: () => number | undefined;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// ==========================================
// Provider Component
// ==========================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('transitops_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeRole, setActiveRole] = useState<Role>(() => {
    const saved = localStorage.getItem('transitops_role');
    return saved ? (saved as Role) : 'Fleet Manager';
  });

  // Data states
  const [vehicles, setVehicles] = useState<VehicleAPI[]>([]);
  const [drivers, setDrivers] = useState<DriverAPI[]>([]);
  const [trips, setTrips] = useState<TripAPI[]>([]);
  const [expenses, setExpenses] = useState<ExpenseAPI[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceScheduleAPI[]>([]);
  const [notifications, setNotifications] = useState<NotificationAPI[]>([]);
  const [notificationCount, setNotificationCount] = useState<NotificationCountAPI>({
    total: 0, unread: 0, read: 0, archived: 0,
  });
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs | null>(null);

  // Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = () => setError(null);

  // Persist user + role in localStorage
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

  // Helper: get numeric user_id for API calls
  const getUserId = useCallback((): number | undefined => {
    if (!currentUser) return undefined;
    const num = Number(currentUser.id);
    return isNaN(num) ? undefined : num;
  }, [currentUser]);

  // ==========================================
  // Data Fetching
  // ==========================================

  const refreshVehicles = useCallback(async () => {
    try {
      const data = await vehiclesApi.list();
      setVehicles(data);
    } catch (e: unknown) {
      console.error('Failed to fetch vehicles:', e);
    }
  }, []);

  const refreshDrivers = useCallback(async () => {
    try {
      const data = await driversApi.list();
      setDrivers(data);
    } catch (e: unknown) {
      console.error('Failed to fetch drivers:', e);
    }
  }, []);

  const refreshTrips = useCallback(async () => {
    try {
      const data = await tripsApi.list();
      setTrips(data);
    } catch (e: unknown) {
      console.error('Failed to fetch trips:', e);
    }
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      const data = await expensesApi.list();
      setExpenses(data);
    } catch (e: unknown) {
      console.error('Failed to fetch expenses:', e);
    }
  }, []);

  const refreshMaintenanceSchedules = useCallback(async () => {
    try {
      const data = await maintenanceApi.getSchedules();
      setMaintenanceSchedules(data);
    } catch (e: unknown) {
      console.error('Failed to fetch maintenance schedules:', e);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const [notifList, counts] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.getCount(),
      ]);
      setNotifications(notifList);
      setNotificationCount(counts);
    } catch (e: unknown) {
      console.error('Failed to fetch notifications:', e);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const kpis = await dashboardApi.getKPIs();
      setDashboardKPIs(kpis);
    } catch (e: unknown) {
      console.error('Failed to fetch dashboard KPIs:', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshVehicles(),
        refreshDrivers(),
        refreshTrips(),
        refreshExpenses(),
        refreshMaintenanceSchedules(),
        refreshNotifications(),
        refreshDashboard(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshVehicles, refreshDrivers, refreshTrips, refreshExpenses, refreshMaintenanceSchedules, refreshNotifications, refreshDashboard]);

  // Initial fetch when user is logged in
  useEffect(() => {
    if (currentUser) {
      refreshAll();
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================
  // Vehicle Operations
  // ==========================================

  const addVehicle = useCallback(async (data: VehicleCreateAPI) => {
    try {
      await vehiclesApi.create(data, getUserId());
      await refreshVehicles();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create vehicle';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshVehicles, refreshDashboard]);

  const updateVehicle = useCallback(async (id: number, data: VehicleUpdateAPI) => {
    try {
      await vehiclesApi.update(id, data, getUserId());
      await refreshVehicles();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update vehicle';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshVehicles, refreshDashboard]);

  const deleteVehicle = useCallback(async (id: number) => {
    try {
      await vehiclesApi.delete(id, getUserId());
      await refreshVehicles();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete vehicle';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshVehicles, refreshDashboard]);

  // ==========================================
  // Driver Operations
  // ==========================================

  const addDriver = useCallback(async (data: DriverCreateAPI) => {
    try {
      await driversApi.create(data, getUserId());
      await refreshDrivers();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create driver';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshDrivers, refreshDashboard]);

  const updateDriver = useCallback(async (id: number, data: DriverUpdateAPI) => {
    try {
      await driversApi.update(id, data, getUserId());
      await refreshDrivers();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update driver';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshDrivers, refreshDashboard]);

  const deleteDriver = useCallback(async (id: number) => {
    try {
      await driversApi.delete(id, getUserId());
      await refreshDrivers();
      await refreshDashboard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete driver';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshDrivers, refreshDashboard]);

  const suspendDriver = useCallback(async (id: number) => {
    try {
      await driversApi.suspend(id, getUserId());
      await refreshDrivers();
      await refreshNotifications();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to suspend driver';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshDrivers, refreshNotifications]);

  const activateDriver = useCallback(async (id: number) => {
    try {
      await driversApi.activate(id, getUserId());
      await refreshDrivers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to activate driver';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshDrivers]);

  // ==========================================
  // Trip Operations
  // ==========================================

  const createTrip = useCallback(async (data: TripCreateAPI) => {
    try {
      await tripsApi.create(data, getUserId());
      await Promise.all([refreshTrips(), refreshVehicles(), refreshDrivers(), refreshDashboard()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create trip';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshTrips, refreshVehicles, refreshDrivers, refreshDashboard]);

  const updateTripStatus = useCallback(async (id: number, data: TripStatusUpdateAPI) => {
    try {
      await tripsApi.updateStatus(id, data, getUserId());
      await Promise.all([
        refreshTrips(), refreshVehicles(), refreshDrivers(),
        refreshDashboard(), refreshNotifications(), refreshMaintenanceSchedules(),
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update trip status';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshTrips, refreshVehicles, refreshDrivers, refreshDashboard, refreshNotifications, refreshMaintenanceSchedules]);

  // ==========================================
  // Expense Operations
  // ==========================================

  const addExpense = useCallback(async (data: ExpenseCreateAPI) => {
    try {
      await expensesApi.create(data, getUserId());
      await Promise.all([refreshExpenses(), refreshDashboard(), refreshNotifications()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create expense';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshExpenses, refreshDashboard, refreshNotifications]);

  const deleteExpense = useCallback(async (id: number) => {
    try {
      await expensesApi.delete(id, getUserId());
      await Promise.all([refreshExpenses(), refreshDashboard()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete expense';
      setError(msg);
      throw e;
    }
  }, [getUserId, refreshExpenses, refreshDashboard]);

  // ==========================================
  // Notification Operations
  // ==========================================

  const markNotificationRead = useCallback(async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      await refreshNotifications();
    } catch (e: unknown) {
      console.error('Failed to mark notification as read:', e);
    }
  }, [refreshNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      await refreshNotifications();
    } catch (e: unknown) {
      console.error('Failed to mark all notifications as read:', e);
    }
  }, [refreshNotifications]);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await notificationsApi.delete(id);
      await refreshNotifications();
    } catch (e: unknown) {
      console.error('Failed to delete notification:', e);
    }
  }, [refreshNotifications]);

  // ==========================================
  // Maintenance Operations
  // ==========================================

  const recalculateMaintenance = useCallback(async () => {
    try {
      await maintenanceApi.recalculateAll();
      await Promise.all([refreshMaintenanceSchedules(), refreshVehicles(), refreshDashboard()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to recalculate maintenance';
      setError(msg);
      throw e;
    }
  }, [refreshMaintenanceSchedules, refreshVehicles, refreshDashboard]);

  // ==========================================
  // Helper Functions
  // ==========================================

  const checkLicenseValidity = (expiryDate: string): 'Valid' | 'Expiring Soon' | 'Expired' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return 'Expired';
    if (daysDiff <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      activeRole,
      setActiveRole,

      vehicles,
      drivers,
      trips,
      expenses,
      maintenanceSchedules,
      notifications,
      notificationCount,
      dashboardKPIs,

      isLoading,
      error,
      clearError,

      refreshAll,
      refreshVehicles,
      refreshDrivers,
      refreshTrips,
      refreshExpenses,
      refreshMaintenanceSchedules,
      refreshNotifications,
      refreshDashboard,

      addVehicle,
      updateVehicle,
      deleteVehicle,

      addDriver,
      updateDriver,
      deleteDriver,
      suspendDriver,
      activateDriver,

      createTrip,
      updateTripStatus,

      addExpense,
      deleteExpense,

      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,

      recalculateMaintenance,

      checkLicenseValidity,
      getUserId,
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
