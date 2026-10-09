import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Security Headers
app.use(helmet());

// CORS configuration (supports credentials for httpOnly cookies & GitHub Pages)
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or direct API tests)
      if (!requestOrigin) return callback(null, true);
      if (
        requestOrigin === env.CLIENT_URL ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1') ||
        requestOrigin.endsWith('.github.io') ||
        requestOrigin === 'https://selvamuthumeenakchi.github.io'
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for hackathon demo access
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Cookie & Body Parsing
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this client. Please slow down.',
    },
  },
});

app.use('/api/', apiLimiter);

// Liveness Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Personal Health Copilot API',
    version: '1.0.0',
  });
});

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Global Error Handler
app.use(errorHandler);
