const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/login', authController.login);
router.post('/recover/methods', authController.getRecoveryMethods);
router.post('/recover/question/random', authController.getRandomQuestion);
router.post('/recover/email/send-code', authController.sendRecoveryCode);
router.post('/recover/email/verify-code', authController.verifyCode);
router.post('/recover/reset', authController.resetPassword);

// Rutas protegidas (requieren token)
router.put('/settings/password', authMiddleware, authController.changePassword);
router.put('/settings/security-questions', authMiddleware, authController.updateSecurityQuestions);
router.put('/settings/email', authMiddleware, authController.updateEmail);
router.get('/settings/me', authMiddleware, authController.getProfile);

module.exports = router;
