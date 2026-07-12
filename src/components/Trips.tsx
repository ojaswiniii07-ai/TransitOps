import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Play, 
  CheckSquare, 
  Navigation, 
  MapPin, 
  Milestone,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';

export const Trips: React.FC = () => {
  const { 
    trips, 
    vehicles, 
    drivers, 
    createTrip, 
    updateTripStatus,
    activeRole,
    checkLicenseValidity,
    isLoading
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'Scheduled' | 'Dispatched' | 'Completed' | 'Cancelled' | 'Delayed'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Trip completion modal
  const [completionTripId, setCompletionTripId] = useState<number | null>(null);
  const [odometerReading, setOdometerReading] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Create Trip states
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [distance, setDistance] = useState(0);

  const handleOpenCompleteModal = (tripId: number) => {
    const trip = trips.find(t => t.id === tripId);
    const v = trip ? vehicles.find(veh => veh.id === trip.vehicle_id) : null;
    setCompletionTripId(tripId);
    setOdometerReading(v ? v.odometer + (trip?.distance || 0) : 0);
    setValidationError(null);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setOrigin('');
    setDestination('');
    setVehicleId('');
    setDriverId('');
    setDistance(0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !vehicleId || !driverId || distance <= 0) {
      alert('Please fill out all fields correctly.');
      return;
    }

    setSubmitting(true);
    try {
      await createTrip({
        vehicle_id: Number(vehicleId),
        driver_id: Number(driverId),
        route: `${origin} to ${destination}`,
        origin,
        destination,
        distance: Number(distance),
      });
      handleCloseForm();
      setActiveTab('Scheduled');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (id: number) => {
    try {
      await updateTripStatus(id, { status: 'Dispatched' });
    } catch (err) {
      alert(`Dispatch Failed:\n\n${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionTripId) return;

    setSubmitting(true);
    try {
      await updateTripStatus(completionTripId, {
        status: 'Completed',
        odometer_reading: Number(odometerReading),
      });
      setCompletionTripId(null);
      setActiveTab('Completed');
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to complete trip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await updateTripStatus(id, { status: 'Cancelled', reason: 'Cancelled by dispatcher' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel trip');
    }
  };

  const filteredTrips = trips.filter(t => {
    if (activeTab === 'all') return true;
    return t.status === activeTab;
  });

  const isDispatcher = activeRole === 'Dispatcher' || activeRole === 'Fleet Manager';

  // Find valid vehicles and drivers for dropdowns
  const availableVehicles = vehicles.filter(v => v.status === 'Healthy' || v.status === 'Available');
  const availableDrivers = drivers.filter(d => {
    const isLicenseValid = checkLicenseValidity(d.license_expiry) !== 'Expired';
    return d.status === 'Active' && isLicenseValid;
  });

  if (isLoading && trips.length === 0) {
    return (
      <div className="trips-view animate-fade-in flex align-center justify-center" style={{ minHeight: '400px' }}>
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

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
        <button className={`tab-btn ${activeTab === 'Scheduled' ? 'active' : ''}`} onClick={() => setActiveTab('Scheduled')}>Scheduled</button>
        <button className={`tab-btn ${activeTab === 'Dispatched' ? 'active' : ''}`} onClick={() => setActiveTab('Dispatched')}>Dispatched</button>
        <button className={`tab-btn ${activeTab === 'Completed' ? 'active' : ''}`} onClick={() => setActiveTab('Completed')}>Completed</button>
        <button className={`tab-btn ${activeTab === 'Cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('Cancelled')}>Cancelled</button>
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
                  value={origin} 
                  onChange={(e) => setOrigin(e.target.value)} 
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
                      {v.make} {v.model} ({v.license_plate} - Cap: {v.max_capacity}kg)
                    </option>
                  ))}
                  {availableVehicles.length === 0 && (
                    <option disabled>No Available Vehicles</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Assign Certified Operator</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                  <option value="">-- Choose Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Safety: {d.safety_score}%)
                    </option>
                  ))}
                  {availableDrivers.length === 0 && (
                    <option disabled>No Available Operators</option>
                  )}
                </select>
              </div>

              <div className="form-group span-2">
                <label>Estimated Distance (km)</label>
                <input 
                  type="number" 
                  value={distance} 
                  onChange={(e) => setDistance(Number(e.target.value))} 
                  min="1"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Trip'}
                </button>
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
            <p className="text-gray-400 text-xs margin-b-15">Log final odometer reading to release resources.</p>
            
            {validationError && (
              <div className="card-alert bg-red-trans text-danger text-xxs flex align-center gap-5 margin-b-15">
                <AlertTriangle size={14} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="form-grid">
              <div className="form-group span-2">
                <label>Final Odometer Reading (km)</label>
                <input 
                  type="number" 
                  value={odometerReading} 
                  onChange={(e) => setOdometerReading(Number(e.target.value))} 
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setCompletionTripId(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Completing...' : 'Complete & Lock Trip'}
                </button>
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
            const v = vehicles.find(veh => veh.id === t.vehicle_id);
            const d = drivers.find(dr => dr.id === t.driver_id);

            return (
              <div key={t.id} className={`trip-item card flex justify-between align-center status-border-${t.status.toLowerCase()}`}>
                <div className="trip-summary">
                  <div className="flex align-center gap-10 margin-b-10">
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                    <span className="text-xxs text-gray-500 font-bold uppercase">
                      ID: {t.id} • {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  
                  <div className="route-flow flex align-center gap-10 margin-b-10">
                    <div className="flex align-center gap-5 text-white font-semibold">
                      <MapPin size={16} className="text-primary" />
                      <span>{t.origin || t.route?.split(' to ')[0] || 'N/A'}</span>
                    </div>
                    <span className="text-gray-500">➜</span>
                    <div className="flex align-center gap-5 text-white font-semibold">
                      <MapPin size={16} className="text-warning" />
                      <span>{t.destination || t.route?.split(' to ')[1] || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="trip-allocations flex gap-20 text-xs text-gray-400">
                    <div className="flex align-center gap-5">
                      <span>Vehicle:</span>
                      <strong className="text-white">{v ? `${v.make} ${v.model} (${v.license_plate})` : 'Unknown'}</strong>
                    </div>
                    <div className="flex align-center gap-5">
                      <span>Operator:</span>
                      <strong className="text-white">{d ? d.name : 'Unknown'}</strong>
                    </div>
                  </div>
                </div>

                <div className="trip-specs flex gap-25 text-xs text-gray-300">
                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-5 text-gray-500 text-xxs font-bold uppercase"><Milestone size={12} /> Distance</span>
                    <span className="font-semibold text-white">{t.distance} km</span>
                  </div>
                </div>

                {isDispatcher && (
                  <div className="trip-actions flex gap-10">
                    {t.status === 'Scheduled' && (
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
                            if (confirm('Cancel this trip?')) handleCancel(t.id);
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
                          onClick={() => handleOpenCompleteModal(t.id)}
                        >
                          <CheckSquare size={12} /> Complete
                        </button>
                        <button 
                          className="btn btn-danger flex align-center gap-5 text-xs padding-x-10 padding-y-5"
                          onClick={() => {
                            if (confirm('Abort and cancel this active dispatch?')) handleCancel(t.id);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {t.status === 'Completed' && (
                      <div className="text-xxs text-gray-500 italic flex align-center gap-5">
                        <Info size={12} /> Completed
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
