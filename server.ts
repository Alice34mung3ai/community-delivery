import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Order, VerifiedPro, LocalStore, Driver } from './src/types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
const PORT = 3000;
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.APP_ORIGIN || 'http://localhost:3000', credentials: true }));

// ---------------- In-Memory Fallback Data (kept for demo when DB empty) ----------------
const initialPros: VerifiedPro[] = [
  {
    id: 'pro-1',
    name: 'Griffins Munene',
    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=300',
    category: 'plumbing',
    title: 'Master Licensed Plumber & Pipe Specialist',
    rating: 4.95,
    reviewCount: 342,
    hourlyRate: 6500, // interpreted as KES for demo
    isVerified: true,
    licenseNumber: 'KP-89241-KE',
    yearsExperience: 14,
    distanceMiles: 0.9,
    responseTimeMin: 15,
    specialties: ['Emergency Leak Repair', 'Drain Camera & Snaking', 'Water Heater Replacement', 'Toilet & Valve Repair'],
    badges: ['Background Checked', 'Licensed & Insured', 'Emergency 24/7', 'Top Rated'],
    phone: '+254 733 000111',
    completedJobs: 1240,
    bio: 'Certified Master Plumber with over 14 years serving residential and commercial properties in Nairobi.',
    location: {
      lat: -1.286389,
      lng: 36.817223,
      address: 'Westlands, Nairobi, Kenya'
    }
  },
  {
    id: 'pro-2',
    name: 'Samuel Mwangi',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    category: 'electrical',
    title: 'Licensed Electrician & Maintenance',
    rating: 4.8,
    reviewCount: 210,
    hourlyRate: 4500,
    isVerified: true,
    licenseNumber: 'KE-EL-56782',
    yearsExperience: 10,
    distanceMiles: 1.2,
    responseTimeMin: 20,
    specialties: ['Fault diagnosis', 'Breaker replacement', 'Wiring & Sockets'],
    badges: ['Licensed & Insured', 'Local Expert'],
    phone: '+254 712 000222',
    completedJobs: 860,
    bio: 'Experienced electrician servicing Nairobi and neighboring counties.',
    location: {
      lat: -1.283333,
      lng: 36.816667,
      address: 'Nairobi CBD, Kenya'
    }
  }
];

// ---------------- DB-backed getters with graceful fallbacks ----------------
async function getPros(): Promise<VerifiedPro[]> {
  try {
    const rows = await prisma.verifiedPro.findMany();
    if (!rows || rows.length === 0) return initialPros;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar || '',
      category: r.category as any,
      title: r.title,
      rating: r.rating,
      reviewCount: r.reviewCount,
      hourlyRate: r.hourlyRate,
      isVerified: r.isVerified,
      licenseNumber: r.licenseNumber || '',
      yearsExperience: r.yearsExperience,
      distanceMiles: r.distanceMiles,
      responseTimeMin: r.responseTimeMin,
      specialties: r.specialties || [],
      badges: r.badges || [],
      phone: r.phone,
      completedJobs: r.completedJobs,
      bio: r.bio || '',
      location: { lat: r.lat, lng: r.lng, address: r.address }
    }));
  } catch (err) {
    console.warn('Failed to fetch pros from DB, falling back to in-memory:', err);
    return initialPros;
  }
}

async function getStores(): Promise<LocalStore[]> {
  try {
    const rows = await prisma.localStore.findMany({ include: { items: true } });
    if (!rows || rows.length === 0) return [] as LocalStore[];
    return rows.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type as any,
      logo: s.logo || '',
      coverImage: s.coverImage || '',
      rating: s.rating,
      reviewCount: s.reviewCount,
      distanceMiles: s.distanceMiles,
      deliveryEstimateMin: s.deliveryEstimateMin,
      deliveryFee: s.deliveryFee,
      minOrder: s.minOrder,
      address: s.address,
      isOpen: s.isOpen,
      items: s.items.map(it => ({
        id: it.id,
        name: it.name,
        category: it.category,
        price: it.price,
        unit: it.unit,
        image: it.image || '',
        inStock: it.inStock,
        description: it.description || ''
      }))
    }));
  } catch (err) {
    console.warn('Failed to fetch stores from DB:', err);
    return [] as LocalStore[];
  }
}

async function getDrivers(): Promise<Driver[]> {
  try {
    const rows = await prisma.driver.findMany();
    if (!rows || rows.length === 0) return [];
    return rows.map(d => ({
      id: d.id,
      name: d.name,
      avatar: d.avatar || '',
      vehicleType: d.vehicleType as any,
      vehiclePlate: d.vehiclePlate,
      rating: d.rating,
      completedDeliveries: d.completedDeliveries,
      phone: d.phone,
      currentLat: d.currentLat,
      currentLng: d.currentLng,
      isOnline: d.isOnline
    }));
  } catch (err) {
    console.warn('Failed to fetch drivers from DB:', err);
    return [];
  }
}

async function getOrders(): Promise<Order[]> {
  try {
    const rows = await prisma.order.findMany({ include: { provider: true, driver: true, store: true } });
    if (!rows || rows.length === 0) return [];
    return rows.map(o => ({
      id: o.id,
      type: o.type as any,
      title: o.title,
      category: (o.category as any) || undefined,
      status: o.status as any,
      createdAt: o.createdAt.toISOString(),
      tenantName: o.tenantName,
      tenantPhone: o.tenantPhone,
      tenantAddress: o.tenantAddress,
      apartmentUnit: o.apartmentUnit || undefined,

      providerId: o.providerId || undefined,
      providerName: o.provider ? o.provider.name : undefined,
      providerAvatar: o.provider ? o.provider.avatar : undefined,
      providerPhone: o.provider ? o.provider.phone : undefined,

      driverId: o.driverId || undefined,
      driverName: o.driver ? o.driver.name : undefined,
      driverAvatar: o.driver ? o.driver.avatar : undefined,
      driverVehicle: o.driver ? `${o.driver.vehicleType} (${o.driver.vehiclePlate})` : undefined,
      driverPhone: o.driver ? o.driver.phone : undefined,

      storeId: o.storeId || undefined,
      storeName: o.store ? o.store.name : undefined,
      storeType: o.store ? o.store.type : undefined,

      items: [],

      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      serviceFee: o.serviceFee,
      tax: o.tax,
      total: o.total,
      paymentMethod: (o.paymentMethod as any) || 'card',

      estimatedArrivalMin: o.estimatedArrivalMin,
      urgency: (o.urgency as any) || 'normal',
      scheduledFor: o.scheduledFor ? o.scheduledFor.toISOString() : undefined,
      notes: o.notes || '',

      tenantLocation: { lat: o.tenantLat || 0, lng: o.tenantLng || 0, label: o.tenantAddress },
      originLocation: { lat: o.originLat || 0, lng: o.originLng || 0, label: o.tenantAddress },
      currentLocation: { lat: o.currentLat || 0, lng: o.currentLng || 0 },

      messages: (o.messages as any) || []
    }));
  } catch (err) {
    console.warn('Failed to fetch orders from DB:', err);
    return [];
  }
}

// ---------------- Auth helpers & middleware ----------------
function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

function getTokenFromReq(req: Request) {
  // cookie-parser populates req.cookies
  const anyReq: any = req as any;
  if (anyReq.cookies && anyReq.cookies.session) return anyReq.cookies.session;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function authMiddleware(requiredRoles: string[] = []) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };
}

// ---------------- Auth routes ----------------
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body as { email: string; password: string; name?: string; role?: string };
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name: name || email.split('@')[0], role: (role as any) || 'tenant' } });
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // Set HTTP-only cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/' 
    });

    res.json({ success: true, data: { user: { id: user.id, email: user.email, role: user.role, name: user.name } } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // Set HTTP-only cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ success: true, data: { user: { id: user.id, email: user.email, role: user.role, name: user.name } } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('session', { path: '/' });
  res.json({ success: true });
});

// ---------------- API ROUTES (now preferring DB) ----------------

// Get all verified service pros
app.get('/api/services', async (req: Request, res: Response) => {
  const { category, search } = req.query;
  try {
    let results = await getPros();
    if (category && typeof category === 'string' && category !== 'all') {
      results = results.filter(pro => pro.category === category);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      results = results.filter(pro => pro.name.toLowerCase().includes(q) || pro.title.toLowerCase().includes(q) || pro.specialties.some(s => s.toLowerCase().includes(q)));
    }
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Get all nearby stores (Supermarkets & Pharmacies)
app.get('/api/stores', async (req: Request, res: Response) => {
  const { type, search } = req.query;
  try {
    let results = await getStores();
    if (type && typeof type === 'string' && type !== 'all') {
      results = results.filter(store => store.type === type);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      results = results.filter(store => store.name.toLowerCase().includes(q) || store.items.some(item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)));
    }
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch stores' });
  }
});

// Get available drivers
app.get('/api/drivers', async (req: Request, res: Response) => {
  try {
    const drivers = await getDrivers();
    res.json({ success: true, data: drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// Get orders (optionally filtered by role or tenant)
app.get('/api/orders', async (req: Request, res: Response) => {
  const { role, proId, driverId } = req.query;
  try {
    let filtered = await getOrders();

    if (role === 'provider' && proId) {
      filtered = filtered.filter(o => o.providerId === proId || (o.type === 'service' && o.status === 'pending'));
    } else if (role === 'driver' && driverId) {
      filtered = filtered.filter(o => o.driverId === driverId || (o.type !== 'service' && o.status === 'pending'));
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const orders = await getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// Create new order (service booking, grocery/pharmacy delivery, or ride/cargo dispatch)
app.post('/api/orders', async (req: Request, res: Response) => {
  const body = req.body as any;
  const newId = 'ORD-' + Math.floor(100 + Math.random() * 900);
  try {
    // Attempt to find assigned pro/driver in DB
    const assignedPro = body.providerId ? await prisma.verifiedPro.findUnique({ where: { id: body.providerId } }) : null;
    const assignedDriver = body.driverId ? await prisma.driver.findUnique({ where: { id: body.driverId } }) : (body.type === 'store_delivery' ? (await prisma.driver.findFirst()) : null);

    const messages = [
      {
        id: 'msg-init',
        sender: 'system',
        senderName: 'System',
        text: `Request initiated for ${body.title || 'order'}. We are coordinating with ${assignedPro?.name || assignedDriver?.name || 'available local team'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    const created = await prisma.order.create({
      data: {
        id: newId,
        type: body.type || 'service',
        title: body.title || 'On-Demand Service Request',
        category: body.category,
        status: (body.type === 'service' && !assignedPro) ? 'pending' : 'assigned',
        tenantName: body.tenantName || 'Tenant',
        tenantPhone: body.tenantPhone || '+254 123 456 789',
        tenantAddress: body.tenantAddress || 'Riverside Drive, Nairobi',
        apartmentUnit: body.apartmentUnit || undefined,

        providerId: assignedPro ? assignedPro.id : body.providerId,
        driverId: assignedDriver ? assignedDriver.id : body.driverId,
        storeId: body.storeId,

        subtotal: Number(body.subtotal) || 450.0,
        deliveryFee: Number(body.deliveryFee) || 0,
        serviceFee: Number(body.serviceFee) || 45.0,
        tax: Number(body.tax) || 39.0,
        total: Number(body.total) || 534.0,
        paymentMethod: body.paymentMethod || 'card',

        estimatedArrivalMin: body.estimatedArrivalMin || 20,
        urgency: body.urgency || 'normal',
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        notes: body.notes || '',

        tenantLat: body.tenantLocation?.lat ?? -1.286389,
        tenantLng: body.tenantLocation?.lng ?? 36.817223,
        originLat: assignedPro ? assignedPro.lat : (body.originLocation?.lat ?? -1.286389),
        originLng: assignedPro ? assignedPro.lng : (body.originLocation?.lng ?? 36.817223),
        currentLat: assignedDriver ? assignedDriver.currentLat : (body.currentLocation?.lat ?? -1.286389),
        currentLng: assignedDriver ? assignedDriver.currentLng : (body.currentLocation?.lng ?? 36.817223),

        messages: messages as any
      }
    });

    // Return mapped order shape
    const orders = await getOrders();
    const newOrder = orders.find(o => o.id === created.id) || null;
    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    console.error('Create order failed', err);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// Update order status (accept, dispatch, en_route, arrived, completed)
app.patch('/api/orders/:id/status', authMiddleware(['provider', 'driver', 'merchant']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, proId, driverId, currentLat, currentLng } = req.body as any;
  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Order not found' });

    const newMessages = (existing.messages as any) || [];
    if (status) {
      newMessages.push({ id: 'msg-status-' + Date.now(), sender: 'system', senderName: 'Dispatch Status', text: `Status updated to: ${status.replace('_', ' ').toUpperCase()}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: status || existing.status,
        providerId: proId || existing.providerId,
        driverId: driverId || existing.driverId,
        currentLat: currentLat || existing.currentLat,
        currentLng: currentLng || existing.currentLng,
        messages: newMessages as any
      }
    });

    const orders = await getOrders();
    const mapped = orders.find(o => o.id === updated.id);
    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// Add message to order chat
app.post('/api/orders/:id/messages', authMiddleware(), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { sender, senderName, text } = req.body as any;
  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Order not found' });

    const newMessage = { id: 'msg-' + Date.now(), sender: sender || (req.user?.role === 'provider' ? 'provider' : req.user?.role === 'driver' ? 'driver' : 'tenant'), senderName: senderName || req.user?.email || 'Tenant', text: text || '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };

    const messages = (existing.messages as any) || [];
    messages.push(newMessage);

    const updated = await prisma.order.update({ where: { id }, data: { messages: messages as any } });
    res.json({ success: true, data: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// ---------------- AI & Vite middleware remain mostly unchanged ----------------

// AI Smart Diagnosis & Cost Estimator Endpoint (Gemini API server-side)
app.post('/api/ai/diagnose', async (req: Request, res: Response) => {
  const { issueDescription, category } = req.body as { issueDescription: string; category?: string };

  if (!issueDescription || typeof issueDescription !== 'string') {
    return res.status(400).json({ success: false, error: 'Description is required' });
  }

  try {
    const gemini = getGemini();
    if (gemini) {
      const prompt = `You are a licensed Master Tradesperson and Building Property Manager assistant.\nThe tenant is reporting this home issue:\n"${issueDescription}"\nSelected category hint: ${category || 'Unknown'}\n\nAnalyze this issue and return a valid JSON object strictly matching this schema (do NOT include markdown code fences or backticks, just raw JSON):\n{\n  "diagnosis": "concise technical summary of what likely happened (max 25 words)",\n  "urgency": "emergency" or "high" or "medium" or "standard",\n  "recommendedTrade": "plumbing" or "electrical" or "cleaning" or "carpentry" or "appliances",\n  "estimatedCostRange": "$XX - $YY",\n  "estimatedTimeHours": "1-2 hours",\n  "safetyWarning": "Immediate safety action the tenant should take right now (e.g. shut off shutoff valve, flip breaker #4, do not touch water near outlet)",\n  "recommendedSpecialty": "e.g. P-Trap & Snaking, GFCI Breaker Diagnostics, Sanitization",\n  "materialsLikelyNeeded": ["item 1", "item 2"]\n}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsed });
    }
  } catch (err) {
    console.warn('Gemini diagnosis fallback used due to:', err);
  }

  // Graceful rule-based fallback
  const lower = (req.body.issueDescription || '').toLowerCase();
  let trade = category || 'plumbing';
  let urgency = 'medium';
  let safety = 'Turn off the affected fixture or switch if safe to do so.';
  let cost = 'Ksh650 - Ksh1100';

  if (lower.includes('leak') || lower.includes('water') || lower.includes('pipe') || lower.includes('clog') || lower.includes('toilet') || lower.includes('sink')) {
    trade = 'plumbing';
    urgency = lower.includes('flood') || lower.includes('burst') ? 'emergency' : 'high';
    safety = 'Locate and turn the clockwise shutoff valve beneath the fixture or at the main apartment riser.';
    cost = 'Ksh750 - Ksh1400';
  } else if (lower.includes('spark') || lower.includes('breaker') || lower.includes('power') || lower.includes('shock') || lower.includes('outlet') || lower.includes('wire')) {
    trade = 'electrical';
    urgency = lower.includes('spark') || lower.includes('smoke') ? 'emergency' : 'high';
    safety = 'Do not touch wet cords or outlets. Switch off the relevant sub-breaker in your panel immediately.';
    cost = 'Ksh800 - Ksh1600';
  } else if (lower.includes('clean') || lower.includes('mold') || lower.includes('stain') || lower.includes('dust') || lower.includes('move')) {
    trade = 'cleaning';
    urgency = 'standard';
    safety = 'Keep windows ventilated if handling strong cleaning odors.';
    cost = 'Ksh480 - Ksh950';
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

// Lazy Gemini AI Client Initialization
let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}
