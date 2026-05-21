const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definido en .env — servidor detenido.');
  process.exit(1);
}

const authMiddleware = (req, res, next) => {
  // Primero busca en cookies, si no existe, busca en headers (para compatibilidad)
  let token = req.cookies?.slabpro_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

module.exports = authMiddleware;
