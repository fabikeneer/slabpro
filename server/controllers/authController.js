const authService = require('../services/authService');

const authController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { cedula, password } = req.body;
      if (!cedula || !password) return res.status(400).json({ success: false, message: 'Cédula y contraseña son requeridas.' });
      const { token, user } = await authService.login(cedula, password);
      res.cookie('slabpro_token', token, {
        httpOnly: true,
        secure: true, // Requerido para sameSite: 'none'
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24h
      });
      // Token en body: Safari/iOS bloquea cookies cross-site (Vercel ↔ Render)
      res.json({ success: true, user, token });
    } catch (error) {
      if (error.message === 'CREDENCIALES_INVALIDAS') return res.status(401).json({ success: false, message: 'Cédula o contraseña incorrectas.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    res.clearCookie('slabpro_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true, message: 'Sesión cerrada.' });
  },

  // POST /api/auth/recover/methods
  async getRecoveryMethods(req, res) {
    try {
      const { cedula } = req.body;
      if (!cedula) return res.status(400).json({ success: false, message: 'Cédula requerida.' });
      const methods = await authService.getRecoveryMethods(cedula);
      res.json({ success: true, ...methods });
    } catch (error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') return res.status(404).json({ success: false, message: 'Cédula no encontrada.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // POST /api/auth/recover/question/random
  async getRandomQuestion(req, res) {
    try {
      const { cedula } = req.body;
      if (!cedula) return res.status(400).json({ success: false, message: 'Cédula requerida.' });
      const pregunta = await authService.getRandomSecurityQuestion(cedula);
      res.json({ success: true, pregunta });
    } catch (error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') return res.status(404).json({ success: false, message: 'Cédula no encontrada.' });
      if (error.message === 'NO_PREGUNTAS') return res.status(400).json({ success: false, message: 'No hay preguntas de seguridad configuradas.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // POST /api/auth/recover/email/send-code
  async sendRecoveryCode(req, res) {
    try {
      const { cedula, email } = req.body;
      if (!cedula || !email) return res.status(400).json({ success: false, message: 'Cédula y correo son requeridos.' });
      await authService.sendRecoveryCode(cedula, email);
      res.json({ success: true, message: 'Código enviado.' });
    } catch (error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') return res.status(404).json({ success: false, message: 'Cédula no encontrada.' });
      if (error.message === 'EMAIL_NO_COINCIDE') return res.status(400).json({ success: false, message: 'El correo no coincide con el registrado en el sistema.' });
      if (error.message === 'ERROR_ENVIANDO_CORREO') return res.status(500).json({ success: false, message: 'Error al intentar enviar el correo. Por favor, intenta de nuevo o contacta soporte.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // POST /api/auth/recover/email/verify-code
  async verifyCode(req, res) {
    try {
      const { cedula, code } = req.body;
      if (!cedula || !code) return res.status(400).json({ success: false, message: 'Faltan datos.' });
      await authService.verifyCode(cedula, code);
      res.json({ success: true, message: 'Código verificado.' });
    } catch (error) {
      if (error.message === 'CODIGO_NO_SOLICITADO') return res.status(400).json({ success: false, message: 'Debe solicitar un código primero.' });
      if (error.message === 'CODIGO_EXPIRADO') return res.status(400).json({ success: false, message: 'El código ha expirado.' });
      if (error.message === 'CODIGO_INVALIDO') return res.status(400).json({ success: false, message: 'Código incorrecto.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // POST /api/auth/recover/reset
  async resetPassword(req, res) {
    try {
      const { cedula, tipoRecuperacion, payload, nuevaPassword } = req.body;
      if (!cedula || !tipoRecuperacion || !nuevaPassword) return res.status(400).json({ success: false, message: 'Faltan datos.' });
      await authService.resetPassword(cedula, tipoRecuperacion, payload, nuevaPassword);
      res.json({ success: true, message: 'Contraseña restablecida.' });
    } catch (error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') return res.status(404).json({ success: false, message: 'Cédula no encontrada.' });
      if (error.message === 'PREGUNTA_INVALIDA') return res.status(400).json({ success: false, message: 'La pregunta no coincide con las del usuario.' });
      if (error.message === 'RESPUESTA_INVALIDA') return res.status(401).json({ success: false, message: 'La respuesta de seguridad es incorrecta.' });
      if (error.message === 'CODIGO_NO_VERIFICADO') return res.status(401).json({ success: false, message: 'El código de correo no ha sido verificado.' });
      if (error.message === 'METODO_INVALIDO') return res.status(400).json({ success: false, message: 'Método de recuperación inválido.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // PUT /api/auth/settings/password
  async changePassword(req, res) {
    try {
      const { passwordActual, nuevaPassword } = req.body;
      if (!passwordActual || !nuevaPassword) return res.status(400).json({ success: false, message: 'Faltan campos.' });
      if (nuevaPassword.length < 6) return res.status(400).json({ success: false, message: 'Mínimo 6 caracteres.' });
      await authService.changePassword(req.user.id, passwordActual, nuevaPassword);
      res.json({ success: true, message: 'Contraseña actualizada.' });
    } catch (error) {
      if (error.message === 'PASSWORD_INCORRECTO') return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // PUT /api/auth/settings/security-questions
  async updateSecurityQuestions(req, res) {
    try {
      const { passwordActual, questions } = req.body;
      if (!passwordActual || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: 'Faltan campos o preguntas.' });
      }
      await authService.updateSecurityQuestions(req.user.id, passwordActual, questions);
      res.json({ success: true, message: 'Preguntas de seguridad actualizadas.' });
    } catch (error) {
      if (error.message === 'PASSWORD_INCORRECTO') return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // PUT /api/auth/settings/email
  async updateEmail(req, res) {
    try {
      const { passwordActual, email } = req.body;
      if (!passwordActual) return res.status(400).json({ success: false, message: 'Contraseña requerida.' });
      await authService.updateEmail(req.user.id, passwordActual, email);
      res.json({ success: true, message: 'Correo actualizado.' });
    } catch (error) {
      if (error.message === 'PASSWORD_INCORRECTO') return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta.' });
      if (error.message === 'EMAIL_YA_REGISTRADO') return res.status(409).json({ success: false, message: 'Este correo ya está registrado en otro usuario.' });
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  },

  // GET /api/auth/settings/me
  async getProfile(req, res) {
    try {
      const profile = await authService.getProfile(req.user.id);
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno.' });
    }
  }
};

module.exports = authController;
