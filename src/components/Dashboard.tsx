import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  CheckCircle2, 
  Wrench, 
  Navigation, 
  FileText, 
  UserCheck, 
  TrendingUp, 
  Filter
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { vehicles, trips, drivers, expenses } = useApp();
  
  // Local Filter States
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');

  // Filter logic for Vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (v.isDeleted) return false;
    const matchType = filterType === 'all' || v.type.toLowerCase() === filterType.toLowerCase();
    const matchStatus = filterStatus === 'all' || v.status.toLowerCase() === filterStatus.toLowerCase();
    const matchRegion = filterRegion === 'all' || v.region.toLowerCase() === filterRegion.toLowerCase();
    return matchType && matchStatus && matchRegion;
  });

  // Calculate Metrics based on filters (or global fleet stats as appropriate)
  const totalVehicles = vehicles.filter(v => !v.isDeleted && v.status !== 'Retired').length;
  const activeVehiclesCount = vehicles.filter(v => !v.isDeleted && v.status === 'On Trip').length;
  const availableVehiclesCount = vehicles.filter(v => !v.isDeleted && v.status === 'Available').length;
  const maintenanceVehiclesCount = vehicles.filter(v => !v.isDeleted && v.status === 'In Shop').length;
  
  const activeTripsCount = trips.filter(t => t.status === 'Dispatched').length;
  const pendingTripsCount = trips.filter(t => t.status === 'Draft').length;
  const driversOnDutyCount = drivers.filter(d => !d.isDeleted && d.status === 'On Trip').length;
  
  // Utilization = (Active Vehicles / Total Non-Retired Vehicles) * 100
  const utilizationRate = totalVehicles > 0 ? Math.round((activeVehiclesCount / totalVehicles) * 100) : 0;

  // Expense Calculations for Chart
  const fuelExpenses = expenses.filter(e => e.expenseType === 'Fuel').reduce((sum, e) => sum + e.cost, 0);
  const maintenanceExpenses = expenses.filter(e => e.expenseType === 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
  const tollExpenses = expenses.filter(e => e.expenseType === 'Toll').reduce((sum, e) => sum + e.cost, 0);
  const totalCost = fuelExpenses + maintenanceExpenses + tollExpenses;

  // Fuel efficiency of completed trips
  const completedTrips = trips.filter(t => t.status === 'Completed' && t.fuelConsumed && t.actualDistance);
  
  // Unique vehicle types for filter
  const vehicleTypes = Array.from(new Set(vehicles.filter(v => !v.isDeleted).map(v => v.type)));
  const regions = Array.from(new Set(vehicles.filter(v => !v.isDeleted).map(v => v.region)));

  // SVG Chart Angles/Sizes
  const maxExpense = Math.max(fuelExpenses, maintenanceExpenses, tollExpenses, 1);
  const fuelHeight = (fuelExpenses / maxExpense) * 120;
  const maintHeight = (maintenanceExpenses / maxExpense) * 120;
  const tollHeight = (tollExpenses / maxExpense) * 120;

  return (
    <div className="dashboard-view animate-fade-in">
      <div className="view-header">
        <div>
          <h1>Operations Dashboard</h1>
          <p className="text-gray-400">Real-time status monitor & operations KPIs</p>
        </div>
        
        {/* Dashboard Filters */}
        <div className="filter-panel card">
          <div className="filter-header text-sm">
            <Filter size={16} />
            <span>Filters</span>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Vehicle Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="In Shop">In Shop</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Region</label>
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                <option value="all">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
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
            <span className="kpi-value">{activeVehiclesCount}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper available">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Available Vehicles</span>
            <span className="kpi-value">{availableVehiclesCount}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper shop">
            <Wrench size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">In Maintenance</span>
            <span className="kpi-value">{maintenanceVehiclesCount}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper trip">
            <Navigation size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Active Trips</span>
            <span className="kpi-value">{activeTripsCount}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper pending">
            <FileText size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Pending Trips</span>
            <span className="kpi-value">{pendingTripsCount}</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrapper driver">
            <UserCheck size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Drivers On Duty</span>
            <span className="kpi-value">{driversOnDutyCount}</span>
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

      {/* Charts and Lists Grid */}
      <div className="dashboard-charts-grid">
        {/* Expenses Cost Chart */}
        <div className="chart-card card">
          <h3>Operational Expenses Breakdown</h3>
          <p className="text-gray-400 text-xs margin-b-15">Distribution of fuel, maintenance, and tolls (Total: ${totalCost.toLocaleString()})</p>
          
          <div className="bar-chart-container">
            <svg viewBox="0 0 300 200" className="svg-chart">
              {/* Gridlines */}
              <line x1="40" y1="30" x2="280" y2="30" stroke="var(--bg-card-border)" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="90" x2="280" y2="90" stroke="var(--bg-card-border)" strokeWidth="1" strokeDasharray="4" />
              <line x1="40" y1="150" x2="280" y2="150" stroke="var(--bg-card-border)" strokeWidth="1" />

              {/* Bar 1: Fuel */}
              <rect x="70" y={150 - fuelHeight} width="35" height={fuelHeight} rx="4" fill="var(--color-primary)" />
              <text x="87.5" y={145 - fuelHeight} textAnchor="middle" fill="#fff" fontSize="10">${fuelExpenses}</text>
              <text x="87.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Fuel</text>

              {/* Bar 2: Maintenance */}
              <rect x="140" y={150 - maintHeight} width="35" height={maintHeight} rx="4" fill="var(--color-warning)" />
              <text x="157.5" y={145 - maintHeight} textAnchor="middle" fill="#fff" fontSize="10">${maintenanceExpenses}</text>
              <text x="157.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Service</text>

              {/* Bar 3: Tolls */}
              <rect x="210" y={150 - tollHeight} width="35" height={tollHeight} rx="4" fill="var(--color-info)" />
              <text x="227.5" y={145 - tollHeight} textAnchor="middle" fill="#fff" fontSize="10">${tollExpenses}</text>
              <text x="227.5" y="168" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Tolls</text>
            </svg>
          </div>
        </div>

        {/* Recent Operational Log / Fuel Efficiency */}
        <div className="chart-card card">
          <h3>Fuel Efficiency Index (km/L)</h3>
          <p className="text-gray-400 text-xs margin-b-15">Top performing completed trips</p>
          
          <div className="fuel-efficiency-list">
            {completedTrips.length === 0 ? (
              <div className="empty-state text-center text-gray-500 padding-y-20">
                No completed trips with fuel logs yet.
              </div>
            ) : (
              completedTrips.slice(0, 4).map((trip) => {
                const efficiency = Math.round((trip.actualDistance! / trip.fuelConsumed!) * 10) / 10;
                const veh = vehicles.find(v => v.id === trip.vehicleId);
                return (
                  <div key={trip.id} className="efficiency-item">
                    <div className="efficiency-details">
                      <span className="font-semibold text-sm">{veh ? veh.name : 'Vehicle'}</span>
                      <span className="text-xs text-gray-400">{trip.source} ➜ {trip.destination}</span>
                    </div>
                    <div className="efficiency-metric">
                      <div className="metric-badge">
                        <span>{efficiency} km/L</span>
                      </div>
                      <span className="text-xxs text-gray-500">{trip.actualDistance} km / {trip.fuelConsumed}L</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Filtered Vehicles Mini View */}
      <div className="card margin-t-20">
        <div className="card-header flex justify-between align-center">
          <h3>Fleet Overview (Filtered: {filteredVehicles.length})</h3>
          <span className="text-xs text-gray-400">Shows current status of matching fleet registry</span>
        </div>
        <table className="overview-table">
          <thead>
            <tr>
              <th>Vehicle Name</th>
              <th>Reg Number</th>
              <th>Model</th>
              <th>Type</th>
              <th>Region</th>
              <th>Capacity</th>
              <th>Odometer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 padding-y-20">No vehicles match filters.</td>
              </tr>
            ) : (
              filteredVehicles.map(v => (
                <tr key={v.id}>
                  <td className="font-semibold">{v.name}</td>
                  <td><code>{v.registrationNumber}</code></td>
                  <td>{v.model}</td>
                  <td>{v.type}</td>
                  <td>{v.region}</td>
                  <td>{v.maxCapacity} kg</td>
                  <td>{v.odometer.toLocaleString()} km</td>
                  <td>
                    <span className={`badge badge-${v.status.toLowerCase().replace(' ', '-')}`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
