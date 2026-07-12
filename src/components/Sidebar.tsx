import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Navigation, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  Lock
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { activeRole } = useApp();

  // Define tab configuration and required roles
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { id: 'vehicles', label: 'Vehicle Registry', icon: Truck, roles: ['Fleet Manager', 'Dispatcher'] },
    { id: 'drivers', label: 'Driver Management', icon: Users, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer'] },
    { id: 'trips', label: 'Trip Dispatch', icon: Navigation, roles: ['Fleet Manager', 'Dispatcher'] },
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench, roles: ['Fleet Manager'] },
    { id: 'expenses', label: 'Fuel & Expenses', icon: DollarSign, roles: ['Fleet Manager', 'Financial Analyst'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Fleet Manager', 'Financial Analyst'] },
  ];

  const hasAccess = (itemRoles: string[]) => {
    return itemRoles.includes(activeRole);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Truck size={24} className="logo-svg" />
        </div>
        <div>
          <h2>TransitOps</h2>
          <span className="logo-sub text-xs">Fleet Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => {
            const allowed = hasAccess(item.roles);
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => allowed && setActiveTab(item.id)}
                  className={`nav-item ${isActive ? 'active' : ''} ${!allowed ? 'disabled' : ''}`}
                  title={!allowed ? `Requires role: ${item.roles.join(', ')}` : ''}
                  disabled={!allowed && activeRole !== 'Fleet Manager'} // Fleet Manager has access to everything
                >
                  <span className="nav-item-content">
                    <item.icon size={18} className="nav-icon" />
                    <span>{item.label}</span>
                  </span>
                  {!allowed && (
                    <span className="lock-icon" title="Locked under current role">
                      <Lock size={12} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer text-xs">
        <p className="text-gray-400">TransitOps v1.0</p>
        <p className="text-gray-500">© 2026 Operations</p>
      </div>
    </aside>
  );
};
