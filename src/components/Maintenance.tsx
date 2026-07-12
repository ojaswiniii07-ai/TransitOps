import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wrench, 
  CheckCircle2, 
  Calendar, 
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';

export const Maintenance: React.FC = () => {
  const { 
    maintenanceSchedules,
    vehicles, 
    recalculateMaintenance,
    activeRole,
    isLoading
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'Healthy' | 'Upcoming' | 'Overdue'>('all');
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateMaintenance();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const filteredSchedules = maintenanceSchedules.filter(s => {
    if (activeTab === 'all') return true;
    return s.current_status === activeTab;
  });

  const isFleetManager = activeRole === 'Fleet Manager';

  if (isLoading && maintenanceSchedules.length === 0) {
    return (
      <div className="maintenance-view animate-fade-in flex align-center justify-center" style={{ minHeight: '400px' }}>
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="maintenance-view animate-fade-in">
      <div className="view-header flex justify-between align-center">
        <div>
          <h1>Predictive Maintenance</h1>
          <p className="text-gray-400">Track vehicle maintenance schedules and service predictions</p>
        </div>

        {isFleetManager && (
          <button 
            className="btn btn-primary flex align-center gap-5" 
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalculate All'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-menu">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Schedules</button>
        <button className={`tab-btn ${activeTab === 'Healthy' ? 'active' : ''}`} onClick={() => setActiveTab('Healthy')}>Healthy</button>
        <button className={`tab-btn ${activeTab === 'Upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('Upcoming')}>Upcoming</button>
        <button className={`tab-btn ${activeTab === 'Overdue' ? 'active' : ''}`} onClick={() => setActiveTab('Overdue')}>Overdue</button>
      </div>

      {/* Schedules Display */}
      <div className="maintenance-list flex flex-col gap-15">
        {filteredSchedules.length === 0 ? (
          <div className="card text-center text-gray-500 padding-y-40">
            <Wrench size={48} className="margin-b-15 text-gray-700 block margin-x-auto" />
            <p>No maintenance schedules found in this category.</p>
          </div>
        ) : (
          filteredSchedules.map(schedule => {
            const v = vehicles.find(veh => veh.id === schedule.vehicle_id);
            const isOverdue = schedule.current_status === 'Overdue';
            const isUpcoming = schedule.current_status === 'Upcoming';

            return (
              <div key={schedule.id} className={`maintenance-item card flex justify-between align-center status-border-${isOverdue ? 'cancelled' : isUpcoming ? 'in-shop' : 'completed'}`}>
                <div className="service-details">
                  <div className="flex align-center gap-10 margin-b-10">
                    <span className={`badge ${isOverdue ? 'badge-retired' : isUpcoming ? 'badge-in-shop' : 'badge-available'}`}>
                      {schedule.current_status}
                    </span>
                    {isOverdue && <AlertTriangle size={14} className="text-danger" />}
                    <span className="text-xxs text-gray-500 font-bold uppercase">Schedule #{schedule.id}</span>
                  </div>

                  <h3 className="text-white text-md font-bold">
                    {v ? `${v.make} ${v.model}` : 'Unknown Vehicle'}
                  </h3>
                  <p className="text-xs text-gray-400 margin-b-10">
                    {v ? `${v.license_plate} • ${v.vehicle_type}` : ''}
                  </p>
                </div>

                <div className="service-metrics flex gap-20 align-center text-xs text-gray-300">
                  <div className="flex flex-col align-center">
                    <span className="flex align-center gap-2 text-gray-500 text-xxs font-bold uppercase">
                      <Calendar size={12} /> Next Service Date
                    </span>
                    <span className="font-semibold text-white">
                      {schedule.next_service_date || 'TBD'}
                    </span>
                  </div>

                  <div className="flex flex-col align-center">
                    <span className="text-gray-500 text-xxs font-bold uppercase">Next Service Odometer</span>
                    <span className="font-semibold text-white">
                      {schedule.next_service_odometer.toLocaleString()} km
                    </span>
                  </div>

                  {schedule.last_service_date && (
                    <div className="flex flex-col align-center">
                      <span className="flex align-center gap-2 text-gray-500 text-xxs font-bold uppercase">
                        <CheckCircle2 size={12} /> Last Service
                      </span>
                      <span className="font-semibold text-white">{schedule.last_service_date}</span>
                    </div>
                  )}

                  <div className="flex flex-col align-center">
                    <span className="text-gray-500 text-xxs font-bold uppercase">Current Odometer</span>
                    <span className="font-semibold text-white">
                      {v ? `${v.odometer.toLocaleString()} km` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
