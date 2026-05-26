// index.js — Servidor principal de SlabPro
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const presupuestosRouter  = require('./routes/presupuestos');
const clientesRouter      = require('./routes/clientes');
const nominaRouter        = require('./routes/nomina');
const proyectosRouter     = require('./routes/proyectos');
const gastosRouter        = require('./routes/gastos');
const authRouter          = require('./routes/authRoutes');
const dashboardRouter     = require('./routes/dashboard');
const configRouter        = require('./routes/config.routes');
const exchangeRateService = require('./services/exchangeRate');
const authMiddleware      = require('./middlewares/authMiddleware');
const ensureUsuariosUnique = require('./migrations/ensureUsuariosUnique');

const app  = express();
const PORT = process.env.PORT || 3001;

// Render / proxies reversos (rate-limit y IP reales)
app.set('trust proxy', 1);

// ── Seguridad HTTP ───────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS (Vercel + local) ────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

console.log('[INFO] CORS orígenes permitidos:', allowedOrigins.join(', ') || '(ninguno)');

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    
    // Permitir acceso desde la red local (para probar en teléfonos)
    if (normalized.startsWith('http://192.168.') || 
        normalized.startsWith('http://10.') || 
        normalized.startsWith('http://172.')) {
      return callback(null, true);
    }

    console.warn('[CORS] Origen rechazado:', origin);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const capitalizeMiddleware = require('./middlewares/capitalize');
app.use(capitalizeMiddleware);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Por favor espera un momento.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// ── Rutas públicas ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const pool = require('./db');
  const dbOk = pool.isDbConnected && pool.isDbConnected();
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    server: 'SlabPro API',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(payload);
});

app.use('/api/auth', authRouter);

// ── Rutas protegidas ─────────────────────────────────────────────────────────
app.use('/api/presupuestos', authMiddleware, presupuestosRouter);
app.use('/api/clientes',     authMiddleware, clientesRouter);
app.use('/api/nomina',       authMiddleware, nominaRouter);
app.use('/api/proyectos',    authMiddleware, proyectosRouter);
app.use('/api/gastos',       authMiddleware, gastosRouter);
app.use('/api/dashboard',    authMiddleware, dashboardRouter);
app.use('/api/config',       authMiddleware, configRouter);

app.get('/api/exchange-rate', (req, res) => {
  res.json(exchangeRateService.getRate());
});

app.post('/api/exchange-rate/force', authMiddleware, async (req, res) => {
  await exchangeRateService.forceUpdate();
  res.json({ success: true, message: 'Actualización completada' });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error Handler global ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// ── Iniciar servidor ─────────────────────────────────────────────────────────
ensureUsuariosUnique();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[INFO] SlabPro Server corriendo en 0.0.0.0:${PORT}`);
  console.log(`[INFO] Endpoints disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/presupuestos`);
  console.log(`   POST http://localhost:${PORT}/api/presupuestos`);
  console.log(`   GET  http://localhost:${PORT}/api/clientes`);
  console.log(`   POST http://localhost:${PORT}/api/nomina/registrar`);
  console.log(`   GET  http://localhost:${PORT}/api/proyectos`);
  console.log(`   POST http://localhost:${PORT}/api/proyectos`);
  console.log(`   GET  http://localhost:${PORT}/api/proyectos/activos`);
  console.log(`   GET  http://localhost:${PORT}/api/exchange-rate`);

  exchangeRateService.startPolling();
});

// ── Cierre Elegante (Graceful Shutdown) ──────────────────────────────────────
const dbPool = require('./db');
const redisClient = require('./redis');

async function gracefulShutdown(signal) {
  console.log(`\n[INFO] Recibida señal ${signal}. Cerrando recursos elegantemente...`);
  try {
    if (dbPool) {
      await dbPool.end();
      console.log('[OK] Pool de conexiones a MySQL/TiDB cerrado.');
    }
    
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('[OK] Conexión a Redis cerrada.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Fallo durante el cierre:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
