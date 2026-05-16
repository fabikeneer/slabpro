// index.js — Servidor principal de SlabPro
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const presupuestosRouter = require('./routes/presupuestos');
const clientesRouter     = require('./routes/clientes');
const nominaRouter       = require('./routes/nomina');
const proyectosRouter    = require('./routes/proyectos');
const gastosRouter       = require('./routes/gastos');
const authRouter         = require('./routes/authRoutes');
const dashboardRouter    = require('./routes/dashboard');
const configRouter       = require('./routes/config.routes');
const exchangeRateService = require('./services/exchangeRate');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],  // Vite dev server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rutas ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'SlabPro API', timestamp: new Date().toISOString() });
});

app.use('/api/presupuestos', presupuestosRouter);
app.use('/api/clientes',     clientesRouter);
app.use('/api/nomina',       nominaRouter);
app.use('/api/proyectos',    proyectosRouter);
app.use('/api/gastos',       gastosRouter);
app.use('/api/auth',         authRouter);
app.use('/api/dashboard',    dashboardRouter);
app.use('/api/config',       configRouter);

app.get('/api/exchange-rate', (req, res) => {
  res.json(exchangeRateService.getRate());
});

app.post('/api/exchange-rate/force', async (req, res) => {
  await exchangeRateService.forceUpdate();
  res.json({ success: true, message: 'Actualización completada' });
});

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error Handler global ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// ── Iniciar servidor ────────────────────────────────────────────────────────
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
  
  // Arrancar polling de tasa de cambio
  exchangeRateService.startPolling();
});
