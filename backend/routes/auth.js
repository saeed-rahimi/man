const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// مسیر تست اتصال به سرور - بدون نیاز به احراز هویت
router.get('/test-connection', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'سرور بک‌اند به درستی در حال اجرا می‌باشد',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// مسیرهای عمومی (بدون نیاز به احراز هویت)
router.post('/register', authController.register);
router.post('/login', authController.login);

// مسیرهای محافظت شده (نیاز به احراز هویت)
router.use(authMiddleware.protect);

router.get('/me', authController.getMe);
router.patch('/updateMe', authController.updateMe);
router.patch('/updatePassword', authController.updatePassword);

module.exports = router; 