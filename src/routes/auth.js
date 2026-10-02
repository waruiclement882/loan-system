const express = require('express');
const router = express.Router();
const { register, login, verifyOtp, resendOtp, forgotPassword, resetPassword, getUsers } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/users', verifyToken, requireRole('admin'), getUsers);

module.exports = router;
