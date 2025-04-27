const express = require('express');
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// همه مسیرها نیاز به احراز هویت دارند
router.use(authMiddleware.protect);
// محدود کردن مسیرها فقط برای کارفرمایان
router.use(authMiddleware.restrictTo('employer'));

// دریافت کارهای کارفرما
router.get('/my-jobs', async (req, res, next) => {
  try {
    // تغییر پارامترها برای فیلتر کردن کارها براساس شناسه کارفرما
    req.query.employer = req.user.id;
    
    // فراخوانی کنترلر getAllJobs با پارامترهای جدید
    next();
  } catch (error) {
    next(error);
  }
}, jobController.getAllJobs);

// دریافت درخواست های کار (به زودی اضافه خواهد شد)
// router.get('/job-requests', employerController.getJobRequests);

module.exports = router; 