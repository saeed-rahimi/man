import axios from 'axios';

// تنظیم آدرس پایه API
const API_BASE_URL = 'http://localhost:5174/api';

console.log('API Base URL:', API_BASE_URL);

// ایجاد نمونه axios با تنظیمات پایه
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // اجازه ارسال کوکی‌ها
  withCredentials: false,
  // تنظیم timeout برای درخواست‌ها
  timeout: 10000,
});

// افزودن اینترسپتور برای اضافه کردن توکن به درخواست‌ها
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('Sending API request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// افزودن اینترسپتور برای مدیریت خطاها
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    return response;
  },
  (error) => {
    console.error('API Response error:', {
      message: error.message,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }
    });
    
    // در صورت خطای 401 (عدم احراز هویت)، کاربر را به صفحه ورود هدایت می‌کنیم
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userType');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userSkills');
      localStorage.removeItem('userExperience');
      localStorage.removeItem('userRating');
      localStorage.removeItem('userAvailability');
      localStorage.removeItem('userCompany');
      localStorage.removeItem('userLocation');
      
      // حذف کوکی‌ها (اگر وجود داشته باشند)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      console.log('All user data and tokens cleared');
    }
    
    return Promise.reject(error);
  }
);

// افزودن متد ساده برای تست اتصال به سرور
api.testConnection = async () => {
  try {
    const response = await api.get('/');
    return {
      success: true,
      message: 'اتصال به سرور برقرار است',
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در اتصال به سرور',
      error: error.message
    };
  }
};

// تست اتصال در زمان بارگذاری
api.testConnection()
  .then(result => console.log('API Connection test:', result))
  .catch(error => console.error('API Connection test failed:', error));

// اضافه کردن متد برای پاک‌سازی توکن‌ها از localStorage
api.clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userSkills');
  localStorage.removeItem('userExperience');
  localStorage.removeItem('userRating');
  localStorage.removeItem('userAvailability');
  localStorage.removeItem('userCompany');
  localStorage.removeItem('userLocation');
  
  // حذف کوکی‌ها (اگر وجود داشته باشند)
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log('All user data and tokens cleared');
};

export default api; 