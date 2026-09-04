import { useState } from 'react';
import { User, Lock, LogIn, X } from 'lucide-react';
import { UserRole } from '../types';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (role: UserRole, name?: string) => void;
}

export default function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('tenant');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prototype-only: do client-side role assignment based on selected role
    onLogin(role, email.split('@')[0] || 'User');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">JV</div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg">Sign in to OmniServe</h3>
              <p className="text-xs text-slate-500">Access tenant, provider, driver, and store portals</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <div className="mt-1 relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <div className="mt-1 relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Sign in as</label>
            <div className="mt-1 flex gap-2 text-xs">
              <button type="button" onClick={() => setRole('tenant')} className={`px-3 py-1 rounded-full border ${role === 'tenant' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                Tenant
              </button>
              <button type="button" onClick={() => setRole('provider')} className={`px-3 py-1 rounded-full border ${role === 'provider' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                Provider
              </button>
              <button type="button" onClick={() => setRole('driver')} className={`px-3 py-1 rounded-full border ${role === 'driver' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                Driver
              </button>
              <button type="button" onClick={() => setRole('merchant')} className={`px-3 py-1 rounded-full border ${role === 'merchant' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                Merchant
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button type="submit" className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
              <LogIn className="w-4 h-4" />
              Sign in
            </button>
            <button type="button" onClick={() => { setEmail('demo@tenant.test'); setPassword('password'); setRole('tenant'); onLogin('tenant', 'demo'); }} className="text-xs text-slate-500 underline">
              Quick demo
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-400 mt-4">This login UI is a prototype. It does not authenticate with a server yet.</p>
      </div>
    </div>
  );
}
