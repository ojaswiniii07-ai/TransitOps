import React, { useState } from 'react';
import { useApp, type Trip } from '../context/AppContext';
import { 
  Plus, 
  Play, 
  CheckSquare, 
  Navigation, 
  MapPin, 
  Scale, 
  Milestone,
  AlertTriangle,
  Info
} from 'lucide-react';

export const Trips: React.FC = () => {
  const { 
    trips, 
    vehicles, 
    drivers, 
    createTrip, 
    dispatchTrip, 
    completeTrip, 
    cancelTrip,
    activeRole,
    checkLicenseValidity
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'dispatched' | 'completed' | 'cancelled'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Trip completion modal
  const [completionTripId, setCompletionTripId] = useState<string | null>(null);
  const [finalOdometer, setFinalOdometer] = useState<number>(0);
  const [fuelConsumed, setFuelConsumed] = useState<number>(0);
  const [fuelCost, setFuelCost] = useState<number>(0);
  const [actualDistance, setActualDistance] = useState<number>(0);
  const [actualRevenue, setActualRevenue] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Create Trip states
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState(0);
  const [plannedDistance, setPlannedDistance] = useState(0);

  const handleOpenCompleteModal = (t: Trip) => {
    const v = vehicles.find(veh => veh.id === t.vehicleId);
    setCompletionTripId(t.id);
    setFinalOdometer(v ? v.odometer + t.plannedDistance : t.plannedDistance);
    setFuelConsumed(Math.round(t.plannedDistance * 0.15)); // default estimate
    setFuelCost(Math.round(t.plannedDistance * 0.15 * 4)); // default estimate $4/L
    setActualDistance(t.plannedDistance);
    setActualRevenue(t.revenue);
    setValidationError(null);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSource('');
    setDestination('');
    setVehicleId('');
    setDriverId('');
    setCargoWeight(0);
    setPlannedDistance(0);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination || !vehicleId || !driverId || cargoWeight <= 0 || plannedDistance <= 0) {
      alert('Please fill out all fields correctly.');
      return;
    }

    createTrip({
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeight: Number(cargoWeight),
      plannedDistance: Number(plannedDistance)
    });

    handleCloseForm();
    setActiveTab('draft');
  };

  const handleDispatch = (id: string) => {
    const res = dispatchTrip(id);
    if (!res.success) {
      alert(`Dispatch Check Failed:\n\n${res.error}`);
    }
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionTripId) return;

    const res = completeTrip(completionTripId, {
      finalOdometer: Number(finalOdometer),
      fuelConsumed: Number(fuelConsumed),
      fuelCost: Number(fuelCost),
      actualDistance: Number(actualDistance),
      revenue: Number(actualRevenue)
    });

    if (!res.success) {
      setValidationError(res.error || 'Failed to complete trip.');
    } else {
      setCompletionTripId(null);
      setActiveTab('completed');
    }
  };

  const filteredTrips = trips.filter(t => {
    if (activeTab === 'all') return true;
    return t.status.toLowerCase() === activeTab;
  });

  const isDispatcher = activeRole === 'Dispatcher' || activeRole === 'Fleet Manager';

  // Find valid vehicles and drivers for dropdowns
  const availableVehicles = vehicles.filter(v => !v.isDeleted && v.status === 'Available');
  const availableDrivers = drivers.filter(d => {
    const isLicenseValid = checkLicenseValidity(d.licenseExpiryDate) === 'Valid';
    return !d.isDeleted && d.status === 'Available' && isLicenseValid;
  });

  return (
    <div className="trips-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Trip Dispatch Registry</h1>
          <p className="text-gray-400">Schedule cargo consignments, dispatch operators, and track completion</p>
        </div>

        {isDispatcher && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Create Trip Ticket
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="tab-menu">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Trips</button>
        <button className={`tab-btn ${activeTab === 'draft' ? 'active' : ''}`} onClick={() => setActiveTab('draft')}>Drafts</button>
        <button className={`tab-btn ${activeTab === 'dispatched' ? 'active' : ''}`} onClick={() => setActiveTab('dispatched')}>Dispatched</button>
        <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Completed</button>
        <button className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>Cancelled</button>
      </div>

      {/* Create Trip Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in">
            <h2>Plan New Consignment</h2>
            <form onSubmit={handleCreate} className="form-grid">
              <div className="form-group">
                <label>Source Address</label>
                <input 
                  type="text" 
                  value={source} 
                  onChange={(e) => setSource(e.target.value)} 
                  placeholder="e.g. Austin, TX"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Destination Address</label>
                <input 
                  type="text" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)} 
                  placeholder="e.g. Dallas, TX"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Assign Fleet Vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type} - Max Cap: {v.maxCapacity}kg)
                    </option>
                  ))}
                  {/* Fallback to show current list if empty */}
                  {availableVehicles.length === 0 && (
                    <option disabled>No Available Vehicles (Check Registry/Maintenance)</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Assign Certified Operator</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                  <option value="">-- Choose Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Safety Rating: {d.safetyScore}%)
                    </option>
                  ))}
                  {availableDrivers.length === 0 && (
                    <option disabled>No Available Operators (Check License Expiry/Duty Status)</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Cargo Weight (kg)</label>
                <input 
                  type="number" 
                  value={cargoWeight} 
                  onChange={(e) => setCargoWeight(Number(e.target.value))} 
                  min="1"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Estimated Distance (km)</label>
                <input 
                  type="number" 
                  value={plannedDistance} 
                  onChange={(e) => setPlannedDistance(Number(e.target.value))} 
                  min="1"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save as Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {completionTripId && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in" style={{ maxWidth: '500px' }}>
            <h2>Complete Dispatch Operations</h2>
            <p className="text-gray-400 text-xs margin-b-15">Log actual trip statistics to release resources and log fuel expenses.</p>
            
            {validationError && (
              <div className="card-alert bg-red-trans text-danger text-xxs flex align-center gap-5 margin-b-15">
                <AlertTriangle size={14} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="form-grid">
              <div className="form-group">
                <label>Final Odometer Reading (km)</label>
                <input 
                  type="number" 
                  value={finalOdometer} 
                  onChange={(e) => setFinalOdometer(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Actual Distance Travelled (km)</label>
                <input 
                  type="number" 
                  value={actualDistance} 
                  onChange={(e) => setActualDistance(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Fuel Consumed (Litres)</label>
                <input 
                  type="number" 
                  value={fuelConsumed} 
                  onChange={(e) => setFuelConsumed(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Fuel Expense ($)</label>
                <input 
                  type="number" 
                  value={fuelCost} 
                  onChange={(e) => setFuelCost(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-group span-2">
                <label>Final Trip Billing Revenue ($)</label>
                <input 
                  type="number" 
                  value={actualRevenue} 
                  onChange={(e) => setActualRevenue(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setCompletionTripId(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">Complete & Lock Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trips list layout */}
      <div className="trips-list flex flex-col gap-15">
        {filteredTrips.length === 0 ? (
          <div className="card text-center text-gray-500 padding-y-40">
            <Navigation size={48} className="margin-b-15 text-gray-700 block margin-x-auto" />
            <p>No trip records found in this category.</p>
          </div>
        ) : (
          filteredTrips.map(t => {
            const v = vehicles.find(veh => veh.id === t.vehicleId);
            const d = drivers.find(dr => dr.id === t.driverId);
            const isOverloaded = v && t.cargoWeight > v.maxCapacity;

            return (
              <div key={t.id} className={`trip-item card flex justify-between align-center status-border-${t.status.toLowerCase()}`}>
                <div className="trip-summary">
                  <div className="flex align-center gap-10 margin-b-10">
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                    <span className="text-xxs text-gray-500 font-bold uppercase">Region: {t.region} • Date: {t.date}</span>
                  </div>
                  
                  <div className="route-flow flex align-center gap-10 margin-b-10">
                    <div className="flex align-center gap-5 text-white font-semibold">
                      <MapPin size={16} className="text-primary" />
                      <span>{t.source}</span>
                    </div>
                    <span className="text-gray-500">➜</span>
                    <div className="flex align-center gap-5 text-white font-semibold">
                      <MapPin size={16} className="text-warning" />
                      <span>{t.destination}</span>
                    </div>
                  </div>

                  <div className="trip-allocations flex gap-20 text-xs text-gray-400">
                    <div className="flex align-center gap-5">
                      <span>Vehicle:</span>
                      <strong className="text-white">{v ? `${v.name} (${v.registrationNumber})` : 'Deleted Vehicle'}</strong>
                    </div>
                    <div className="flex align-center gap-5">
                      <span>Operator:</span>
                      <strong className="text-white">{d ? d.name : 'Deleted Operator'}</strong>
                    </div>
                  </div>
                </div>

                <div className="trip-specs flex gap-25 text-xs text-gray-300">
                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-5 text-gray-500 text-xxs font-bold uppercase"><Scale size={12} /> Load</span>
                    <span className={`font-semibold ${isOverloaded ? 'text-danger font-bold' : 'text-white'}`}>
                      {t.cargoWeight.toLocaleString()} kg
                    </span>
                    {v && <span className="text-xxs text-gray-500">Max: {v.maxCapacity}kg</span>}
                  </div>

                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-5 text-gray-500 text-xxs font-bold uppercase"><Milestone size={12} /> Distance</span>
                    <span className="font-semibold text-white">
                      {t.actualDistance ? t.actualDistance : t.plannedDistance} km
                    </span>
                    {t.actualDistance && <span className="text-xxs text-gray-500">Planned: {t.plannedDistance}km</span>}
                  </div>

                  <div className="flex flex-col align-center">
                    <span className="text-gray-500 text-xxs font-bold uppercase">Estimated Revenue</span>
                    <span className="font-semibold text-success">${t.revenue.toLocaleString()}</span>
                  </div>
                </div>

                {isDispatcher && (
                  <div className="trip-actions flex gap-10">
                    {t.status === 'Draft' && (
                      <>
                        <button 
                          className="btn btn-primary flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                          onClick={() => handleDispatch(t.id)}
                        >
                          <Play size={12} /> Dispatch
                        </button>
                        <button 
                          className="btn btn-danger flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                          onClick={() => {
                            if (confirm('Cancel this dispatch draft?')) {
                              cancelTrip(t.id);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {t.status === 'Dispatched' && (
                      <>
                        <button 
                          className="btn btn-success flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                          onClick={() => handleOpenCompleteModal(t)}
                        >
                          <CheckSquare size={12} /> Complete
                        </button>
                        <button 
                          className="btn btn-danger flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                          onClick={() => {
                            if (confirm('Abort and cancel this active dispatch? Vehicle & driver statuses will reset.')) {
                              cancelTrip(t.id);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {t.status === 'Completed' && (
                      <div className="text-xxs text-gray-500 italic flex align-center gap-5">
                        <Info size={12} /> Completed Odo: {t.completionOdometer} km
                      </div>
                    )}

                    {t.status === 'Cancelled' && (
                      <span className="text-xxs text-red-500 font-bold uppercase">Cancelled Ticket</span>
                    )}
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
