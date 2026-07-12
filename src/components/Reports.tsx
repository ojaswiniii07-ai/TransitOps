import React from 'react';
import { useApp } from '../context/AppContext';
import { Download } from 'lucide-react';

export const Reports: React.FC = () => {
  const { vehicles, trips, expenses } = useApp();

  // Calculation formulas:
  // ROI = (Trip Revenue - (Maintenance + Fuel)) / Acquisition Cost
  // Fuel Efficiency = Total Trip Distance / Total Trip Fuel Consumed
  // Operational Cost = Total Vehicle Maintenance + Total Vehicle Fuel + Tolls

  const reportData = vehicles.filter(v => !v.isDeleted).map(v => {
    // 1. Get Completed Trips for this Vehicle
    const vCompletedTrips = trips.filter(t => t.vehicleId === v.id && t.status === 'Completed');
    const totalDistance = vCompletedTrips.reduce((sum, t) => sum + (t.actualDistance || t.plannedDistance || 0), 0);
    const totalFuel = vCompletedTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);
    const totalRevenue = vCompletedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);

    // 2. Get Expenses for this Vehicle
    const vExpenses = expenses.filter(e => e.vehicleId === v.id);
    const maintenanceCost = vExpenses.filter(e => e.expenseType === 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
    const fuelCost = vExpenses.filter(e => e.expenseType === 'Fuel').reduce((sum, e) => sum + e.cost, 0);
    const tollCost = vExpenses.filter(e => e.expenseType === 'Toll').reduce((sum, e) => sum + e.cost, 0);
    const otherCost = vExpenses.filter(e => e.expenseType === 'Other').reduce((sum, e) => sum + e.cost, 0);

    const operationalCost = fuelCost + maintenanceCost + tollCost + otherCost;

    // 3. ROI
    // (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    const netReturn = totalRevenue - (maintenanceCost + fuelCost);
    const roi = v.acquisitionCost > 0 ? (netReturn / v.acquisitionCost) * 100 : 0;

    // 4. Fuel Economy (km/L)
    const fuelEfficiency = totalFuel > 0 ? (totalDistance / totalFuel) : 0;

    return {
      vehicle: v,
      completedTripsCount: vCompletedTrips.length,
      totalDistance,
      totalFuel,
      totalRevenue,
      operationalCost,
      maintenanceCost,
      fuelCost,
      netReturn,
      roi: Math.round(roi * 100) / 100, // round to 2 decimals
      fuelEfficiency: Math.round(fuelEfficiency * 10) / 10 // round to 1 decimal
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
    const headers = ['VehicleID', 'Name', 'RegNumber', 'Model', 'Type', 'MaxCapacity_kg', 'Odometer_km', 'AcquisitionCost', 'Status', 'Region'];
    const rows = vehicles.filter(v => !v.isDeleted).map(v => [
      v.id,
      v.name,
      v.registrationNumber,
      v.model,
      v.type,
      v.maxCapacity,
      v.odometer,
      v.acquisitionCost,
      v.status,
      v.region
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Fleet_Report.csv');
  };

  const handleExportTrips = () => {
    const headers = ['TripID', 'Source', 'Destination', 'VehicleID', 'DriverID', 'CargoWeight_kg', 'PlannedDistance_km', 'ActualDistance_km', 'Status', 'Revenue', 'FuelConsumed_L', 'CompletionOdometer_km', 'Date', 'Region'];
    const rows = trips.map(t => [
      t.id,
      `"${t.source}"`,
      `"${t.destination}"`,
      t.vehicleId,
      t.driverId,
      t.cargoWeight,
      t.plannedDistance,
      t.actualDistance || '',
      t.status,
      t.revenue,
      t.fuelConsumed || '',
      t.completionOdometer || '',
      t.date,
      t.region
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Trips_Ledger.csv');
  };

  const handleExportExpenses = () => {
    const headers = ['ExpenseID', 'VehicleID', 'TripID', 'ExpenseType', 'Cost', 'Date', 'Description'];
    const rows = expenses.map(e => [
      e.id,
      e.vehicleId,
      e.tripId || '',
      e.expenseType,
      e.cost,
      e.date,
      `"${e.description}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, 'TransitOps_Expenses_Ledger.csv');
  };

  // isFinanceOrManager check removed since not used

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

      {/* Fleet ROI Matrix */}
      <div className="card">
        <h3>Asset Financial Return-on-Investment (ROI)</h3>
        <p className="text-gray-400 text-xs margin-b-15">
          Calculated using formula: <code>(Trip Revenue - (Maintenance + Fuel)) / Acquisition Cost</code>
        </p>

        <table className="overview-table">
          <thead>
            <tr>
              <th>Vehicle Asset</th>
              <th>Acquisition Cost</th>
              <th>Completed Trips</th>
              <th>Total Revenue</th>
              <th>Service & Fuel Cost</th>
              <th>Net Operations Return</th>
              <th>Fuel Economy</th>
              <th>ROI Metric (%)</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map(data => {
              const roiColor = data.roi >= 0 ? 'text-success' : 'text-danger';
              return (
                <tr key={data.vehicle.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{data.vehicle.name}</span>
                      <code className="text-xxs text-gray-500">{data.vehicle.registrationNumber}</code>
                    </div>
                  </td>
                  <td className="text-white">${data.vehicle.acquisitionCost.toLocaleString()}</td>
                  <td className="text-center">{data.completedTripsCount}</td>
                  <td className="text-white">${data.totalRevenue.toLocaleString()}</td>
                  <td className="text-gray-400">${data.operationalCost.toLocaleString()}</td>
                  <td className={`font-semibold ${data.netReturn >= 0 ? 'text-white' : 'text-danger'}`}>
                    ${data.netReturn.toLocaleString()}
                  </td>
                  <td>
                    <span className="font-bold text-white">
                      {data.fuelEfficiency > 0 ? `${data.fuelEfficiency} km/L` : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`font-bold ${roiColor} text-md`}>
                      {data.roi}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
