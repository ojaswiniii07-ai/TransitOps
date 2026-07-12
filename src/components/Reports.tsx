import React from 'react';
import { useApp } from '../context/AppContext';
import { Download } from 'lucide-react';

export const Reports: React.FC = () => {
  const { vehicles, trips, expenses } = useApp();

  // Calculation per vehicle from backend data
  const reportData = vehicles.filter(v => v.status !== 'Retired').map(v => {
    const vCompletedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === 'Completed');
    const totalDistance = vCompletedTrips.reduce((sum, t) => sum + (t.distance || 0), 0);

    const vExpenses = expenses.filter(e => e.vehicle_id === v.id);
    const maintenanceCost = vExpenses.filter(e => e.category === 'Maintenance').reduce((sum, e) => sum + e.amount, 0);
    const fuelCost = vExpenses.filter(e => e.category === 'Fuel').reduce((sum, e) => sum + e.amount, 0);
    const tollCost = vExpenses.filter(e => e.category === 'Toll').reduce((sum, e) => sum + e.amount, 0);
    const otherCost = vExpenses.filter(e => !['Fuel', 'Maintenance', 'Toll'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

    const operationalCost = fuelCost + maintenanceCost + tollCost + otherCost;
    const totalRevenue = 0; // Revenue not tracked in backend expenses
    const netReturn = totalRevenue - (maintenanceCost + fuelCost);
    const roi = v.acquisition_cost > 0 ? (netReturn / v.acquisition_cost) * 100 : 0;

    return {
      vehicle: v,
      completedTripsCount: vCompletedTrips.length,
      totalDistance,
      totalRevenue,
      operationalCost,
      maintenanceCost,
      fuelCost,
      netReturn,
      roi: Math.round(roi * 100) / 100,
    };
  });

  // CSV Export utility
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVehicles = () => {
    const headers = ['ID', 'LicensePlate', 'Make', 'Model', 'Type', 'MaxCapacity_kg', 'Odometer_km', 'AcquisitionCost', 'Status', 'Region'];
    const rows = vehicles.map(v => [
      v.id, v.license_plate, v.make, v.model, v.vehicle_type,
      v.max_capacity, v.odometer, v.acquisition_cost, v.status, v.region || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Fleet_Report.csv');
  };

  const handleExportTrips = () => {
    const headers = ['ID', 'Route', 'Origin', 'Destination', 'VehicleID', 'DriverID', 'Distance_km', 'Status', 'CreatedAt'];
    const rows = trips.map(t => [
      t.id, `"${t.route}"`, `"${t.origin || ''}"`, `"${t.destination || ''}"`,
      t.vehicle_id, t.driver_id, t.distance, t.status, t.created_at
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Trips_Ledger.csv');
  };

  const handleExportExpenses = () => {
    const headers = ['ID', 'VehicleID', 'Category', 'Amount', 'Status', 'Date', 'Notes'];
    const rows = expenses.map(e => [
      e.id, e.vehicle_id, e.category, e.amount, e.status, e.date, `"${e.notes || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Expenses_Ledger.csv');
  };

  return (
    <div className="reports-view animate-fade-in">
      <div className="view-header">
        <h1>Reports & Financial Analytics</h1>
        <p className="text-gray-400">Export operations data and audit fleet efficiency metrics</p>
      </div>

      {/* CSV Export Panel */}
      <div className="card margin-b-20">
        <h3>Raw Data Exports</h3>
        <p className="text-gray-400 text-xs margin-b-15">Download detailed spreadsheets in CSV format for external analysis</p>
        <div className="flex gap-15 flex-wrap">
          <button className="btn btn-secondary flex align-center gap-5" onClick={handleExportVehicles}>
            <Download size={16} /> Export Vehicle Registry (.csv)
          </button>
          <button className="btn btn-secondary flex align-center gap-5" onClick={handleExportTrips}>
            <Download size={16} /> Export Trips Ledger (.csv)
          </button>
          <button className="btn btn-secondary flex align-center gap-5" onClick={handleExportExpenses}>
            <Download size={16} /> Export Financial Ledger (.csv)
          </button>
        </div>
      </div>

      {/* Fleet Cost Analysis */}
      <div className="card">
        <h3>Asset Operational Cost Analysis</h3>
        <p className="text-gray-400 text-xs margin-b-15">
          Breakdown of operational costs per vehicle from backend expense data
        </p>

        <table className="overview-table">
          <thead>
            <tr>
              <th>Vehicle Asset</th>
              <th>Acquisition Cost</th>
              <th>Completed Trips</th>
              <th>Total Distance</th>
              <th>Fuel Cost</th>
              <th>Maintenance Cost</th>
              <th>Total Operational Cost</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map(data => (
              <tr key={data.vehicle.id}>
                <td>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{data.vehicle.make} {data.vehicle.model}</span>
                    <code className="text-xxs text-gray-500">{data.vehicle.license_plate}</code>
                  </div>
                </td>
                <td className="text-white">${data.vehicle.acquisition_cost.toLocaleString()}</td>
                <td className="text-center">{data.completedTripsCount}</td>
                <td className="text-white">{data.totalDistance.toLocaleString()} km</td>
                <td className="text-gray-400">${data.fuelCost.toLocaleString()}</td>
                <td className="text-gray-400">${data.maintenanceCost.toLocaleString()}</td>
                <td className="font-semibold text-warning">${data.operationalCost.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
