import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  CheckCircle2, 
  Wrench, 
  Navigation, 
  FileText, 
  UserCheck, 
  TrendingUp,
  Bell,
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { dashboardKPIs, vehicles, expenses, refreshDashboard, isLoading } = useApp();

  useEffect(() => {
    refreshDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading && !dashboardKPIs) {
    return (
      <div className="dashboard-view animate-fade-in flex align-center justify-center" style={{ minHeight: '400px' }}>
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  const kpi = dashboardKPIs;

  // Fallback expense calculations from local data
  const fuelExpenses = expenses.filter(e => e.category === 'Fuel').reduce((sum, e) => sum + e.amount, 0);
  const maintenanceExpenses = expenses.filter(e => e.category === 'Maintenance').reduce((sum, e) => sum + e.amount, 0);
  const tollExpenses = expenses.filter(e => e.category === 'Toll').reduce((sum, e) => sum + e.amount, 0);
  const totalCost = fuelExpenses + maintenanceExpenses + tollExpenses;

  // SVG Chart Angles/Sizes
  const maxExpense = Math.max(fuelExpenses, maintenanceExpenses, tollExpenses, 1);
  const fuelHeight = (fuelExpenses / maxExpense) * 120;
  const maintHeight = (maintenanceExpenses / maxExpense) * 120;
  const tollHeight = (tollExpenses / maxExpense) * 120;

  // Utilization
  const totalVehicles = kpi?.total_vehicles ?? vehicles.length;
  const activeVehicles = kpi?.active_vehicles ?? vehicles.filter(v => v.status !== 'Retired').length;
  const utilizationRate = totalVehicles > 0 ? Math.round(((kpi?.active_trips ?? 0) / totalVehicles) * 100) : 0;

  return (
    <div className="dashboard-view animate-fade-in">
      <div className="view-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p className="text-gray-400">Real-time status monitor & operations KPIs</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card card">
          <div className="kpi-icon-wrapper active">
            <Activity size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Vehicles</span>
            <span className="kpi-value">{activeVehicles}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper available">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Healthy Vehicles</span>
            <span className="kpi-value">{kpi?.healthy_vehicles ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper shop">
            <Wrench size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Maintenance Due</span>
            <span className="kpi-value">{(kpi?.upcoming_maintenance ?? 0) + (kpi?.overdue_maintenance ?? 0)}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper trip">
            <Navigation size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Trips</span>
            <span className="kpi-value">{kpi?.active_trips ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper pending">
            <FileText size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Completed Trips</span>
            <span className="kpi-value">{kpi?.completed_trips ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper driver">
            <UserCheck size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Drivers</span>
            <span className="kpi-value">{kpi?.active_drivers ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
            <Bell size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Unread Alerts</span>
            <span className="kpi-value">{kpi?.unread_notifications ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ClipboardCheck size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Pending Approvals</span>
            <span className="kpi-value">{kpi?.pending_approvals ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Overdue Maintenance</span>
            <span className="kpi-value">{kpi?.overdue_maintenance ?? 0}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            <DollarSign size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Pending Expenses</span>
            <span className="kpi-value">${(kpi?.total_expenses_pending ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card card highlight">
          <div className="kpi-icon-wrapper progress-kpi">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Fleet Utilization</span>
            <span className="kpi-value">{utilizationRate}%</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Expenses Cost Chart */}
        <div className="chart-card card">
          <h3>Operational Expenses Breakdown</h3>
          <p className="text-gray-400 text-xs margin-b-15">Distribution of fuel, maintenance, and tolls (Total: ${totalCost.toLocaleString()})</p>
          
          <div className="bar-chart-container">
            <svg viewBox="0 0 300 200" className="svg-chart">
              <line x1="40" y1="30" x2="280" y2="30" stroke="var(--bg-card-border)" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="90" x2="280" y2="90" stroke="var(--bg-card-border)" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="150" x2="280" y2="150" stroke="var(--bg-card-border)" strokeWidth="1" />

              <rect x="70" y={150 - fuelHeight} width="35" height={fuelHeight} rx="4" fill="var(--color-primary)" />
              <text x="87.5" y={145 - fuelHeight} textAnchor="middle" fill="#fff" fontSize="10">${fuelExpenses}</text>
              <text x="87.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Fuel</text>

              <rect x="140" y={150 - maintHeight} width="35" height={maintHeight} rx="4" fill="var(--color-warning)" />
              <text x="157.5" y={145 - maintHeight} textAnchor="middle" fill="#fff" fontSize="10">${maintenanceExpenses}</text>
              <text x="157.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Service</text>

              <rect x="210" y={150 - tollHeight} width="35" height={tollHeight} rx="4" fill="var(--color-info)" />
              <text x="227.5" y={145 - tollHeight} textAnchor="middle" fill="#fff" fontSize="10">${tollExpenses}</text>
              <text x="227.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Tolls</text>
            </svg>
          </div>
        </div>

        {/* Fleet Overview Mini */}
        <div className="chart-card card">
          <h3>Fleet Overview ({vehicles.length} vehicles)</h3>
          <p className="text-gray-400 text-xs margin-b-15">Current status of registered fleet</p>
          
          <div className="fuel-efficiency-list">
            {vehicles.length === 0 ? (
              <div className="empty-state text-center text-gray-500 padding-y-20">
                No vehicles registered yet.
              </div>
            ) : (
              vehicles.slice(0, 5).map((v) => (
                <div key={v.id} className="efficiency-item">
                  <div className="efficiency-details">
                    <span className="font-semibold text-sm">{v.make} {v.model}</span>
                    <span className="text-xs text-gray-400">{v.license_plate} • {v.vehicle_type}</span>
                  </div>
                  <div className="efficiency-metric">
                    <span className={`badge badge-${v.status.toLowerCase().replace(' ', '-')}`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
