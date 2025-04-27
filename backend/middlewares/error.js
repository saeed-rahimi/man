// مدیریت خطاهای ناشناخته
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // خطای Mongoose کد تکراری
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    error.message = `${field} با مقدار ${value} قبلاً ثبت شده است`;
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // خطای Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    error.message = errors.join(', ');
    
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // خطای Mongoose CastError (نامعتبر بودن ObjectId)
  if (err.name === 'CastError') {
    error.message = `مقدار ${err.value} برای فیلد ${err.path} معتبر نیست`;
    
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // سایر خطاها
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'خطای سرور'
  });
}; 