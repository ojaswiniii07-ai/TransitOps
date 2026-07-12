import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { VehicleAPI } from '../api';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

export const Vehicles: React.FC = () => {
  const { 
    vehicles, 
    addVehicle, 
    updateVehicle, 
    deleteVehicle, 
    activeRole,
    isLoading
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vehicle Form States
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState('Van');
  const [maxCapacity, setMaxCapacity] = useState(1000);
  const [odometer, setOdometer] = useState(0);
  const [acquisitionCost, setAcquisitionCost] = useState(30000);
  const [region, setRegion] = useState('Central');

  // Editing logic
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number>(0);

  const handleOpenEdit = (v: VehicleAPI) => {
    setEditId(v.id);
    setLicensePlate(v.license_plate);
    setMake(v.make);
    setModel(v.model);
    setVehicleType(v.vehicle_type);
    setMaxCapacity(v.max_capacity);
    setOdometer(v.odometer);
    setAcquisitionCost(v.acquisition_cost);
    setRegion(v.region || 'Central');
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setIsEditing(false);
    setLicensePlate('');
    setMake('');
    setModel('');
    setVehicleType('Van');
    setMaxCapacity(1000);
    setOdometer(0);
    setAcquisitionCost(30000);
    setRegion('Central');
  };

  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate || !make || !model) {
      alert('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateVehicle(editId, {
          license_plate: licensePlate,
          make,
          model,
          vehicle_type: vehicleType,
          max_capacity: Number(maxCapacity),
          odometer: Number(odometer),
          acquisition_cost: Number(acquisitionCost),
          region,
        });
      } else {
        await addVehicle({
          license_plate: licensePlate,
          make,
          model,
          vehicle_type: vehicleType,
          max_capacity: Number(maxCapacity),
          odometer: Number(odometer),
          acquisition_cost: Number(acquisitionCost),
          region,
        });
      }
      handleCloseForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isFleetManager = activeRole === 'Fleet Manager';

  if (isLoading && vehicles.length === 0) {
    return (
      <div className="vehicles-view animate-fade-in flex align-center justify-center" style={{ minHeight: '400px' }}>
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="vehicles-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Vehicle Registry</h1>
          <p className="text-gray-400">Manage fleet vehicles, specifications, and document compliance</p>
        </div>

        {isFleetManager && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Add Vehicle
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in">
            <h2>{isEditing ? 'Edit Vehicle Info' : 'Register New Vehicle'}</h2>
            <form onSubmit={handleSubmitVehicle} className="form-grid">
              <div className="form-group">
                <label>License Plate (Unique)</label>
                <input 
                  type="text" 
                  value={licensePlate} 
                  onChange={(e) => setLicensePlate(e.target.value)} 
                  placeholder="e.g. TX-9082"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Make</label>
                <input 
                  type="text" 
                  value={make} 
                  onChange={(e) => setMake(e.target.value)} 
                  placeholder="e.g. Ford"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Model Name</label>
                <input 
                  type="text" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)} 
                  placeholder="e.g. Transit Van"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Sedan">Sedan/SUV</option>
                </select>
              </div>

              <div className="form-group">
                <label>Max Load Capacity (kg)</label>
                <input 
                  type="number" 
                  value={maxCapacity} 
                  onChange={(e) => setMaxCapacity(Number(e.target.value))} 
                  min="0"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Odometer (km)</label>
                <input 
                  type="number" 
                  value={odometer} 
                  onChange={(e) => setOdometer(Number(e.target.value))} 
                  min="0"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Acquisition Cost ($)</label>
                <input 
                  type="number" 
                  value={acquisitionCost} 
                  onChange={(e) => setAcquisitionCost(Number(e.target.value))} 
                  min="0"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Region Depot</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="North">North Depot</option>
                  <option value="South">South Depot</option>
                  <option value="East">East Depot</option>
                  <option value="West">West Depot</option>
                  <option value="Central">Central Headquarter</option>
                </select>
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="vehicles-grid">
        {vehicles.filter(v => v.status !== 'Retired').map(v => (
          <div key={v.id} className="vehicle-card card">
            <div className="card-top flex justify-between align-start">
              <div>
                <span className="text-xxs text-gray-500 font-bold uppercase">{v.vehicle_type} • {v.region || 'N/A'}</span>
                <h3>{v.make} {v.model}</h3>
                <code className="text-xs text-primary font-semibold">{v.license_plate}</code>
              </div>
              <span className={`badge badge-${v.status.toLowerCase().replace(' ', '-')}`}>
                {v.status}
              </span>
            </div>

            <div className="card-details margin-y-15 text-xs text-gray-300">
              <div className="flex justify-between margin-b-5">
                <span>Max Load:</span> 
                <span className="font-semibold text-white">{v.max_capacity.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between margin-b-5">
                <span>Odometer:</span> 
                <span className="font-semibold text-white">{v.odometer.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between">
                <span>Acquisition:</span> 
                <span className="font-semibold text-white">${v.acquisition_cost.toLocaleString()}</span>
              </div>
            </div>

            {/* Insurance / Fitness warnings */}
            {(v.insurance_expiry || v.fitness_expiry) && (() => {
              const today = new Date();
              const insExp = v.insurance_expiry ? new Date(v.insurance_expiry) : null;
              const fitExp = v.fitness_expiry ? new Date(v.fitness_expiry) : null;
              const insExpired = insExp && insExp < today;
              const fitExpired = fitExp && fitExp < today;
              const insWarning = insExp && !insExpired && (insExp.getTime() - today.getTime()) / 86400000 < 30;
              const fitWarning = fitExp && !fitExpired && (fitExp.getTime() - today.getTime()) / 86400000 < 30;
              
              if (insExpired || fitExpired || insWarning || fitWarning) {
                return (
                  <div className={`card-alert text-xxs flex align-center gap-5 margin-b-15 ${(insExpired || fitExpired) ? 'bg-red-trans' : 'bg-orange-trans'}`}>
                    <AlertTriangle size={14} className={(insExpired || fitExpired) ? 'text-danger' : 'text-warning'} />
                    <span>
                      {insExpired ? 'Insurance expired' : insWarning ? 'Insurance expiring soon' : ''}
                      {(insExpired || insWarning) && (fitExpired || fitWarning) ? ' & ' : ''}
                      {fitExpired ? 'Fitness expired' : fitWarning ? 'Fitness expiring soon' : ''}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Card Actions */}
            <div className="card-actions flex gap-10">
              {isFleetManager && (
                <>
                  <button 
                    className="btn btn-icon text-gray-400 hover:text-white"
                    onClick={() => handleOpenEdit(v)}
                    title="Edit specifications"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="btn btn-icon text-gray-400 hover:text-red-500"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to retire ${v.make} ${v.model} (${v.license_plate})?`)) {
                        try {
                          await deleteVehicle(v.id);
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'Failed to retire vehicle');
                        }
                      }
                    }}
                    title="Retire/Delete vehicle"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
