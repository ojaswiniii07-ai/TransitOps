// ============================================================================
// TransitOps API Service Layer
// Centralized HTTP client for all backend communication.
// ============================================================================

const API_BASE = '/api';

// ── Generic Helpers ──────────────────────────────────────────────────────────

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  // Handle 204 No Content or empty responses
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

// ── Type Definitions (matching backend Pydantic schemas) ─────────────────────

export interface DashboardKPIs {
  total_vehicles: number;
  active_vehicles: number;
  total_drivers: number;
  active_drivers: number;
  active_trips: number;
  completed_trips: number;
  healthy_vehicles: number;
  upcoming_maintenance: number;
  overdue_maintenance: number;
  unread_notifications: number;
  pending_approvals: number;
  total_expenses_pending: number;
}

export interface VehicleAPI {
  id: number;
  license_plate: string;
  make: string;
  model: string;
  vehicle_type: string;
  year: number | null;
  odometer: number;
  last_service_odometer: number;
  max_capacity: number;
  acquisition_cost: number;
  region: string | null;
  status: string;
  insurance_expiry: string | null;
  fitness_expiry: string | null;
  pollution_expiry: string | null;
  rc_expiry: string | null;
  maintenance_interval: number;
  notes: string | null;
  created_at: string;
}

export interface VehicleCreateAPI {
  license_plate: string;
  make: string;
  model: string;
  vehicle_type: string;
  year?: number;
  odometer?: number;
  last_service_odometer?: number;
  max_capacity?: number;
  acquisition_cost?: number;
  region?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
  pollution_expiry?: string;
  rc_expiry?: string;
  maintenance_interval?: number;
  notes?: string;
}

export interface VehicleUpdateAPI {
  license_plate?: string;
  make?: string;
  model?: string;
  vehicle_type?: string;
  year?: number;
  odometer?: number;
  last_service_odometer?: number;
  max_capacity?: number;
  acquisition_cost?: number;
  region?: string;
  status?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
  pollution_expiry?: string;
  rc_expiry?: string;
  maintenance_interval?: number;
  notes?: string;
}

export interface DriverAPI {
  id: number;
  name: string;
  phone: string | null;
  license_number: string;
  license_category: string | null;
  license_expiry: string;
  medical_expiry: string | null;
  safety_score: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface DriverCreateAPI {
  name: string;
  phone?: string;
  license_number: string;
  license_category?: string;
  license_expiry: string;
  medical_expiry?: string;
  safety_score?: number;
  notes?: string;
}

export interface DriverUpdateAPI {
  name?: string;
  phone?: string;
  license_number?: string;
  license_category?: string;
  license_expiry?: string;
  medical_expiry?: string;
  safety_score?: number;
  status?: string;
  notes?: string;
}

export interface TripAPI {
  id: number;
  vehicle_id: number;
  driver_id: number;
  route: string;
  origin: string | null;
  destination: string | null;
  distance: number;
  status: string;
  scheduled_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  delay_reason: string | null;
  created_at: string;
}

export interface TripCreateAPI {
  vehicle_id: number;
  driver_id: number;
  route: string;
  origin?: string;
  destination?: string;
  distance?: number;
  scheduled_at?: string;
}

export interface TripStatusUpdateAPI {
  status: string;
  reason?: string;
  odometer_reading?: number;
}

export interface ExpenseAPI {
  id: number;
  vehicle_id: number;
  driver_id: number | null;
  trip_id: number | null;
  category: string;
  amount: number;
  date: string;
  status: string;
  notes: string | null;
  submitted_by: number | null;
  created_at: string;
}

export interface ExpenseCreateAPI {
  vehicle_id: number;
  driver_id?: number;
  trip_id?: number;
  category: string;
  amount: number;
  date?: string;
  notes?: string;
}

export interface MaintenanceScheduleAPI {
  id: number;
  vehicle_id: number;
  next_service_date: string | null;
  next_service_odometer: number;
  last_service_date: string | null;
  current_status: string;
  last_updated: string;
}

export interface NotificationAPI {
  id: number;
  user_id: number | null;
  role: string | null;
  title: string;
  description: string;
  notification_type: string;
  priority: string;
  status: string;
  created_at: string;
  read_at: string | null;
}

export interface NotificationCountAPI {
  total: number;
  unread: number;
  read: number;
  archived: number;
}

export interface ApprovalAPI {
  id: number;
  request_type: string;
  entity_id: number | null;
  entity_type: string | null;
  requested_by: number;
  approver_id: number | null;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogAPI {
  id: number;
  user_id: number | null;
  entity_type: string;
  entity_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
  ip_address: string | null;
}

export interface DocumentAPI {
  id: number;
  owner_type: string;
  owner_id: number;
  document_type: string;
  file_url: string;
  original_filename: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  uploaded_by: number | null;
  uploaded_at: string;
  status: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getKPIs: () => request<DashboardKPIs>('/dashboard/kpis'),
};

// ── Vehicles ─────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list: (params?: { status?: string; vehicle_type?: string; region?: string }) =>
    request<VehicleAPI[]>(`/vehicles${qs(params || {})}`),

  get: (id: number) => request<VehicleAPI>(`/vehicles/${id}`),

  create: (data: VehicleCreateAPI, userId?: number) =>
    request<VehicleAPI>(`/vehicles${qs({ user_id: userId })}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: VehicleUpdateAPI, userId?: number) =>
    request<VehicleAPI>(`/vehicles/${id}${qs({ user_id: userId })}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number, userId?: number) =>
    request<{ message: string }>(`/vehicles/${id}${qs({ user_id: userId })}`, {
      method: 'DELETE',
    }),
};

// ── Drivers ──────────────────────────────────────────────────────────────────

export const driversApi = {
  list: (params?: { status?: string }) =>
    request<DriverAPI[]>(`/drivers${qs(params || {})}`),

  get: (id: number) => request<DriverAPI>(`/drivers/${id}`),

  create: (data: DriverCreateAPI, userId?: number) =>
    request<DriverAPI>(`/drivers${qs({ user_id: userId })}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: DriverUpdateAPI, userId?: number) =>
    request<DriverAPI>(`/drivers/${id}${qs({ user_id: userId })}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  suspend: (id: number, userId?: number) =>
    request<DriverAPI>(`/drivers/${id}/suspend${qs({ user_id: userId })}`, {
      method: 'PATCH',
    }),

  activate: (id: number, userId?: number) =>
    request<DriverAPI>(`/drivers/${id}/activate${qs({ user_id: userId })}`, {
      method: 'PATCH',
    }),

  delete: (id: number, userId?: number) =>
    request<{ message: string }>(`/drivers/${id}${qs({ user_id: userId })}`, {
      method: 'DELETE',
    }),
};

// ── Trips ────────────────────────────────────────────────────────────────────

export const tripsApi = {
  list: (params?: { status?: string; vehicle_id?: number; driver_id?: number }) =>
    request<TripAPI[]>(`/trips${qs(params || {})}`),

  get: (id: number) => request<TripAPI>(`/trips/${id}`),

  create: (data: TripCreateAPI, userId?: number) =>
    request<TripAPI>(`/trips${qs({ user_id: userId })}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, data: TripStatusUpdateAPI, userId?: number) =>
    request<TripAPI>(`/trips/${id}/status${qs({ user_id: userId })}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Expenses ─────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (params?: {
    vehicle_id?: number;
    driver_id?: number;
    trip_id?: number;
    status?: string;
    category?: string;
  }) => request<ExpenseAPI[]>(`/expenses${qs(params || {})}`),

  get: (id: number) => request<ExpenseAPI>(`/expenses/${id}`),

  create: (data: ExpenseCreateAPI, userId?: number) =>
    request<ExpenseAPI>(`/expenses${qs({ user_id: userId })}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: number, userId?: number) =>
    request<{ message: string }>(`/expenses/${id}${qs({ user_id: userId })}`, {
      method: 'DELETE',
    }),
};

// ── Maintenance Schedules ────────────────────────────────────────────────────

export const maintenanceApi = {
  getSchedules: (params?: { status?: string }) =>
    request<MaintenanceScheduleAPI[]>(`/maintenance/schedule${qs(params || {})}`),

  getUpcoming: () =>
    request<MaintenanceScheduleAPI[]>('/maintenance/upcoming'),

  getVehicleSchedule: (vehicleId: number) =>
    request<MaintenanceScheduleAPI>(`/maintenance/schedule/${vehicleId}`),

  recalculateAll: () =>
    request<MaintenanceScheduleAPI[]>('/maintenance/recalculate', { method: 'POST' }),
};

// ── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: {
    user_id?: number;
    role?: string;
    status?: string;
    priority?: string;
  }) => request<NotificationAPI[]>(`/notifications${qs(params || {})}`),

  getCount: (params?: { user_id?: number; role?: string }) =>
    request<NotificationCountAPI>(`/notifications/count${qs(params || {})}`),

  markRead: (id: number) =>
    request<NotificationAPI>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: (params?: { user_id?: number; role?: string }) =>
    request<{ message: string }>(`/notifications/read-all${qs(params || {})}`, {
      method: 'PATCH',
    }),

  delete: (id: number) =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }),

  triggerScan: () =>
    request<{ message: string }>('/notifications/trigger-scan', { method: 'POST' }),
};

// ── Approvals ────────────────────────────────────────────────────────────────

export const approvalsApi = {
  list: (params?: { status?: string; request_type?: string; requested_by?: number }) =>
    request<ApprovalAPI[]>(`/approvals${qs(params || {})}`),

  getPending: () =>
    request<ApprovalAPI[]>('/approvals/pending'),

  create: (data: {
    request_type: string;
    entity_id?: number;
    entity_type?: string;
    requested_by: number;
    comments?: string;
  }) =>
    request<ApprovalAPI>('/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: number, approverId: number, comments?: string) =>
    request<ApprovalAPI>(
      `/approvals/${id}/approve${qs({ approver_id: approverId, comments })}`,
      { method: 'PATCH' }
    ),

  reject: (id: number, approverId: number, comments?: string) =>
    request<ApprovalAPI>(
      `/approvals/${id}/reject${qs({ approver_id: approverId, comments })}`,
      { method: 'PATCH' }
    ),
};

// ── Audit Logs ───────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: {
    user_id?: number;
    action?: string;
    entity?: string;
    entity_id?: number;
    start_date?: string;
    end_date?: string;
  }) => request<AuditLogAPI[]>(`/audit-logs${qs(params || {})}`),
};

// ── Documents ────────────────────────────────────────────────────────────────

export const documentsApi = {
  listAll: (params?: { owner_type?: string; document_type?: string; status?: string }) =>
    request<DocumentAPI[]>(`/documents${qs(params || {})}`),

  getByOwner: (ownerId: number, params?: { owner_type?: string; document_type?: string }) =>
    request<DocumentAPI[]>(`/documents/${ownerId}${qs(params || {})}`),

  // Upload requires multipart form — special handling
  upload: async (formData: FormData): Promise<DocumentAPI> => {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData, // Do NOT set Content-Type — browser sets boundary automatically
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Upload error ${res.status}`);
    }
    return res.json();
  },

  delete: (documentId: number, userId?: number) =>
    request<{ message: string }>(`/documents/${documentId}${qs({ user_id: userId })}`, {
      method: 'DELETE',
    }),
};
