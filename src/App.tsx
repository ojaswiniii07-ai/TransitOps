import { useState, useEffect } from 'react'
import { useApp, type Role } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { Vehicles } from './components/Vehicles'
import { Drivers } from './components/Drivers'
import { Trips } from './components/Trips'
import { Maintenance } from './components/Maintenance'
import { Expenses } from './components/Expenses'
import { Reports } from './components/Reports'
import { Login } from './components/Login'
import { Shield, LogOut, Moon, Sun, User } from 'lucide-react'
import './App.css'

function App() {
  const { currentUser, setCurrentUser, activeRole, setActiveRole } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(true) // Defaults to Dark Theme

  // Verify access permissions when role changes
  useEffect(() => {
    if (!currentUser) return;
    
    // Check if the current tab is allowed under the new active role
    const permissions: Record<Role, string[]> = {
      'Fleet Manager': ['dashboard', 'vehicles', 'drivers', 'trips', 'maintenance', 'expenses', 'reports'],
      'Dispatcher': ['dashboard', 'vehicles', 'drivers', 'trips'],
      'Safety Officer': ['dashboard', 'drivers'],
      'Financial Analyst': ['dashboard', 'expenses', 'reports']
    };

    const allowedTabs = permissions[activeRole];
    if (allowedTabs && !allowedTabs.includes(activeTab)) {
      // Redirect to the first allowed tab (usually dashboard)
      setActiveTab(allowedTabs[0]);
    }
  }, [activeRole]);

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [darkMode]);

  // Render correct sub-view component
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <Vehicles />;
      case 'drivers':
        return <Drivers />;
      case 'trips':
        return <Trips />;
      case 'maintenance':
        return <Maintenance />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  // Render Login view if unauthenticated
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : ''}`}>
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Layout Area */}
      <div className="main-content-wrapper">
        
        {/* Header Header */}
        <header className="app-header flex justify-between align-center card">
          <div className="flex align-center gap-10">
            <h1 className="text-lg font-bold capitalize">{activeTab.replace('-', ' ')}</h1>
          </div>

          <div className="flex align-center gap-15">
            {/* Global Role Switcher Banner */}
            <div className="role-switcher-banner flex align-center gap-5 text-xs">
              <Shield size={14} className="text-primary" />
              <span className="text-gray-400">Viewing Role:</span>
              <select 
                value={activeRole} 
                onChange={(e) => setActiveRole(e.target.value as Role)}
                className="role-select font-semibold bg-transparent"
              >
                <option value="Fleet Manager">Fleet Manager (All Controls)</option>
                <option value="Dispatcher">Dispatcher (Scheduling)</option>
                <option value="Safety Officer">Safety Officer (Compliance)</option>
                <option value="Financial Analyst">Financial Analyst (Expenses/Reports)</option>
              </select>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              className="btn btn-icon btn-theme" 
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User Profile Widget */}
            <div className="user-profile-badge flex align-center gap-8">
              <div className="avatar">
                <User size={14} className="text-gray-300" />
              </div>
              <div className="user-meta text-left">
                <span className="user-name font-semibold block">{currentUser.name}</span>
                <span className="user-email text-xxs text-gray-500 block">{currentUser.email}</span>
              </div>
              
              <button 
                className="btn btn-icon btn-logout text-gray-400 hover:text-red-500 margin-l-10" 
                onClick={handleLogout}
                title="Sign out of console"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic View container */}
        <main className="view-container">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App
