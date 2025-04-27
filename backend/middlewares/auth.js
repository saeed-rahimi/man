const jwt = require("jsonwebtoken");
const User = require("../models/User");

// محافظت از مسیرها با استفاده از JWT
exports.protect = async (req, res, next) => {
  try {
    let token;

    // بررسی وجود توکن در هدر

    // if (!req.headers.authorization) {
    //   req.user = undefined;
    //   next();
    // }

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // اگر توکن موجود نباشد
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "برای دسترسی به این مسیر باید وارد شوید",
      });
    }

    // تایید توکن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // بررسی وجود کاربر
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "کاربر مربوط به این توکن دیگر وجود ندارد",
      });
    }

    // ذخیره کاربر در درخواست
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "توکن نامعتبر یا منقضی شده است",
    });
  }
};

// محدود کردن دسترسی براساس نوع کاربر
exports.restrictTo = (...userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: "شما مجوز دسترسی به این بخش را ندارید",
      });
    }
    next();
  };
};
