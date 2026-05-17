const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definido en .env — servidor detenido.');
  process.exit(1);
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

module.exports = authMiddleware;
