import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Truck,
  Loader2,
  Trash2
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, vehicles, addExpense, deleteExpense, activeRole, isLoading } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Ledger Filters
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState('Toll');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || amount <= 0 || !notes) {
      alert('Please fill out all fields correctly.');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        vehicle_id: Number(vehicleId),
        category,
        amount: Number(amount),
        notes,
      });

      setShowAddForm(false);
      setVehicleId('');
      setCategory('Toll');
      setAmount(0);
      setNotes('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchVehicle = filterVehicle === 'all' || String(exp.vehicle_id) === filterVehicle;
    const matchType = filterType === 'all' || exp.category.toLowerCase() === filterType.toLowerCase();
    return matchVehicle && matchType;
  });

  const totalFilteredCost = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const isFleetManager = activeRole === 'Fleet Manager';

  if (isLoading && expenses.length === 0) {
    return (
      <div className="expenses-view animate-fade-in flex align-center justify-center" style={{ minHeight: '400px' }}>
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

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
            <Plus size={16} /> Log Expense
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
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.license_plate})</option>)}
              </select>
            </div>
            <div className="filter-group flex-grow">
              <label className="text-xxs text-gray-500">Expense Class</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="padding-y-5 text-xs">
                <option value="all">All Classes</option>
                <option value="Fuel">Fuel Logs</option>
                <option value="Maintenance">Maintenance Service</option>
                <option value="Toll">Road Tolls</option>
                <option value="Miscellaneous">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Log Expense Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in" style={{ maxWidth: '450px' }}>
            <h2>Log Expense Record</h2>
            <form onSubmit={handleCreate} className="form-grid">
              <div className="form-group">
                <label>Select Fleet Vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Expense Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Toll">Toll Fees</option>
                  <option value="Fuel">Fuel Refill</option>
                  <option value="Maintenance">Service Maintenance</option>
                  <option value="Miscellaneous">Other Miscellaneous</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label>Amount ($)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))} 
                  min="1"
                  required 
                />
              </div>

              <div className="form-group span-2">
                <label>Description</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="e.g. State route toll gates"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Filing...' : 'File Expense'}
                </button>
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
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Description</th>
              {isFleetManager && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={isFleetManager ? 7 : 6} className="text-center text-gray-500 padding-y-20">No expense logs match criteria.</td>
              </tr>
            ) : (
              filteredExpenses.map(exp => {
                const v = vehicles.find(veh => veh.id === exp.vehicle_id);
                
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
                        {v ? `${v.make} ${v.model}` : 'Unknown'}
                        <code className="text-xxs text-gray-500">({v ? v.license_plate : 'N/A'})</code>
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${exp.category.toLowerCase()}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="font-bold text-white">
                      ${exp.amount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${exp.status.toLowerCase()}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-300">
                      {exp.notes || ''}
                    </td>
                    {isFleetManager && (
                      <td>
                        <button 
                          className="btn btn-icon text-gray-400 hover:text-red-500"
                          onClick={async () => {
                            if (confirm('Delete this expense?')) {
                              try {
                                await deleteExpense(exp.id);
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to delete');
                              }
                            }
                          }}
                          title="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
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
