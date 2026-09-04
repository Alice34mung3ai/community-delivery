import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Order, VerifiedPro, LocalStore, Driver } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database with realistic seed data
const initialPros: VerifiedPro[] = [
  {
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
    specialties: ['Emergency Leak Repair', 'Drain Camera & Snaking', 'Water Heater Replacement', 'Toilet & Valve Repair'],
    badges: ['Background Checked', 'Licensed & Insured', 'Emergency 24/7', 'Top Rated 2025'],
    phone: '+1 (555) 234-8910',
    completedJobs: 1240,
    bio: 'Certified Master Plumber with over 14 years serving local residential complexes and apartment towers. Equipped with electronic leak detection and high-pressure jetters.',
    location: {
      lat: 40.7135,
      lng: -74.0040,
      address: '74 Hudson St, New York, NY'
    }
  },
  {
    id: 'pro-2',
    name: 'Elena Ramos',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    category: 'electrical',
    title: 'Certified Master Residential Electrician',
    rating: 4.98,
    reviewCount: 289,
    hourlyRate: 70,
    isVerified: true,
    licenseNumber: 'EL-40192-NY',
    yearsExperience: 12,
    distanceMiles: 1.3,
    responseTimeMin: 20,
    specialties: ['Circuit Breaker Diagnostics', 'Short Circuit & Wiring', 'Smart Lighting & Outlets', 'Safety Inspections'],
    badges: ['OSHA Certified', 'Licensed Master Electrician', 'Background Checked', 'Warranty Included'],
    phone: '+1 (555) 345-6789',
    completedJobs: 980,
    bio: 'Specialist in apartment electrical diagnostic, breaker panel upgrades, and energy efficiency. Fast response times with full warranty on all wiring and fixture work.',
    location: {
      lat: 40.7180,
      lng: -73.9980,
      address: '142 Grand St, New York, NY'
    }
  },
  {
    id: 'pro-3',
    name: 'CleanCraft Studio Team (Amina & Maria)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300',
    category: 'cleaning',
    title: 'Hospital-Grade Deep Cleaning & Sanitization',
    rating: 4.92,
    reviewCount: 415,
    hourlyRate: 48,
    isVerified: true,
    licenseNumber: 'CL-77120-NY',
    yearsExperience: 7,
    distanceMiles: 0.7,
    responseTimeMin: 25,
    specialties: ['Deep Apartment Scrub', 'Move-In/Move-Out Prep', 'Kitchen & Oven Degreasing', 'Eco/Pet-Safe Sanitization'],
    badges: ['Eco-Certified Products', 'Insured & Bonded', 'Verified Team', 'Same-Day Service'],
    phone: '+1 (555) 456-7890',
    completedJobs: 1560,
    bio: 'Trusted cleaning professionals specializing in spotless tenant turnover, bathroom deep descaling, and hypoallergenic cleaning with HEPA filtration.',
    location: {
      lat: 40.7110,
      lng: -74.0090,
      address: '50 Broadway, New York, NY'
    }
  },
  {
    id: 'pro-4',
    name: 'David Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    category: 'plumbing',
    title: 'Express Drain & Fixture Specialist',
    rating: 4.88,
    reviewCount: 198,
    hourlyRate: 60,
    isVerified: true,
    licenseNumber: 'PL-33109-NY',
    yearsExperience: 9,
    distanceMiles: 1.5,
    responseTimeMin: 30,
    specialties: ['Clogged Sinks & Toilets', 'Faucet Replacements', 'Garbage Disposals', 'Pressure Regulators'],
    badges: ['Licensed Journeyman', 'Clean Workspace Guarantee', 'Free Camera Check'],
    phone: '+1 (555) 567-8901',
    completedJobs: 720,
    bio: 'Quick, tidy, and transparent plumbing service. No hidden fees and up-front pricing before any wrench touches your pipes.',
    location: {
      lat: 40.7230,
      lng: -74.0010,
      address: '210 Canal St, New York, NY'
    }
  },
  {
    id: 'pro-5',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    category: 'electrical',
    title: 'High-Voltage & Smart Home Specialist',
    rating: 4.89,
    reviewCount: 164,
    hourlyRate: 68,
    isVerified: true,
    licenseNumber: 'EL-90812-NY',
    yearsExperience: 10,
    distanceMiles: 1.8,
    responseTimeMin: 35,
    specialties: ['Chandelier & Fan Mounting', 'Smart Thermostats & Ring Doorbells', 'Sub-panel Diagnostics'],
    badges: ['Licensed Electrician', 'Smart Home Pro', 'Insured'],
    phone: '+1 (555) 678-9012',
    completedJobs: 640,
    bio: 'Specializing in neat aesthetic installs, hidden cabling, and rapid troubleshooting of tenant circuit tripping.',
    location: {
      lat: 40.7250,
      lng: -73.9920,
      address: '380 Bowery, New York, NY'
    }
  },
  {
    id: 'pro-6',
    name: 'Robert Miller',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300',
    category: 'carpentry',
    title: 'Master Carpenter & Door Hardware Pro',
    rating: 4.91,
    reviewCount: 220,
    hourlyRate: 55,
    isVerified: true,
    licenseNumber: 'HW-55102-NY',
    yearsExperience: 16,
    distanceMiles: 1.1,
    responseTimeMin: 25,
    specialties: ['Door Alignment & Deadbolts', 'Cabinet Repair & Hinges', 'Custom Shelving', 'Drywall Patching'],
    badges: ['Master Craftsman', 'Insured & Bonded', 'Verified Pro'],
    phone: '+1 (555) 789-0123',
    completedJobs: 890,
    bio: 'Precision handyman and carpentry repair for apartments. From sticky fire doors to custom cabinetry and trim work.',
    location: {
      lat: 40.7160,
      lng: -74.0070,
      address: '90 Franklin St, New York, NY'
    }
  }
];

const initialStores: LocalStore[] = [
  {
    id: 'store-1',
    name: 'GreenMarket Organics & Groceries',
    type: 'supermarket',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
    rating: 4.88,
    reviewCount: 620,
    distanceMiles: 0.6,
    deliveryEstimateMin: 20,
    deliveryFee: 2.99,
    minOrder: 15,
    address: '185 Greenwich St, New York, NY',
    isOpen: true,
    items: [
      {
        id: 'item-101',
        name: 'Organic Whole Milk (1 Gallon)',
        category: 'Dairy',
        price: 5.49,
        unit: '1 gal',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Grade A USDA organic whole milk from pasture-raised cows.'
      },
      {
        id: 'item-102',
        name: 'Artisan Sourdough Loaf',
        category: 'Bakery',
        price: 4.99,
        unit: '1 loaf',
        image: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Freshly baked naturally fermented sourdough bread.'
      },
      {
        id: 'item-103',
        name: 'Fresh Hass Avocados (Pack of 4)',
        category: 'Produce',
        price: 4.29,
        unit: '4 pack',
        image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Ripe and ready to eat creamy California Hass avocados.'
      },
      {
        id: 'item-104',
        name: 'Pasture-Raised Brown Eggs (Dozen)',
        category: 'Dairy',
        price: 5.99,
        unit: '12 ct',
        image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Certified humane pasture-raised large eggs with rich golden yolks.'
      },
      {
        id: 'item-105',
        name: 'Organic Baby Spinach (16 oz)',
        category: 'Produce',
        price: 3.99,
        unit: '16 oz box',
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Triple-washed tender organic baby spinach leaves.'
      },
      {
        id: 'item-106',
        name: 'Sparkling Mineral Water (12-pack)',
        category: 'Beverages',
        price: 7.99,
        unit: '12 x 12 oz',
        image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Crisp mountain sparkling water with zero sugar or calories.'
      }
    ]
  },
  {
    id: 'store-2',
    name: 'CarePlus Community Pharmacy & Health',
    type: 'pharmacy',
    logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800',
    rating: 4.94,
    reviewCount: 480,
    distanceMiles: 0.5,
    deliveryEstimateMin: 15,
    deliveryFee: 1.99,
    minOrder: 10,
    address: '92 Chambers St, New York, NY',
    isOpen: true,
    items: [
      {
        id: 'item-201',
        name: 'Extra Strength Pain & Headache Relief (100 Caplets)',
        category: 'Pain Relief',
        price: 9.49,
        unit: '100 count',
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Acetaminophen 500mg for rapid fever and headache relief.'
      },
      {
        id: 'item-202',
        name: '24-Hour Non-Drowsy Allergy Tablets',
        category: 'Allergy',
        price: 14.99,
        unit: '30 tablets',
        image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Cetirizine HCl 10mg for indoor and outdoor 24hr allergy relief.'
      },
      {
        id: 'item-203',
        name: 'Emergency Waterproof First Aid Kit (85 pcs)',
        category: 'First Aid',
        price: 18.50,
        unit: '1 kit',
        image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Antiseptic wipes, sterile bandages, burn gel, medical tape & shears.'
      },
      {
        id: 'item-204',
        name: 'Infant & Children Paracetamol Suspension',
        category: 'Baby & Kids',
        price: 8.99,
        unit: '4 fl oz',
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Gentle on little stomachs, dye-free cherry flavor fever reducer.'
      },
      {
        id: 'item-205',
        name: 'Rapid Electrolyte Hydration Packets (16 ct)',
        category: 'Wellness',
        price: 11.29,
        unit: '16 packets',
        image: 'https://images.unsplash.com/photo-1556760544-74068565f05c?auto=format&fit=crop&q=80&w=300',
        inStock: true,
        description: 'Clinically balanced cellular hydration formula with essential minerals.'
      }
    ]
  }
];

const initialDrivers: Driver[] = [
  {
    id: 'driver-1',
    name: 'Alex Rivera',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    vehicleType: 'Cargo Van',
    vehiclePlate: 'NY-TX4812',
    rating: 4.96,
    completedDeliveries: 1420,
    phone: '+1 (555) 890-1234',
    currentLat: 40.7145,
    currentLng: -74.0060,
    isOnline: true
  },
  {
    id: 'driver-2',
    name: 'Samira Khan',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300',
    vehicleType: 'Motorbike / Scooter',
    vehiclePlate: 'NY-BK902',
    rating: 4.99,
    completedDeliveries: 980,
    phone: '+1 (555) 901-2345',
    currentLat: 40.7125,
    currentLng: -74.0020,
    isOnline: true
  },
  {
    id: 'driver-3',
    name: 'Carlos Gomez',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300',
    vehicleType: 'Car',
    vehiclePlate: 'NY-7B9382',
    rating: 4.88,
    completedDeliveries: 2310,
    phone: '+1 (555) 012-3456',
    currentLat: 40.7165,
    currentLng: -74.0045,
    isOnline: true
  }
];

let ordersStore: Order[] = [
  {
    id: 'ORD-701',
    type: 'service',
    title: 'Emergency Kitchen Sink Drain & Trap Leak',
    category: 'plumbing',
    status: 'en_route',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tenantName: 'Jordan Vance',
    tenantPhone: '+1 (555) 123-4567',
    tenantAddress: '72 Wall St, Apt 14C',
    apartmentUnit: 'Apt 14C, Tower East',
    providerId: 'pro-1',
    providerName: 'Marco Rossi',
    providerAvatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=300',
    providerPhone: '+1 (555) 234-8910',
    subtotal: 65.00,
    deliveryFee: 0,
    serviceFee: 5.00,
    tax: 5.60,
    total: 75.60,
    paymentMethod: 'card',
    estimatedArrivalMin: 8,
    urgency: 'emergency',
    notes: 'Shut off valve is stiff. Water bucket placed underneath. Please call when in lobby for elevator code.',
    tenantLocation: { lat: 40.7065, lng: -74.0090, label: '72 Wall St, Apt 14C' },
    originLocation: { lat: 40.7135, lng: -74.0040, label: 'Pro Workshop: 74 Hudson St' },
    currentLocation: { lat: 40.7095, lng: -74.0070 },
    messages: [
      {
        id: 'msg-1',
        sender: 'tenant',
        senderName: 'Jordan Vance',
        text: 'Hi Marco, I shut off the main kitchen valve as best I could. See you shortly!',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-2',
        sender: 'provider',
        senderName: 'Marco Rossi',
        text: 'Got it Jordan! Im in the van on Broadway now, bringing extra P-trap seals and brass valves. ETA 8 mins.',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  },
  {
    id: 'ORD-702',
    type: 'store_delivery',
    title: 'Pharmacy Urgent Relief Essentials',
    category: 'pharmacy',
    status: 'assigned',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    tenantName: 'Jordan Vance',
    tenantPhone: '+1 (555) 123-4567',
    tenantAddress: '72 Wall St, Apt 14C',
    apartmentUnit: 'Apt 14C',
    storeId: 'store-2',
    storeName: 'CarePlus Community Pharmacy & Health',
    storeType: 'pharmacy',
    driverId: 'driver-2',
    driverName: 'Samira Khan',
    driverAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300',
    driverVehicle: 'Scooter (NY-BK902)',
    driverPhone: '+1 (555) 901-2345',
    items: [
      { itemId: 'item-201', name: 'Extra Strength Pain Relief (100 Caplets)', price: 9.49, quantity: 1 },
      { itemId: 'item-205', name: 'Rapid Electrolyte Hydration Packets', price: 11.29, quantity: 1 }
    ],
    subtotal: 20.78,
    deliveryFee: 1.99,
    serviceFee: 2.00,
    tax: 1.82,
    total: 26.59,
    paymentMethod: 'apple_pay',
    estimatedArrivalMin: 14,
    urgency: 'normal',
    notes: 'Please leave with concierge if unavailable.',
    tenantLocation: { lat: 40.7065, lng: -74.0090, label: '72 Wall St, Apt 14C' },
    originLocation: { lat: 40.7150, lng: -74.0050, label: 'CarePlus Pharmacy' },
    currentLocation: { lat: 40.7140, lng: -74.0055 },
    messages: [
      {
        id: 'msg-10',
        sender: 'system',
        senderName: 'System',
        text: 'Driver Samira Khan has accepted your pharmacy pickup request.',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  }
];

// Lazy Gemini AI Client Initialization
let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

// ---------------- API ROUTES ----------------

// Get all verified service pros
app.get('/api/services', (req: Request, res: Response) => {
  const { category, search } = req.query;
  let results = [...initialPros];

  if (category && typeof category === 'string' && category !== 'all') {
    results = results.filter(pro => pro.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(pro => 
      pro.name.toLowerCase().includes(q) ||
      pro.title.toLowerCase().includes(q) ||
      pro.specialties.some(s => s.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: results.length, data: results });
});

// Get all nearby stores (Supermarkets & Pharmacies)
app.get('/api/stores', (req: Request, res: Response) => {
  const { type, search } = req.query;
  let results = [...initialStores];

  if (type && typeof type === 'string' && type !== 'all') {
    results = results.filter(store => store.type === type);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(store => 
      store.name.toLowerCase().includes(q) ||
      store.items.some(item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: results.length, data: results });
});

// Get available drivers
app.get('/api/drivers', (req: Request, res: Response) => {
  res.json({ success: true, data: initialDrivers });
});

// Get orders (optionally filtered by role or tenant)
app.get('/api/orders', (req: Request, res: Response) => {
  const { role, proId, driverId } = req.query;
  let filtered = [...ordersStore];

  if (role === 'provider' && proId) {
    filtered = filtered.filter(o => o.providerId === proId || (o.type === 'service' && o.status === 'pending'));
  } else if (role === 'driver' && driverId) {
    filtered = filtered.filter(o => o.driverId === driverId || (o.type !== 'service' && o.status === 'pending'));
  }

  // Sort by newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, count: filtered.length, data: filtered });
});

// Get single order
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = ordersStore.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// Create new order (service booking, grocery/pharmacy delivery, or ride/cargo dispatch)
app.post('/api/orders', (req: Request, res: Response) => {
  const body = req.body;
  const newId = 'ORD-' + Math.floor(100 + Math.random() * 900);

  // If driver or pro not pre-assigned, assign available one or leave pending
  let assignedPro = body.providerId ? initialPros.find(p => p.id === body.providerId) : undefined;
  let assignedDriver = body.driverId ? initialDrivers.find(d => d.id === body.driverId) : undefined;

  if (body.type === 'store_delivery' && !assignedDriver) {
    // Auto assign fastest driver
    assignedDriver = initialDrivers[0];
  }

  const newOrder: Order = {
    id: newId,
    type: body.type || 'service',
    title: body.title || 'On-Demand Service Request',
    category: body.category,
    status: body.type === 'service' && !assignedPro ? 'pending' : 'assigned',
    createdAt: new Date().toISOString(),
    tenantName: body.tenantName || 'Tenant',
    tenantPhone: body.tenantPhone || '+1 (555) 123-4567',
    tenantAddress: body.tenantAddress || '72 Wall St, Apt 14C',
    apartmentUnit: body.apartmentUnit || 'Apt 14C',
    
    providerId: assignedPro?.id,
    providerName: assignedPro?.name,
    providerAvatar: assignedPro?.avatar,
    providerPhone: assignedPro?.phone,

    driverId: assignedDriver?.id,
    driverName: assignedDriver?.name,
    driverAvatar: assignedDriver?.avatar,
    driverVehicle: assignedDriver ? `${assignedDriver.vehicleType} (${assignedDriver.vehiclePlate})` : undefined,
    driverPhone: assignedDriver?.phone,

    storeId: body.storeId,
    storeName: body.storeName,
    storeType: body.storeType,
    items: body.items || [],

    subtotal: Number(body.subtotal) || 45.00,
    deliveryFee: Number(body.deliveryFee) || 0,
    serviceFee: Number(body.serviceFee) || 4.50,
    tax: Number(body.tax) || 3.90,
    total: Number(body.total) || 53.40,
    paymentMethod: body.paymentMethod || 'card',

    estimatedArrivalMin: body.estimatedArrivalMin || 20,
    urgency: body.urgency || 'normal',
    scheduledFor: body.scheduledFor,
    notes: body.notes || '',

    tenantLocation: { lat: 40.7065, lng: -74.0090, label: body.tenantAddress || '72 Wall St, Apt 14C' },
    originLocation: assignedPro 
      ? { lat: assignedPro.location.lat, lng: assignedPro.location.lng, label: assignedPro.location.address } 
      : { lat: 40.7135, lng: -74.0040, label: 'Downtown Hub' },
    currentLocation: assignedDriver ? { lat: assignedDriver.currentLat, lng: assignedDriver.currentLng } : { lat: 40.7120, lng: -74.0050 },
    
    messages: [
      {
        id: 'msg-init',
        sender: 'system',
        senderName: 'System',
        text: `Request initiated for ${body.title}. We are coordinating with ${assignedPro?.name || assignedDriver?.name || 'available local team'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  ordersStore.unshift(newOrder);
  res.status(201).json({ success: true, data: newOrder });
});

// Update order status (accept, dispatch, en_route, arrived, completed)
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, proId, driverId, currentLat, currentLng } = req.body;

  const orderIndex = ordersStore.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const order = ordersStore[orderIndex];

  if (status) {
    order.status = status;
    order.messages.push({
      id: 'msg-status-' + Date.now(),
      sender: 'system',
      senderName: 'Dispatch Status',
      text: `Status updated to: ${status.replace('_', ' ').toUpperCase()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  if (proId) {
    const pro = initialPros.find(p => p.id === proId);
    if (pro) {
      order.providerId = pro.id;
      order.providerName = pro.name;
      order.providerAvatar = pro.avatar;
      order.providerPhone = pro.phone;
    }
  }

  if (driverId) {
    const driver = initialDrivers.find(d => d.id === driverId);
    if (driver) {
      order.driverId = driver.id;
      order.driverName = driver.name;
      order.driverAvatar = driver.avatar;
      order.driverVehicle = `${driver.vehicleType} (${driver.vehiclePlate})`;
      order.driverPhone = driver.phone;
    }
  }

  if (currentLat && currentLng) {
    order.currentLocation = { lat: currentLat, lng: currentLng };
  }

  ordersStore[orderIndex] = order;
  res.json({ success: true, data: order });
});

// Add message to order chat
app.post('/api/orders/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const { sender, senderName, text } = req.body;

  const order = ordersStore.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const newMessage = {
    id: 'msg-' + Date.now(),
    sender: sender || 'tenant',
    senderName: senderName || 'Tenant',
    text: text || '',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  order.messages.push(newMessage);
  res.json({ success: true, data: newMessage });
});

// AI Smart Diagnosis & Cost Estimator Endpoint (Gemini API server-side)
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  const { issueDescription, category } = req.body;

  if (!issueDescription || typeof issueDescription !== 'string') {
    return res.status(400).json({ success: false, error: 'Description is required' });
  }

  try {
    const gemini = getGemini();
    if (gemini) {
      const prompt = `You are a licensed Master Tradesperson and Building Property Manager assistant.
The tenant is reporting this home issue:
"${issueDescription}"
Selected category hint: ${category || 'Unknown'}

Analyze this issue and return a valid JSON object strictly matching this schema (do NOT include markdown code fences or backticks, just raw JSON):
{
  "diagnosis": "concise technical summary of what likely happened (max 25 words)",
  "urgency": "emergency" or "high" or "medium" or "standard",
  "recommendedTrade": "plumbing" or "electrical" or "cleaning" or "carpentry" or "appliances",
  "estimatedCostRange": "$XX - $YY",
  "estimatedTimeHours": "1-2 hours",
  "safetyWarning": "Immediate safety action the tenant should take right now (e.g. shut off shutoff valve, flip breaker #4, do not touch water near outlet)",
  "recommendedSpecialty": "e.g. P-Trap & Snaking, GFCI Breaker Diagnostics, Sanitization",
  "materialsLikelyNeeded": ["item 1", "item 2"]
}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const responseText = response.text || '';
      // Clean JSON if needed
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsed });
    }
  } catch (err) {
    console.warn('Gemini diagnosis fallback used due to:', err);
  }

  // Graceful rule-based fallback if Gemini is offline or rate-limited
  const lower = issueDescription.toLowerCase();
  let trade = category || 'plumbing';
  let urgency = 'medium';
  let safety = 'Turn off the affected fixture or switch if safe to do so.';
  let cost = '$65 - $110';

  if (lower.includes('leak') || lower.includes('water') || lower.includes('pipe') || lower.includes('clog') || lower.includes('toilet') || lower.includes('sink')) {
    trade = 'plumbing';
    urgency = lower.includes('flood') || lower.includes('burst') ? 'emergency' : 'high';
    safety = 'Locate and turn the clockwise shutoff valve beneath the fixture or at the main apartment riser.';
    cost = '$75 - $140';
  } else if (lower.includes('spark') || lower.includes('breaker') || lower.includes('power') || lower.includes('shock') || lower.includes('outlet') || lower.includes('wire')) {
    trade = 'electrical';
    urgency = lower.includes('spark') || lower.includes('smoke') ? 'emergency' : 'high';
    safety = 'Do not touch wet cords or outlets. Switch off the relevant sub-breaker in your panel immediately.';
    cost = '$80 - $160';
  } else if (lower.includes('clean') || lower.includes('mold') || lower.includes('stain') || lower.includes('dust') || lower.includes('move')) {
    trade = 'cleaning';
    urgency = 'standard';
    safety = 'Keep windows ventilated if handling strong cleaning odors.';
    cost = '$48 - $95';
  }

  return res.json({
    success: true,
    data: {
      diagnosis: `Identified issue requiring verified ${trade} technician dispatch.`,
      urgency,
      recommendedTrade: trade,
      estimatedCostRange: cost,
      estimatedTimeHours: '1-2 hours',
      safetyWarning: safety,
      recommendedSpecialty: 'Diagnostic & Rapid Repair',
      materialsLikelyNeeded: ['Replacement seals/fittings', 'Diagnostic meters']
    }
  });
});

// ---------------- VITE MIDDLEWARE & STATIC ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
