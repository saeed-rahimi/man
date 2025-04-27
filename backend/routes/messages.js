const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// همه مسیرها نیاز به احراز هویت دارند
router.use(authMiddleware.protect);

// ارسال پیام جدید
router.post('/', messageController.sendMessage);

// دریافت تعداد پیام‌های خوانده نشده
router.get('/unread-count', messageController.getUnreadCount);

// دریافت لیست گفتگوها
router.get('/conversations', messageController.getConversations);

// دریافت پیام‌های بین دو کاربر
router.get('/conversation/:userId', messageController.getConversation);

module.exports = router; 