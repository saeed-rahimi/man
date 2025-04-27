const User = require("../models/User");
const jwtUtils = require("../utils/jwtUtils");

// ثبت نام کاربر جدید
exports.register = async (req, res, next) => {
  try {
    const newUser = await User.create(req.body);

    jwtUtils.createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// ورود کاربر
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // بررسی وجود ایمیل و رمز عبور
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "لطفاً ایمیل و رمز عبور را وارد کنید",
      });
    }

    // بررسی وجود کاربر
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "ایمیل یا رمز عبور اشتباه است",
      });
    }

    // ارسال توکن
    jwtUtils.createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// اطلاعات کاربر فعلی
exports.getMe = async (req, res, next) => {
  try {
    // اطلاعات کاربر از میدلور authجلوتر به درخواست اضافه شده است
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی اطلاعات کاربر
exports.updateMe = async (req, res, next) => {
  try {
    // جلوگیری از تغییر رمز عبور با این روش
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message:
          "این مسیر برای تغییر رمز عبور نیست. لطفاً از مسیر /updatePassword استفاده کنید",
      });
    }

    // فیلترکردن فیلدهای مجاز برای بروزرسانی
    const filteredBody = {};
    const allowedFields = [
      "name",
      "email",
      "phone",
      "companyName",
      "skills",
      "experience",
      "age",
      "education",
      "availability",
      "location",
    ];

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });

    // بروزرسانی کاربر
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// تغییر رمز عبور
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // بررسی وجود رمز عبور فعلی و جدید
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "لطفاً رمز عبور فعلی و جدید را وارد کنید",
      });
    }

    // دریافت کاربر با رمز عبور
    const user = await User.findById(req.user.id).select("+password");

    // بررسی صحت رمز عبور فعلی
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "رمز عبور فعلی اشتباه است",
      });
    }

    // تنظیم رمز عبور جدید و ذخیره
    user.password = newPassword;
    await user.save();

    // ارسال توکن جدید
    jwtUtils.createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};
