const jwt = require('jsonwebtoken');

// ساخت توکن JWT
exports.signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// ارسال توکن JWT و پاسخ به کاربر
exports.createSendToken = (user, statusCode, res) => {
  const token = this.signToken(user._id);
  
  // حذف رمز عبور از خروجی
  user.password = undefined;
  
  return res.status(statusCode).json({
    success: true,
    message: 'عملیات موفقیت آمیز',
    data: {
      token,
      user
    }
  });
}; 