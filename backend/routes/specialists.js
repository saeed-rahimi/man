const express = require('express');
const User = require('../models/User');
const Job = require('../models/Job');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// همه مسیرها نیاز به احراز هویت دارند
router.use(authMiddleware.protect);
// محدود کردن مسیرها فقط برای متخصصان
router.use(authMiddleware.restrictTo('specialist'));

// دریافت درخواست‌های کار متخصص
router.get('/my-applications', async (req, res, next) => {
  try {
    const specialistId = req.user.id;
    
    // یافتن کارهایی که متخصص درخواست داده است
    const jobs = await Job.find({
      'applicants.specialist': specialistId
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'employer',
      select: 'name companyName phone'
    });
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
});

// دریافت کارهای در حال انجام متخصص
router.get('/my-jobs', async (req, res, next) => {
  try {
    const specialistId = req.user.id;
    
    // یافتن کارهایی که متخصص به آنها اختصاص داده شده است
    const jobs = await Job.find({
      specialist: specialistId,
      status: { $in: ['IN_PROGRESS', 'COMPLETED'] }
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'employer',
      select: 'name companyName phone'
    });
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
});

// جستجوی متخصصان
router.get('/search', async (req, res, next) => {
  try {
    const filters = {};
    
    // افزودن فیلترها براساس مهارت‌ها
    if (req.query.skill) {
      filters.skills = { $regex: req.query.skill, $options: 'i' };
    }
    
    // فیلتر براساس شهر
    if (req.query.city) {
      filters['location.city'] = req.query.city;
    }
    
    // فیلتر براساس استان
    if (req.query.province) {
      filters['location.province'] = req.query.province;
    }
    
    // فیلتر براساس تجربه کاری (حداقل)
    if (req.query.minExperience) {
      filters.experience = { $gte: parseInt(req.query.minExperience, 10) };
    }
    
    // فیلتر براساس امتیاز (حداقل)
    if (req.query.minRating) {
      filters.rating = { $gte: parseFloat(req.query.minRating) };
    }
    
    // افزودن فیلتر نوع کاربر (فقط متخصصان)
    filters.userType = 'specialist';
    
    // فیلتر برای متخصصان در دسترس
    if (req.query.available === 'true') {
      filters.availability = true;
    }
    
    // تنظیم مرتب‌سازی
    const sort = {};
    if (req.query.sort) {
      const parts = req.query.sort.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      // مرتب‌سازی پیش‌فرض براساس امتیاز
      sort.rating = -1;
    }
    
    // تنظیم صفحه‌بندی
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const specialists = await User.find(filters)
      .select('name phone location skills experience age education availability rating')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      count: specialists.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: specialists
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 