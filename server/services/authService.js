const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('Nodemailer no está instalado. Fallback a consola para envío de correos.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// Almacén en memoria para los códigos de recuperación: { cedula: { code, expires, verified } }
const resetCodes = new Map();

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

async function assertEmailAvailable(email, excludeUserId = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const sql = excludeUserId
    ? 'SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = ? AND id != ? LIMIT 1'
    : 'SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = ? LIMIT 1';
  const params = excludeUserId ? [normalized, excludeUserId] : [normalized];
  const [rows] = await pool.query(sql, params);
  if (rows.length > 0) throw new Error('EMAIL_YA_REGISTRADO');
  return normalized;
}

const authService = {
  // Login por cédula
  async login(cedula, password) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
    if (rows.length === 0) throw new Error('CREDENCIALES_INVALIDAS');

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error('CREDENCIALES_INVALIDAS');

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nombre: user.nombre, cedula: user.cedula },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token, user: { id: user.id, usuario: user.usuario, nombre: user.nombre, cedula: user.cedula } };
  },

  // Obtener métodos de recuperación disponibles para un usuario
  async getRecoveryMethods(cedula) {
    const [rows] = await pool.query('SELECT email, pregunta_seguridad FROM usuarios WHERE cedula = ?', [cedula]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');
    
    const user = rows[0];
    let questions = [];
    try {
      questions = JSON.parse(user.pregunta_seguridad);
    } catch {
      questions = [user.pregunta_seguridad];
    }

    return {
      hasQuestions: questions.length > 0,
      hasEmail: !!user.email,
      emailHint: user.email ? user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp1 + gp2.replace(/./g, '*') + gp3) : null
    };
  },

  // Obtener pregunta de seguridad aleatoria
  async getRandomSecurityQuestion(cedula) {
    const [rows] = await pool.query('SELECT pregunta_seguridad FROM usuarios WHERE cedula = ?', [cedula]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');
    
    let questions = [];
    try {
      questions = JSON.parse(rows[0].pregunta_seguridad);
    } catch {
      questions = [rows[0].pregunta_seguridad];
    }

    if (questions.length === 0) throw new Error('NO_PREGUNTAS');
    
    // Escoger una al azar
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    return randomQuestion;
  },

  // Enviar código de recuperación por correo
  async sendRecoveryCode(cedula, emailIngresado) {
    const [rows] = await pool.query('SELECT email FROM usuarios WHERE cedula = ?', [cedula]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');
    
    const realEmail = rows[0].email;
    if (!realEmail || realEmail.toLowerCase() !== emailIngresado.toLowerCase()) {
      throw new Error('EMAIL_NO_COINCIDE');
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
    resetCodes.set(cedula, { code, expires: Date.now() + 10 * 60 * 1000, verified: false });

    // Intentar obtener el logo de la empresa para el correo
    let logoHtml = '';
    try {
      const [config] = await pool.query('SELECT logo_data, nombre FROM configuracion_empresa LIMIT 1');
      if (config.length > 0 && config[0].logo_data) {
        logoHtml = `<div style="text-align: center; margin-bottom: 20px;">
                      <img src="${config[0].logo_data}" alt="Logo" style="max-height: 80px; width: auto;" />
                    </div>`;
      }
    } catch (e) {
      console.error('Error obteniendo logo para correo:', e);
    }

    if (nodemailer && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      try {
        await transporter.sendMail({
          from: `"SlabPro System" <${process.env.SMTP_USER}>`,
          to: realEmail,
          subject: 'Código de Recuperación de SlabPro',
          text: `El código de recuperación de SlabPro es: ${code}\nEste código expirará en 10 minutos.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
              ${logoHtml}
              <h2 style="color: #d97706; text-align: center;">Recuperación de Contraseña</h2>
              <p style="font-size: 16px;">El código de recuperación de SlabPro es:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a; background: #f3f4f6; padding: 10px 20px; border-radius: 8px;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center;">Este código expirará en 10 minutos.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
              <p style="font-size: 12px; color: #999; text-align: center;">Si no solicitaste este código, ignora este correo.</p>
            </div>
          `
        });
        console.log(`[MAIL] Código enviado a ${realEmail}`);
      } catch (err) {
        console.error('Error enviando correo SMTP:', err);
        console.log(`[SIMULACIÓN] Código para ${realEmail}: ${code}`);
      }
    } else {
      console.log(`[SIMULACIÓN] Código generado para ${realEmail}: ${code}`);
    }
  },

  // Verificar código de correo
  async verifyCode(cedula, code) {
    const record = resetCodes.get(cedula);
    if (!record) throw new Error('CODIGO_NO_SOLICITADO');
    if (record.expires < Date.now()) throw new Error('CODIGO_EXPIRADO');
    if (record.code !== code) throw new Error('CODIGO_INVALIDO');
    
    record.verified = true;
    return true;
  },

  // Restablecer contraseña
  async resetPassword(cedula, tipoRecuperacion, payload, nuevaPassword) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');
    const user = rows[0];

    if (tipoRecuperacion === 'pregunta') {
      const { pregunta, respuesta } = payload;
      let questions = [];
      let hashes = [];
      try {
        questions = JSON.parse(user.pregunta_seguridad);
        hashes = JSON.parse(user.respuesta_hash);
      } catch {
        questions = [user.pregunta_seguridad];
        hashes = [user.respuesta_hash];
      }

      const idx = questions.indexOf(pregunta);
      if (idx === -1) throw new Error('PREGUNTA_INVALIDA');

      const match = await bcrypt.compare(respuesta.trim().toLowerCase(), hashes[idx]);
      if (!match) throw new Error('RESPUESTA_INVALIDA');

    } else if (tipoRecuperacion === 'email') {
      const record = resetCodes.get(cedula);
      if (!record || !record.verified) throw new Error('CODIGO_NO_VERIFICADO');
      resetCodes.delete(cedula);
    } else {
      throw new Error('METODO_INVALIDO');
    }

    const newPasswordHash = await bcrypt.hash(nuevaPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE cedula = ?', [newPasswordHash, cedula]);
    return true;
  },

  // Cambiar contraseña desde config
  async changePassword(userId, passwordActual, nuevaPassword) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');

    const user = rows[0];
    const match = await bcrypt.compare(passwordActual, user.password_hash);
    if (!match) throw new Error('PASSWORD_INCORRECTO');

    const newHash = await bcrypt.hash(nuevaPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return true;
  },

  // Actualizar preguntas y respuestas de seguridad
  async updateSecurityQuestions(userId, passwordActual, questionsArray) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');

    const user = rows[0];
    const match = await bcrypt.compare(passwordActual, user.password_hash);
    if (!match) throw new Error('PASSWORD_INCORRECTO');

    const preguntas = [];
    const hashes = [];

    for (const q of questionsArray) {
      preguntas.push(q.pregunta);
      hashes.push(await bcrypt.hash(q.respuesta.trim().toLowerCase(), 10));
    }

    await pool.query(
      'UPDATE usuarios SET pregunta_seguridad = ?, respuesta_hash = ? WHERE id = ?',
      [JSON.stringify(preguntas), JSON.stringify(hashes), userId]
    );
    return true;
  },

  // Actualizar email
  async updateEmail(userId, passwordActual, email) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');

    const match = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!match) throw new Error('PASSWORD_INCORRECTO');

    const normalizedEmail = await assertEmailAvailable(email, userId);
    await pool.query('UPDATE usuarios SET email = ? WHERE id = ?', [normalizedEmail, userId]);
    return true;
  },

  // Obtener perfil del usuario
  async getProfile(userId) {
    const [rows] = await pool.query(
      'SELECT id, usuario, nombre, cedula, pregunta_seguridad, email FROM usuarios WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) throw new Error('USUARIO_NO_ENCONTRADO');
    
    let questions = [];
    try {
      questions = JSON.parse(rows[0].pregunta_seguridad);
    } catch {
      questions = [rows[0].pregunta_seguridad];
    }
    
    return { ...rows[0], pregunta_seguridad: questions };
  }
};

module.exports = authService;
