// index.js — Servidor principal de SlabPro
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

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

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad HTTP ───────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Permitir peticiones sin origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  res.json({ status: 'ok', server: 'SlabPro API', timestamp: new Date().toISOString() });
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
app.listen(PORT, () => {
  console.log(`[INFO] SlabPro Server corriendo en http://localhost:${PORT}`);
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
