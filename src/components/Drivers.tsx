import React, { useState } from 'react';
import { useApp, type Driver } from '../context/AppContext';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Contact,
  ShieldCheck,
  Shield
} from 'lucide-react';

export const Drivers: React.FC = () => {
  const { 
    drivers, 
    addDriver, 
    updateDriver, 
    deleteDriver, 
    activeRole,
    checkLicenseValidity
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState('');

  // Driver Form States
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('Class A CDL');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Score modal state
  const [showScoreModal, setShowScoreModal] = useState<string | null>(null); // driverId
  const [newScore, setNewScore] = useState<number>(90);

  const handleOpenEdit = (d: Driver) => {
    setEditId(d.id);
    setName(d.name);
    setLicenseNumber(d.licenseNumber);
    setLicenseCategory(d.licenseCategory);
    setLicenseExpiryDate(d.licenseExpiryDate);
    setContactNumber(d.contactNumber);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setIsEditing(false);
    // Reset forms
    setName('');
    setLicenseNumber('');
    setLicenseCategory('Class A CDL');
    setLicenseExpiryDate('');
    setContactNumber('');
  };

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !licenseNumber || !licenseExpiryDate || !contactNumber) {
      alert('Please fill out all fields.');
      return;
    }

    if (isEditing) {
      updateDriver(editId, {
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiryDate,
        contactNumber
      });
    } else {
      addDriver({
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiryDate,
        contactNumber
      });
    }

    handleCloseForm();
  };

  const handleUpdateScore = (driverId: string) => {
    if (newScore < 0 || newScore > 100) {
      alert('Safety score must be between 0 and 100.');
      return;
    }
    
    // Automatically suspend if score falls below 50, alert user
    const shouldSuspend = newScore < 50;
    
    updateDriver(driverId, { 
      safetyScore: newScore,
      status: shouldSuspend ? 'Suspended' : undefined
    });
    
    setShowScoreModal(null);
  };

  const isSafetyOfficer = activeRole === 'Safety Officer' || activeRole === 'Fleet Manager';
  const isFleetManager = activeRole === 'Fleet Manager';

  return (
    <div className="drivers-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Driver Management</h1>
          <p className="text-gray-400">Monitor driver credentials, compliance schedules, and safety ratings</p>
        </div>

        {isFleetManager && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} /> Register Driver
          </button>
        )}
      </div>

      {/* Driver Registration Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in">
            <h2>{isEditing ? 'Modify Driver Record' : 'Register Operator'}</h2>
            <form onSubmit={handleSubmitDriver} className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Alex Miller"
                  required 
                />
              </div>

              <div className="form-group">
                <label>License Number</label>
                <input 
                  type="text" 
                  value={licenseNumber} 
                  onChange={(e) => setLicenseNumber(e.target.value)} 
                  placeholder="e.g. LC-88390"
                  required 
                />
              </div>

              <div className="form-group">
                <label>License Category</label>
                <select value={licenseCategory} onChange={(e) => setLicenseCategory(e.target.value)}>
                  <option value="Class A CDL">Class A CDL (Heavy Multi-axle)</option>
                  <option value="Class B CDL">Class B CDL (Single-chassis Cargo)</option>
                  <option value="Class C CDL">Class C CDL (Specialized Transport)</option>
                  <option value="Class C Standard">Class C Standard (Light Vans/Cars)</option>
                </select>
              </div>

              <div className="form-group">
                <label>License Expiry Date</label>
                <input 
                  type="date" 
                  value={licenseExpiryDate} 
                  onChange={(e) => setLicenseExpiryDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group span-2">
                <label>Contact Number</label>
                <input 
                  type="text" 
                  value={contactNumber} 
                  onChange={(e) => setContactNumber(e.target.value)} 
                  placeholder="e.g. +1-555-0192"
                  required 
                />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Register Operator'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Rating Modal */}
      {showScoreModal && (
        <div className="modal-overlay">
          <div className="modal-content card animate-zoom-in" style={{ maxWidth: '400px' }}>
            <h2>Update Safety Rating</h2>
            <p className="text-gray-400 text-xs margin-b-15">Adjust driver's safety metric based on incident audits.</p>
            <div className="form-group margin-b-20">
              <label>Safety Score (0 - 100)</label>
              <input 
                type="number" 
                value={newScore} 
                onChange={(e) => setNewScore(Number(e.target.value))} 
                min="0" 
                max="100" 
                className="input-large"
              />
              <span className="text-xxs text-gray-500 italic margin-t-5 block">
                🚨 Note: Scores below 50 will trigger an automatic driver suspension block.
              </span>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowScoreModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleUpdateScore(showScoreModal)}>Save Rating</button>
            </div>
          </div>
        </div>
      )}

      {/* Drivers List Card */}
      <div className="card">
        <h3>Operator Audit List</h3>
        <p className="text-gray-400 text-xs margin-b-15">Operational statuses and certification checks for all operators</p>
        
        <table className="overview-table">
          <thead>
            <tr>
              <th>Operator Name</th>
              <th>Contact</th>
              <th>License Category</th>
              <th>License Expiry</th>
              <th>Safety Score</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.filter(d => !d.isDeleted).map(d => {
              const validity = checkLicenseValidity(d.licenseExpiryDate);
              const scoreColor = d.safetyScore >= 85 ? 'text-success' : d.safetyScore >= 70 ? 'text-warning' : 'text-danger';
              
              return (
                <tr key={d.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{d.name}</span>
                      <span className="text-xxs text-gray-500">ID: <code>{d.id}</code></span>
                    </div>
                  </td>
                  <td>
                    <span className="flex align-center gap-5 text-gray-300">
                      <Contact size={14} className="text-gray-500" />
                      {d.contactNumber}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-white text-xs">{d.licenseCategory}</span>
                      <code className="text-xxs text-gray-500">{d.licenseNumber}</code>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-white">{d.licenseExpiryDate}</span>
                      {validity === 'Expired' && (
                        <span className="badge badge-retired flex align-center gap-2 text-xxs padding-x-5 padding-y-2">
                          <AlertTriangle size={10} /> Expired
                        </span>
                      )}
                      {validity === 'Expiring Soon' && (
                        <span className="badge badge-in-shop flex align-center gap-2 text-xxs padding-x-5 padding-y-2">
                          <AlertCircle size={10} /> Expiring Soon
                        </span>
                      )}
                      {validity === 'Valid' && (
                        <span className="badge badge-available flex align-center gap-2 text-xxs padding-x-5 padding-y-2">
                          <CheckCircle2 size={10} /> Valid
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex align-center gap-5 font-bold">
                      <Shield size={14} className={scoreColor} />
                      <span className={`${scoreColor} text-sm`}>{d.safetyScore}%</span>
                      {d.safetyScore < 70 && (
                        <span title="Safety warning: Below threshold!">
                          <ShieldAlert size={14} className="text-danger" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${d.status.toLowerCase().replace(' ', '-')}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-10">
                      {isSafetyOfficer && (
                        <>
                          <button 
                            className="btn btn-secondary text-xxs padding-x-10 padding-y-5"
                            onClick={() => {
                              setNewScore(d.safetyScore);
                              setShowScoreModal(d.id);
                            }}
                            title="Audit Safety Score"
                          >
                            Audit Score
                          </button>
                          
                          {d.status === 'Suspended' ? (
                            <button 
                              className="btn btn-success text-xxs padding-x-10 padding-y-5 flex align-center gap-2"
                              onClick={() => {
                                if (d.safetyScore < 50) {
                                  alert('Cannot activate. Safety score is below threshold (50). Please audit score first.');
                                  return;
                                }
                                updateDriver(d.id, { status: 'Available' });
                              }}
                            >
                              <ShieldCheck size={12} /> Activate
                            </button>
                          ) : (
                            <button 
                              className="btn btn-danger text-xxs padding-x-10 padding-y-5 flex align-center gap-2"
                              onClick={() => {
                                if (confirm(`Are you sure you want to suspend ${d.name}?`)) {
                                  updateDriver(d.id, { status: 'Suspended' });
                                }
                              }}
                              disabled={d.status === 'On Trip'}
                              title={d.status === 'On Trip' ? 'Cannot suspend driver while on active trip' : ''}
                            >
                              <ShieldAlert size={12} /> Suspend
                            </button>
                          )}
                        </>
                      )}

                      {isFleetManager && (
                        <>
                          <button 
                            className="btn btn-icon text-gray-400 hover:text-white"
                            onClick={() => handleOpenEdit(d)}
                            title="Edit operator specs"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            className="btn btn-icon text-gray-400 hover:text-red-500"
                            onClick={() => {
                              if (confirm(`Remove operator ${d.name} from records?`)) {
                                deleteDriver(d.id);
                              }
                            }}
                            disabled={d.status === 'On Trip'}
                            title={d.status === 'On Trip' ? 'Cannot delete driver while on active trip' : ''}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
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
