import React, { useState } from 'react';
import { useApp, type User } from '../context/AppContext';
import { Truck, LogIn, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUser } = useApp();
  
  const [email, setEmail] = useState('manager@transitops.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  // Quick select logins
  const mockProfiles = [
    { name: 'Fleet Manager', email: 'manager@transitops.com', role: 'Fleet Manager' },
    { name: 'Trip Dispatcher', email: 'dispatch@transitops.com', role: 'Dispatcher' },
    { name: 'Compliance Officer', email: 'safety@transitops.com', role: 'Safety Officer' },
    { name: 'Finance Analyst', email: 'finance@transitops.com', role: 'Financial Analyst' },
  ];

  const handleQuickLogin = (prof: typeof mockProfiles[0]) => {
    setEmail(prof.email);
    setPassword('password');
    handleLoginSubmit(null, prof.email);
  };

  const handleLoginSubmit = (e: React.FormEvent | null, directEmail?: string) => {
    if (e) e.preventDefault();
    
    const targetEmail = directEmail || email;
    
    // Validate matching mock credentials
    const foundUser: User | undefined = (() => {
      switch (targetEmail) {
        case 'manager@transitops.com':
          return { id: '1', name: 'John Fleet Manager', email: 'manager@transitops.com', role: 'Fleet Manager' };
        case 'dispatch@transitops.com':
          return { id: '2', name: 'Dan Dispatcher', email: 'dispatch@transitops.com', role: 'Dispatcher' };
        case 'safety@transitops.com':
          return { id: '3', name: 'Sarah Safety Officer', email: 'safety@transitops.com', role: 'Safety Officer' };
        case 'finance@transitops.com':
          return { id: '4', name: 'Fiona Financial Analyst', email: 'finance@transitops.com', role: 'Financial Analyst' };
        default:
          return undefined;
      }
    })();

    if (foundUser) {
      setError(null);
      setCurrentUser(foundUser);
    } else {
      setError('Invalid operations email or passcode credentials.');
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card card">
        <div className="login-header flex flex-col align-center text-center margin-b-30">
          <div className="logo-icon margin-b-10">
            <Truck size={32} className="logo-svg text-primary" />
          </div>
          <h2>TransitOps Platform</h2>
          <p className="text-gray-400 text-xs">Sign in to coordinate fleet logistics & audits</p>
        </div>

        {error && (
          <div className="card-alert bg-red-trans text-danger text-xxs flex align-center gap-5 margin-b-15">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleLoginSubmit(e)} className="flex flex-col gap-15">
          <div className="form-group">
            <label className="text-xxs text-gray-500">Corporate Email</label>
            <div className="input-with-icon">
              <Mail size={14} className="input-icon-left text-gray-500" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="email@transitops.com"
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="text-xxs text-gray-500">Access Key / Passcode</label>
            <div className="input-with-icon">
              <Lock size={14} className="input-icon-left text-gray-500" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary flex align-center justify-center gap-5 padding-y-12 font-bold text-sm margin-t-10">
            <LogIn size={16} /> Authenticate Operations
          </button>
        </form>

        <div className="quick-logins border-t margin-t-25 padding-t-20">
          <span className="text-xxs text-gray-500 font-bold uppercase block margin-b-10 text-center">Quick Profile Bypass (RBAC Testing)</span>
          <div className="grid grid-cols-2 gap-10">
            {mockProfiles.map(prof => (
              <button 
                key={prof.role} 
                className="btn btn-secondary text-xxs padding-5 text-left flex flex-col gap-2"
                onClick={() => handleQuickLogin(prof)}
              >
                <span className="font-semibold text-white block">{prof.role}</span>
                <span className="text-xxs text-gray-500 block truncate">{prof.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
