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
import driversRouter from './server/drivers';

const app = express();
const PORT = 3000;

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.APP_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
<<<<<<< HEAD

// --------------------------------------------------
// KENYA-LOCALIZED FALLBACK DATA
// --------------------------------------------------
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
=======
>>>>>>> origin/main

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

function signToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: '7d',
  });
}

function getTokenFromReq(req: Request) {
  const anyReq = req as any;

  if (anyReq.cookies && anyReq.cookies.session) {
    return anyReq.cookies.session;
  }

  const auth = req.headers.authorization;

  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  return null;
}

function authMiddleware(requiredRoles: string[] = []) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const token = getTokenFromReq(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization token',
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(req.user.role)
      ) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: insufficient role',
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  };
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Community Delivery API is running',
  });
});

// --------------------------------------------------
// AUTH - REGISTER
// --------------------------------------------------

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
        role: role || 'tenant',
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);

    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

// --------------------------------------------------
// AUTH - LOGIN
// --------------------------------------------------

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// --------------------------------------------------
// AUTH - ME
// --------------------------------------------------

app.get(
  '/api/auth/me',
  authMiddleware(),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error('Auth me error:', err);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch current user',
      });
    }
  }
);

// --------------------------------------------------
// AUTH - LOGOUT
// --------------------------------------------------

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('session');

  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// --------------------------------------------------
// EXISTING DRIVER DATA
// --------------------------------------------------

async function getDrivers(): Promise<Driver[]> {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return drivers as unknown as Driver[];
  } catch (error) {
    console.error('Failed to fetch drivers:', error);

    return [];
  }
}

app.get('/api/drivers', async (_req: Request, res: Response) => {
  try {
    const drivers = await getDrivers();

    res.json({
      success: true,
      data: drivers,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch drivers',
    });
  }
});

// --------------------------------------------------
// DRIVER ONBOARDING / KYC ROUTES
// --------------------------------------------------
//
// This adds:
// POST   /api/drivers/apply
// GET    /api/drivers/pending
// PATCH  /api/drivers/:id/approve
// PATCH  /api/drivers/:id/reject
// GET    /api/drivers/me
//
// It does NOT replace the existing GET /api/drivers above.
// --------------------------------------------------

app.use('/api/drivers', driversRouter);

// --------------------------------------------------
// YOUR EXISTING ORDER / OTHER API ROUTES
// --------------------------------------------------
//
// KEEP YOUR EXISTING ORDER, PROVIDER, MERCHANT,
// AI AND OTHER ROUTES HERE.
//
// Do NOT delete those routes from your original
// server.ts. Keep everything that was already below
// this section.
// --------------------------------------------------

// Example:
// app.get('/api/orders', ...);
// app.post('/api/orders', authMiddleware(), ...);
// app.patch('/api/orders/:id/status', authMiddleware(), ...);

// --------------------------------------------------
// VITE
// --------------------------------------------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Community Delivery running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
