import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Wrench, 
  CheckCircle2, 
  Calendar, 
  DollarSign
} from 'lucide-react';

export const Maintenance: React.FC = () => {
  const { 
    maintenanceLogs, 
    vehicles, 
    startMaintenance, 
    closeMaintenance,
    activeRole
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Close log states
  const [closingLogId, setClosingLogId] = useState<string | null>(null);
  const [actualCost, setActualCost] = useState<number>(150);
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('Oil Change');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !type || !description || !provider) {
      alert('Please fill out all fields.');
      return;
    }

    const res = startMaintenance({
      vehicleId,
      type,
      description,
      cost: 0, // 0 until completed
      provider
    });

    if (!res.success) {
      alert(`Service Scheduling Failed: ${res.error}`);
    } else {
      setShowAddForm(false);
      // Reset forms
      setVehicleId('');
      setType('Oil Change');
      setDescription('');
      setProvider('');
      setActiveTab('in-progress');
    }
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLogId) return;

    closeMaintenance(closingLogId, Number(actualCost), completionDate);
    setClosingLogId(null);
    setActiveTab('completed');
  };

  const filteredLogs = maintenanceLogs.filter(log => {
    if (activeTab === 'all') return true;
    return log.status.toLowerCase() === activeTab;
  });

  const isFleetManager = activeRole === 'Fleet Manager';
  
  // Eligible vehicles (not retired or deleted)
  const serviceVehicles = vehicles.filter(v => !v.isDeleted && v.status !== 'Retired');

  return (
    <div className="maintenance-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Vehicle Maintenance Logs</h1>
          <p className="text-gray-400">Track vehicle repairs, maintenance intervals, and cost histories</p>
        </div>

        {isFleetManager && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Schedule Maintenance
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-menu">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Logs</button>
        <button className={`tab-btn ${activeTab === 'in-progress' ? 'active' : ''}`} onClick={() => setActiveTab('in-progress')}>In Service</button>
        <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Closed Records</button>
      </div>

      {/* Schedule Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in">
            <h2>Send Vehicle to Shop</h2>
            <form onSubmit={handleCreate} className="form-grid">
              <div className="form-group">
                <label>Select Fleet Vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">-- Choose Vehicle --</option>
                  {serviceVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registrationNumber} - Currently {v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Maintenance Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Oil Change">Oil Change & Filter</option>
                  <option value="Tire Replacement">Tire Replacement/Rotation</option>
                  <option value="Brake Overhaul">Brake Overhaul/Service</option>
                  <option value="Engine Repair">Engine Repair/Tuning</option>
                  <option value="Electrical Repair">Electrical Systems Repair</option>
                  <option value="Body Work">Body Painting/Dents</option>
                  <option value="Inspection">Annual Compliance Inspection</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label>Issue Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Provide details about the issues or scheduled servicing checklist..."
                  rows={3}
                  required 
                />
              </div>

              <div className="form-group span-2">
                <label>Service Provider Workshop</label>
                <input 
                  type="text" 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)} 
                  placeholder="e.g. Pro-Fleet Auto Repairs"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Dispatch to Shop</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Maintenance Modal */}
      {closingLogId && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in" style={{ maxWidth: '450px' }}>
            <h2>Close Service Order</h2>
            <p className="text-gray-400 text-xs margin-b-15">Verify maintenance completion, and record finalized costs to update fleet logs.</p>
            <form onSubmit={handleCloseSubmit} className="form-grid">
              <div className="form-group">
                <label>Service Bill Cost ($)</label>
                <input 
                  type="number" 
                  value={actualCost} 
                  onChange={(e) => setActualCost(Number(e.target.value))} 
                  min="0"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Completion Date</label>
                <input 
                  type="date" 
                  value={completionDate} 
                  onChange={(e) => setCompletionDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setClosingLogId(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">Complete & Re-Authorize Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Display */}
      <div className="maintenance-list flex flex-col gap-15">
        {filteredLogs.length === 0 ? (
          <div className="card text-center text-gray-500 padding-y-40">
            <Wrench size={48} className="margin-b-15 text-gray-700 block margin-x-auto" />
            <p>No service records found in this category.</p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const v = vehicles.find(veh => veh.id === log.vehicleId);
            const isClosed = log.status === 'Completed';

            return (
              <div key={log.id} className={`maintenance-item card flex justify-between align-center status-border-${isClosed ? 'completed' : 'in-shop'}`}>
                <div className="service-details">
                  <div className="flex align-center gap-10 margin-b-10">
                    <span className={`badge badge-${isClosed ? 'available' : 'in-shop'}`}>
                      {isClosed ? 'Completed' : 'In Service'}
                    </span>
                    <span className="text-xxs text-gray-500 font-bold uppercase">ID: <code>{log.id}</code></span>
                  </div>

                  <h3 className="text-white text-md font-bold">{log.type}</h3>
                  <p className="text-xs text-gray-400 margin-b-10">{log.description}</p>

                  <div className="flex gap-20 text-xs text-gray-500">
                    <div className="flex align-center gap-5">
                      <span>Vehicle:</span>
                      <strong className="text-white">{v ? `${v.name} (${v.registrationNumber})` : 'Deleted Vehicle'}</strong>
                    </div>
                    <div className="flex align-center gap-5">
                      <span>Provider:</span>
                      <strong className="text-white">{log.provider}</strong>
                    </div>
                  </div>
                </div>

                <div className="service-metrics flex gap-20 align-center text-xs text-gray-300">
                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-2 text-gray-500 text-xxs font-bold uppercase"><Calendar size={12} /> Start Date</span>
                    <span className="font-semibold text-white">{log.startDate}</span>
                  </div>

                  {isClosed && (
                    <div className="flex flex-col align-center">
                      <span className="flex align-center gap-2 text-gray-500 text-xxs font-bold uppercase"><Calendar size={12} /> End Date</span>
                      <span className="font-semibold text-white">{log.endDate}</span>
                    </div>
                  )}

                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-2 text-gray-500 text-xxs font-bold uppercase"><DollarSign size={12} /> Service Cost</span>
                    <span className={`font-semibold text-md ${isClosed ? 'text-warning' : 'text-gray-500'}`}>
                      {isClosed ? `$${log.cost.toLocaleString()}` : 'Pending Close'}
                    </span>
                  </div>
                </div>

                {isFleetManager && !isClosed && (
                  <div className="service-actions">
                    <button 
                      className="btn btn-success flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                      onClick={() => {
                        setClosingLogId(log.id);
                        setActualCost(150);
                      }}
                    >
                      <CheckCircle2 size={14} /> Close Order
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
