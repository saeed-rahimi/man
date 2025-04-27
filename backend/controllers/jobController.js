const Job = require("../models/Job");
const User = require("../models/User");
// exports.setjob = async (req, res, next) => {
//   try {
//     const newUser = await User.create(req.body);

//     jwtUtils.createSendToken(newUser, 201, res);
//   } catch (error) {
//     next(error);
//   }
// };
// دریافت همه کارها
exports.getAllJobs = async (req, res, next) => {
  try {
    // پارامترهای فیلتر
    const filters = {};

    if (req.query.jobType) {
      filters.jobType = req.query.jobType;
    }

    if (req.query.city) {
      filters["location.city"] = req.query.city;
    }

    if (req.query.status) {
      filters.status = req.query.status;
    } else {
      // به صورت پیش‌فرض فقط کارهای باز نمایش داده شوند
      filters.status = "OPEN";
    }

    // جستجو براساس عنوان
    if (req.query.search) {
      filters.title = { $regex: req.query.search, $options: "i" };
    }

    // مرتب‌سازی
    const sort = {};
    if (req.query.sort) {
      const parts = req.query.sort.split(":");
      sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
    } else {
      // مرتب‌سازی پیش‌فرض براساس تاریخ ایجاد (جدیدترین)
      sort.createdAt = -1;
    }

    // صفحه‌بندی
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // دریافت کارها با پوپولیت کردن اطلاعات کارفرما
    const jobs = await Job.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "employer",
        select: "name companyName phone",
      })
      .populate({
        path: "specialist",
        select: "name phone",
      });

    // تعداد کل نتایج
    const total = await Job.countDocuments(filters);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

// دریافت کارهای قابل دسترس برای متخصص (کارهایی که هنوز درخواست نداده)
exports.getAvailableJobs = async (req, res, next) => {
  try {
    const specialistId = req.user._id;
    console.log(specialistId);

    // یافتن کارهایی که متخصص در آنها شرکت نکرده است
    const jobs = await Job.find({
      status: "OPEN",
      "applicants.specialist": { $ne: specialistId },
      specialist: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "employer",
        select: "name companyName",
      });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

// دریافت یک کار با شناسه
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate({
        path: "employer",
        select: "name companyName phone location rating",
      })
      .populate({
        path: "specialist",
        select: "name phone location rating skills experience",
      })
      .populate({
        path: "applicants.specialist",
        select: "name phone location rating skills experience",
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// ایجاد کار جدید
exports.createJob = async (req, res, next) => {
  try {
    // اضافه کردن شناسه کارفرما به اطلاعات کار
    req.body.employer = req.user.id;

    const newJob = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: newJob,
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی کار
exports.updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    // فقط کارفرمای کار می‌تواند آن را بروزرسانی کند
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به بروزرسانی این کار نیستید",
      });
    }

    // اگر کار در وضعیت باز نیست، نمی‌توان آن را تغییر داد
    if (job.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "فقط کارهای باز قابل ویرایش هستند",
      });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// حذف کار
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    // فقط کارفرمای کار می‌تواند آن را حذف کند
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به حذف این کار نیستید",
      });
    }

    // اگر کار در وضعیت باز نیست، نمی‌توان آن را حذف کرد
    if (job.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "فقط کارهای باز قابل حذف هستند",
      });
    }

    await job.delete();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// درخواست برای کار
exports.applyForJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const specialistId = req.user.id;
    const { notes } = req.body;

    // بررسی وجود کار
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    // بررسی باز بودن وضعیت کار
    if (job.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "این کار دیگر باز نیست",
      });
    }

    // بررسی تکراری نبودن درخواست
    const alreadyApplied = job.applicants.some(
      (app) => app.specialist.toString() === specialistId
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "شما قبلاً برای این کار درخواست داده‌اید",
      });
    }

    // افزودن درخواست به کار
    job.applicants.push({
      specialist: specialistId,
      notes: notes || "",
      appliedAt: Date.now(),
      status: "PENDING",
    });

    await job.save();

    res.status(200).json({
      success: true,
      message: "درخواست شما با موفقیت ثبت شد",
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// پذیرش متخصص برای کار
exports.acceptSpecialist = async (req, res, next) => {
  try {
    const { jobId, specialistId } = req.params;

    // بررسی وجود کار
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    // بررسی مالکیت کار
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به تغییر وضعیت این کار نیستید",
      });
    }

    // بررسی باز بودن وضعیت کار
    if (job.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "این کار دیگر باز نیست",
      });
    }

    // بررسی وجود درخواست متخصص
    const applicantIndex = job.applicants.findIndex(
      (app) => app.specialist.toString() === specialistId
    );

    if (applicantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "درخواست متخصص مورد نظر یافت نشد",
      });
    }

    // تغییر وضعیت درخواست متخصص به پذیرفته شده
    job.applicants[applicantIndex].status = "ACCEPTED";

    // تنظیم متخصص برای کار
    job.specialist = specialistId;
    job.status = "IN_PROGRESS";
    job.startDate = Date.now();

    await job.save();

    res.status(200).json({
      success: true,
      message: "متخصص با موفقیت برای این کار پذیرفته شد",
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

// تغییر وضعیت کار به تکمیل شده
exports.completeJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;

    // بررسی وجود کار
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "کار مورد نظر یافت نشد",
      });
    }

    // بررسی مالکیت کار
    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "شما مجاز به تغییر وضعیت این کار نیستید",
      });
    }

    // بررسی در حال انجام بودن کار
    if (job.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "فقط کارهای در حال انجام می‌توانند تکمیل شوند",
      });
    }

    // تغییر وضعیت کار به تکمیل شده
    job.status = "COMPLETED";
    job.endDate = Date.now();

    await job.save();

    res.status(200).json({
      success: true,
      message: "کار با موفقیت تکمیل شد",
      data: job,
    });
  } catch (error) {
    next(error);
  }
};
