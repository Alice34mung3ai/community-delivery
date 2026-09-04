import { useState } from 'react';
import { 
  Wrench, CheckCircle2, Clock, MapPin, DollarSign, User, ShieldCheck, 
  ChevronRight, AlertCircle, Phone, Check, RefreshCw 
} from 'lucide-react';
import { VerifiedPro, Order, OrderStatus } from '../types';

interface ProviderDashboardProps {
  pros: VerifiedPro[];
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, proId?: string) => void;
  onSelectOrderToTrack: (order: Order) => void;
}

export default function ProviderDashboard({
  pros = [],
  orders = [],
  onUpdateOrderStatus,
  onSelectOrderToTrack
}: ProviderDashboardProps) {
  const [selectedProId, setSelectedProId] = useState(pros[0]?.id || 'pro-1');
  const [isOnline, setIsOnline] = useState(true);

  const fallbackPro: VerifiedPro = {
    id: 'pro-1',
    name: 'Marco Rossi',
    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=300',
    category: 'plumbing',
    title: 'Master Licensed Plumber & Pipe Specialist',
    rating: 4.95,
    reviewCount: 342,
    hourlyRate: 65,
    isVerified: true,
    licenseNumber: 'MP-89241-NY',
    yearsExperience: 14,
    distanceMiles: 0.9,
    responseTimeMin: 15,
    specialties: ['Emergency Leak Repair', 'Drain Camera & Snaking', 'Water Heater Replacement'],
    badges: ['Background Checked', 'Licensed & Insured'],
    phone: '+1 (555) 234-8910',
    completedJobs: 1240,
    bio: 'Certified Master Plumber with over 14 years serving local residential complexes.',
    location: {
      lat: 40.7135,
      lng: -74.0040,
      address: '74 Hudson St, New York, NY'
    }
  };

  const currentPro = pros.find(p => p.id === selectedProId) || pros[0] || fallbackPro;

  // Jobs relevant to this pro: assigned to them OR pending service orders in their category
  const proOrders = orders.filter(o => 
    o.type === 'service' && 
    (o.providerId === currentPro.id || (o.status === 'pending' && (!o.category || o.category === currentPro.category)))
  );

  const pendingJobs = proOrders.filter(o => o.status === 'pending');
  const activeJobs = proOrders.filter(o => o.status !== 'pending' && o.status !== 'completed' && o.status !== 'cancelled');
  const completedJobs = proOrders.filter(o => o.status === 'completed');

  const todayEarnings = completedJobs.reduce((sum, o) => sum + o.subtotal, 0) + (activeJobs.length > 0 ? 65.00 : 0);

  return (
    <div id="provider-dashboard-view" className="space-y-5">
      
      {/* Top Pro Control Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <img
            src={currentPro.avatar}
            alt={currentPro.name}
            referrerPolicy="no-referrer"
            className="w-13 h-13 rounded-xl object-cover border border-slate-200 shadow-xs"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">{currentPro.name}</h2>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                <span className="capitalize">{currentPro.category}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{currentPro.title}</p>
            <p className="text-[11px] text-slate-400 font-mono">License: {currentPro.licenseNumber}</p>
          </div>
        </div>

        {/* Switch Pro Persona */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Switch Technician</label>
            <select
              value={selectedProId}
              onChange={(e) => setSelectedProId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              {pros.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 cursor-pointer transition-colors ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-200 animate-ping' : 'bg-slate-400'}`}></span>
            <span>{isOnline ? 'Online & Available' : 'Offline / Standby'}</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Today's Payout</div>
          <div className="text-xl font-bold text-slate-900 mt-1">${todayEarnings.toFixed(2)}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">+Direct Deposit Daily</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Base Rate</div>
          <div className="text-xl font-bold text-blue-600 mt-1">${currentPro.hourlyRate}/hr</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Plus emergency surcharges</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Jobs Completed</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{currentPro.completedJobs}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Top 5% verified contractor</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Satisfaction</div>
          <div className="text-xl font-bold text-amber-500 mt-1">★ {currentPro.rating}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{currentPro.reviewCount} verified ratings</div>
        </div>
      </div>

      {/* Active Jobs Pipeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
            <span>Current Dispatches &amp; Active Bookings</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeJobs.length} active
            </span>
          </h3>
        </div>

        {activeJobs.length === 0 ? (
          <div className="p-7 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
            <p className="text-xs font-bold text-slate-700">No jobs currently in progress</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Check incoming requests below or switch to Tenant mode to dispatch an order.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-xl border border-blue-500 bg-blue-50/20 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{job.title}</span>
                      <span className="bg-blue-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{job.tenantAddress} ({job.apartmentUnit})</span>
                      <span>&bull;</span>
                      <span>Tenant: {job.tenantName}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-blue-600">${job.total.toFixed(2)}</span>
                    <div className="text-[10px] text-emerald-700 font-semibold">Guaranteed Payout</div>
                  </div>
                </div>

                {job.notes && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                    <strong>Tenant Notes:</strong> {job.notes}
                  </div>
                )}

                {/* Status Action Buttons for Pro */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onSelectOrderToTrack(job)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Open Live GPS &amp; Chat
                  </button>

                  {job.status === 'assigned' && (
                    <button
                      onClick={() => onUpdateOrderStatus(job.id, 'en_route')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      En Route to Site
                    </button>
                  )}

                  {job.status === 'en_route' && (
                    <button
                      onClick={() => onUpdateOrderStatus(job.id, 'arrived')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Arrived at Building
                    </button>
                  )}

                  {job.status === 'arrived' && (
                    <button
                      onClick={() => onUpdateOrderStatus(job.id, 'in_progress')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Begin Work
                    </button>
                  )}

                  {job.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateOrderStatus(job.id, 'completed')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete Work &amp; Sign-off</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Job Requests Queue */}
      {pendingJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-base text-slate-900">
            Incoming Job Requests Available in Area
          </h3>

          <div className="space-y-2.5">
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{job.title}</span>
                    <span className="text-[9px] uppercase font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                      Needs Pro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {job.tenantAddress} &bull; Est. Payout: ${job.total.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateOrderStatus(job.id, 'assigned', currentPro.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Accept Job Dispatch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
