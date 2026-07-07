const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

router.post('/login', rateLimiter({ windowMs: 60 * 1000, maxRequests: 20, message: 'Too many login attempts. Please try again later.' }), authController.login);
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.post('/refresh', authController.refreshToken);
router.post('/refresh-token', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.put('/change-password', protect, authController.changePassword);

module.exports = router;
