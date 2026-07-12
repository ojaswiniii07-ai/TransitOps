import React, { useState } from 'react';
import { useApp, type ExpenseType } from '../context/AppContext';
import { 
  Plus, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Truck
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, vehicles, addExpense, activeRole } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  
  // Ledger Filters
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('Toll');
  const [cost, setCost] = useState(0);
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || cost <= 0 || !description) {
      alert('Please fill out all fields correctly.');
      return;
    }

    addExpense({
      vehicleId,
      expenseType,
      cost: Number(cost),
      description
    });

    setShowAddForm(false);
    // Reset forms
    setVehicleId('');
    setExpenseType('Toll');
    setCost(0);
    setDescription('');
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchVehicle = filterVehicle === 'all' || exp.vehicleId === filterVehicle;
    const matchType = filterType === 'all' || exp.expenseType.toLowerCase() === filterType.toLowerCase();
    return matchVehicle && matchType;
  });

  const totalFilteredCost = filteredExpenses.reduce((sum, exp) => sum + exp.cost, 0);

  const isFleetManager = activeRole === 'Fleet Manager';

  // Group vehicles for filter dropdown
  const expenseVehicles = vehicles.filter(v => !v.isDeleted);

  return (
    <div className="expenses-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Fuel & Expense Ledger</h1>
          <p className="text-gray-400">Track operations receipts, toll logs, service billings, and fuel logs</p>
        </div>

        {isFleetManager && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Log Expense Receipts
          </button>
        )}
      </div>

      {/* Summary KPI Panel & Filter Panel */}
      <div className="expenses-control-grid margin-b-20">
        <div className="card flex align-center justify-between">
          <div className="flex align-center gap-15">
            <div className="kpi-icon-wrapper progress-kpi" style={{ background: 'var(--color-success-trans)' }}>
              <TrendingUp size={24} className="text-success" />
            </div>
            <div>
              <span className="text-xxs text-gray-500 font-bold uppercase block">Total Expenses (Filtered)</span>
              <span className="text-2xl font-bold text-success">${totalFilteredCost.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-xxs text-gray-500 text-right">
            <span>Showing {filteredExpenses.length} entries</span>
          </div>
        </div>

        {/* Filters */}
        <div className="card filter-panel padding-15">
          <div className="filter-header text-xs margin-b-10">
            <Filter size={14} /> <span>Ledger Filters</span>
          </div>
          <div className="flex gap-15">
            <div className="filter-group flex-grow">
              <label className="text-xxs text-gray-500">Asset Vehicle</label>
              <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} className="padding-y-5 text-xs">
                <option value="all">All Vehicles</option>
                {expenseVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>)}
              </select>
            </div>
            <div className="filter-group flex-grow">
              <label className="text-xxs text-gray-500">Expense Class</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="padding-y-5 text-xs">
                <option value="all">All Classes</option>
                <option value="Fuel">Fuel Logs</option>
                <option value="Maintenance">Maintenance Service</option>
                <option value="Toll">Road Tolls</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Log Expense Receipt Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in" style={{ maxWidth: '450px' }}>
            <h2>Log Expense Record</h2>
            <form onSubmit={handleCreate} className="form-grid">
              <div className="form-group">
                <label>Select Fleet Vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">-- Choose Vehicle --</option>
                  {expenseVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Expense Type</label>
                <select value={expenseType} onChange={(e) => setExpenseType(e.target.value as any)}>
                  <option value="Toll">Toll Fees</option>
                  <option value="Fuel">Fuel Refill</option>
                  <option value="Maintenance">Service Maintenance</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label>Cost Amount ($)</label>
                <input 
                  type="number" 
                  value={cost} 
                  onChange={(e) => setCost(Number(e.target.value))} 
                  min="1"
                  required 
                />
              </div>

              <div className="form-group span-2">
                <label>Receipt Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="e.g. State route toll gates / independent oil purchase"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">File Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="card">
        <h3>General Operations Ledger</h3>
        <table className="overview-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle Asset</th>
              <th>Type Class</th>
              <th>Billing Cost</th>
              <th>Description Receipt Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 padding-y-20">No expense logs match criteria.</td>
              </tr>
            ) : (
              filteredExpenses.map(exp => {
                const v = vehicles.find(veh => veh.id === exp.vehicleId);
                
                return (
                  <tr key={exp.id}>
                    <td>
                      <span className="flex align-center gap-5 text-gray-400 text-xs">
                        <Calendar size={12} />
                        {exp.date}
                      </span>
                    </td>
                    <td>
                      <span className="flex align-center gap-5 font-semibold text-white">
                        <Truck size={14} className="text-gray-500" />
                        {v ? v.name : 'Deleted Vehicle'}
                        <code className="text-xxs text-gray-500">({v ? v.registrationNumber : 'N/A'})</code>
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${exp.expenseType.toLowerCase()}`}>
                        {exp.expenseType}
                      </span>
                    </td>
                    <td className="font-bold text-white">
                      ${exp.cost.toLocaleString()}
                    </td>
                    <td className="text-xs text-gray-300">
                      {exp.description}
                      {exp.tripId && (
                        <span className="block text-xxs text-gray-500 italic">Linked Trip ID: <code>{exp.tripId}</code></span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
