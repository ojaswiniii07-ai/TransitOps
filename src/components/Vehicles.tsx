import React, { useState } from 'react';
import { useApp, type Vehicle } from '../context/AppContext';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const Vehicles: React.FC = () => {
  const { 
    vehicles, 
    documents, 
    addVehicle, 
    updateVehicle, 
    deleteVehicle, 
    addDocument,
    activeRole
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'documents'>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Vehicle Form States
  const [name, setName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('Van');
  const [capacity, setCapacity] = useState(1000);
  const [odometer, setOdometer] = useState(0);
  const [cost, setCost] = useState(30000);
  const [region, setRegion] = useState('Central');
  
  // Document Form States
  const [showDocForm, setShowDocForm] = useState<string | null>(null); // vehicleId
  const [docType, setDocType] = useState<'Registration' | 'Insurance' | 'Pollution' | 'Fitness'>('Registration');
  const [docNumber, setDocNumber] = useState('');
  const [docExpiry, setDocExpiry] = useState('');

  // Editing logic
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');

  const handleOpenEdit = (v: Vehicle) => {
    setEditId(v.id);
    setName(v.name);
    setRegNum(v.registrationNumber);
    setModel(v.model);
    setType(v.type);
    setCapacity(v.maxCapacity);
    setOdometer(v.odometer);
    setCost(v.acquisitionCost);
    setRegion(v.region);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setIsEditing(false);
    setSelectedVehicle(null);
    // Reset forms
    setName('');
    setRegNum('');
    setModel('');
    setType('Van');
    setCapacity(1000);
    setOdometer(0);
    setCost(30000);
    setRegion('Central');
  };

  const handleSubmitVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !regNum || !model) {
      alert('Please fill out all fields.');
      return;
    }

    // Reg Unique check (except when editing the same vehicle)
    const isRegTaken = vehicles.some(v => 
      !v.isDeleted && 
      v.registrationNumber.toLowerCase() === regNum.toLowerCase() && 
      (!isEditing || v.id !== editId)
    );

    if (isRegTaken) {
      alert('Registration Number must be unique.');
      return;
    }

    if (isEditing) {
      updateVehicle(editId, {
        name,
        registrationNumber: regNum,
        model,
        type,
        maxCapacity: Number(capacity),
        odometer: Number(odometer),
        acquisitionCost: Number(cost),
        region
      });
    } else {
      addVehicle({
        name,
        registrationNumber: regNum,
        model,
        type,
        maxCapacity: Number(capacity),
        odometer: Number(odometer),
        acquisitionCost: Number(cost),
        region
      });
    }

    handleCloseForm();
  };

  const handleSubmitDoc = (e: React.FormEvent, vehicleId: string) => {
    e.preventDefault();
    if (!docNumber || !docExpiry) {
      alert('Please enter document number and expiry date.');
      return;
    }

    addDocument({
      vehicleId,
      type: docType,
      documentNumber: docNumber,
      expiryDate: docExpiry
    });

    // Reset doc form states
    setShowDocForm(null);
    setDocNumber('');
    setDocExpiry('');
  };

  const getDocStatusBadge = (status: 'Valid' | 'Expiring Soon' | 'Expired') => {
    switch (status) {
      case 'Valid': 
        return <span className="badge badge-available flex align-center gap-5"><CheckCircle size={12} /> Valid</span>;
      case 'Expiring Soon': 
        return <span className="badge badge-in-shop flex align-center gap-5"><AlertCircle size={12} /> Expiring Soon</span>;
      case 'Expired': 
        return <span className="badge badge-retired flex align-center gap-5"><AlertTriangle size={12} /> Expired</span>;
    }
  };

  const isFleetManager = activeRole === 'Fleet Manager';

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

      {/* Sub Tabs */}
      <div className="tab-menu">
        <button 
          className={`tab-btn ${activeSubTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('list')}
        >
          Fleet Asset List
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('documents')}
        >
          Document Compliance Alerts
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in">
            <h2>{isEditing ? 'Edit Vehicle Info' : 'Register New Vehicle'}</h2>
            <form onSubmit={handleSubmitVehicle} className="form-grid">
              <div className="form-group">
                <label>Vehicle/Fleet Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Van-05"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Registration Number (Unique)</label>
                <input 
                  type="text" 
                  value={regNum} 
                  onChange={(e) => setRegNum(e.target.value)} 
                  placeholder="e.g. TX-9082"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Model Name</label>
                <input 
                  type="text" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)} 
                  placeholder="e.g. Ford Transit"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
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
                  value={capacity} 
                  onChange={(e) => setCapacity(Number(e.target.value))} 
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
                  value={cost} 
                  onChange={(e) => setCost(Number(e.target.value))} 
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
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Register Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List Sub Tab */}
      {activeSubTab === 'list' && (
        <div className="vehicles-grid">
          {vehicles.filter(v => !v.isDeleted).map(v => {
            const vDocs = documents.filter(d => d.vehicleId === v.id);
            const expiredDocsCount = vDocs.filter(d => d.status === 'Expired').length;
            const warningDocsCount = vDocs.filter(d => d.status === 'Expiring Soon').length;

            return (
              <div key={v.id} className="vehicle-card card">
                <div className="card-top flex justify-between align-start">
                  <div>
                    <span className="text-xxs text-gray-500 font-bold uppercase">{v.type} • {v.region}</span>
                    <h3>{v.name}</h3>
                    <code className="text-xs text-primary font-semibold">{v.registrationNumber}</code>
                  </div>
                  <span className={`badge badge-${v.status.toLowerCase().replace(' ', '-')}`}>
                    {v.status}
                  </span>
                </div>

                <div className="card-details margin-y-15 text-xs text-gray-300">
                  <div className="flex justify-between margin-b-5">
                    <span>Model:</span> 
                    <span className="font-semibold text-white">{v.model}</span>
                  </div>
                  <div className="flex justify-between margin-b-5">
                    <span>Max Load:</span> 
                    <span className="font-semibold text-white">{v.maxCapacity.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between margin-b-5">
                    <span>Odometer:</span> 
                    <span className="font-semibold text-white">{v.odometer.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acquisition:</span> 
                    <span className="font-semibold text-white">${v.acquisitionCost.toLocaleString()}</span>
                  </div>
                </div>

                {/* Compliance Banner Inside Card */}
                {(expiredDocsCount > 0 || warningDocsCount > 0) && (
                  <div className={`card-alert text-xxs flex align-center gap-5 margin-b-15 ${expiredDocsCount > 0 ? 'bg-red-trans' : 'bg-orange-trans'}`}>
                    <AlertTriangle size={14} className={expiredDocsCount > 0 ? 'text-danger' : 'text-warning'} />
                    <span>
                      {expiredDocsCount > 0 ? `${expiredDocsCount} expired docs` : ''}
                      {expiredDocsCount > 0 && warningDocsCount > 0 ? ' & ' : ''}
                      {warningDocsCount > 0 ? `${warningDocsCount} warning docs` : ''}
                    </span>
                  </div>
                )}

                {/* Document Manager Expand Trigger */}
                <div className="card-actions flex gap-10">
                  <button 
                    className="btn btn-secondary flex-grow text-xs flex align-center justify-center gap-5"
                    onClick={() => setSelectedVehicle(selectedVehicle?.id === v.id ? null : v)}
                  >
                    <FileText size={14} /> Documents ({vDocs.length})
                  </button>
                  
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
                        onClick={() => {
                          if (confirm(`Are you sure you want to retire and remove ${v.name}?`)) {
                            deleteVehicle(v.id);
                          }
                        }}
                        title="Retire/Delete vehicle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* Inline Document Manager Panel */}
                {selectedVehicle?.id === v.id && (
                  <div className="inline-doc-panel margin-t-15 border-t padding-t-15 animate-fade-in">
                    <div className="flex justify-between align-center margin-b-10">
                      <h4 className="text-sm font-semibold">Asset Documents</h4>
                      {isFleetManager && (
                        <button 
                          className="btn-link text-xs flex align-center gap-5"
                          onClick={() => setShowDocForm(showDocForm === v.id ? null : v.id)}
                        >
                          <Plus size={12} /> Add Document
                        </button>
                      )}
                    </div>

                    {showDocForm === v.id && (
                      <form onSubmit={(e) => handleSubmitDoc(e, v.id)} className="doc-inline-form margin-b-15">
                        <select 
                          className="text-xs" 
                          value={docType} 
                          onChange={(e) => setDocType(e.target.value as any)}
                        >
                          <option value="Registration">Registration</option>
                          <option value="Insurance">Insurance</option>
                          <option value="Pollution">Pollution Certificate</option>
                          <option value="Fitness">Fitness Certificate</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Doc Reg ID" 
                          value={docNumber} 
                          onChange={(e) => setDocNumber(e.target.value)} 
                          className="text-xs" 
                          required 
                        />
                        <input 
                          type="date" 
                          value={docExpiry} 
                          onChange={(e) => setDocExpiry(e.target.value)} 
                          className="text-xs" 
                          required 
                        />
                        <div className="flex gap-5">
                          <button type="submit" className="btn btn-primary text-xs padding-x-10 padding-y-5">Save</button>
                          <button type="button" className="btn btn-secondary text-xs padding-x-10 padding-y-5" onClick={() => setShowDocForm(null)}>Cancel</button>
                        </div>
                      </form>
                    )}

                    <div className="doc-list flex flex-col gap-5">
                      {vDocs.length === 0 ? (
                        <p className="text-xxs text-gray-500 italic">No document entries found. Please log them.</p>
                      ) : (
                        vDocs.map(d => (
                          <div key={d.id} className="doc-item card flex justify-between align-center padding-5">
                            <div className="doc-meta text-xxs">
                              <span className="font-semibold block text-white">{d.type}</span>
                              <code className="text-gray-400">{d.documentNumber}</code>
                            </div>
                            <div className="doc-compliance flex flex-col align-end gap-2 text-xxs">
                              {getDocStatusBadge(d.status)}
                              <span className="text-gray-500 font-bold flex align-center gap-2">
                                <Calendar size={10} /> Exp: {d.expiryDate}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance Alerts Sub Tab */}
      {activeSubTab === 'documents' && (
        <div className="card">
          <h3>Asset Compliance Matrix</h3>
          <p className="text-gray-400 text-xs margin-b-15">Overview of expired or expiring licenses/registrations for all vehicles</p>
          <table className="overview-table">
            <thead>
              <tr>
                <th>Vehicle Asset</th>
                <th>Registration</th>
                <th>Document Type</th>
                <th>Doc ID</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.filter(d => {
                const v = vehicles.find(veh => veh.id === d.vehicleId);
                return v && !v.isDeleted && (d.status === 'Expired' || d.status === 'Expiring Soon');
              }).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 padding-y-20">All asset documents are currently compliant.</td>
                </tr>
              ) : (
                documents
                  .filter(d => {
                    const v = vehicles.find(veh => veh.id === d.vehicleId);
                    return v && !v.isDeleted && (d.status === 'Expired' || d.status === 'Expiring Soon');
                  })
                  .map(d => {
                    const v = vehicles.find(veh => veh.id === d.vehicleId)!;
                    return (
                      <tr key={d.id}>
                        <td className="font-semibold">{v.name}</td>
                        <td><code>{v.registrationNumber}</code></td>
                        <td>{d.type}</td>
                        <td><code>{d.documentNumber}</code></td>
                        <td>{d.expiryDate}</td>
                        <td>{getDocStatusBadge(d.status)}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
