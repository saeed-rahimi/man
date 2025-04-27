import api from './config';
import { setUserData, clearUserData } from '../services/userStateManager';
import { createNewSession, clearSession } from '../services/sessionManager';

// سرویس ورود کاربر
export const login = async (email, password) => {
  try {
    console.log('Logging in with:', { email, password });
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    console.log('Login response:', response.data);
    
    // بررسی موفقیت آمیز بودن پاسخ
    if (response.data.success) {
      const { token, user } = response.data.data;
      
      // ایجاد یک sessionId جدید برای این جلسه
      createNewSession();
      
      // دریافت اطلاعات کامل کاربر
      const userData = await getCurrentUser();
      
      if (userData.success) {
        // استفاده از مدیریت حالت کاربر
        setUserData({
          token: token,
          userId: userData.data._id,
          userType: userData.data.userType,
          username: userData.data.name,
          email: userData.data.email,
        });
        
        return {
          success: true,
          data: userData.data
        };
      } else {
        // در صورت خطا در دریافت اطلاعات کاربر
        // حداقل اطلاعات اولیه را ذخیره می‌کنیم
        setUserData({
          token: token,
          userId: user._id,
          userType: user.userType,
          username: user.name,
        });
        
        return {
          success: true,
          data: user
        };
      }
    } else {
      // در صورت خطا
      return {
        success: false,
        message: response.data.message || 'خطا در ورود به سیستم'
      };
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// سرویس ثبت نام کاربر
export const register = async (userData) => {
  try {
    console.log('Registering user with data:', userData);
    
    // اطمینان از ارسال فیلدهای ضروری
    if (!userData.name || !userData.email || !userData.password) {
      return {
        success: false,
        message: 'اطلاعات ضروری (نام، ایمیل یا رمز عبور) وارد نشده است'
      };
    }
    
    // ارسال درخواست به API
    const response = await api.post('/auth/register', userData);
    
    console.log('Register response:', response.data);
    
    // بررسی موفقیت آمیز بودن پاسخ
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: 'ثبت نام با موفقیت انجام شد'
      };
    } else {
      // در صورت خطا
      return {
        success: false,
        message: response.data.message || 'خطا در ثبت نام'
      };
    }
  } catch (error) {
    console.error('Register error full:', error);
    console.error('Register error details:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// سرویس دریافت اطلاعات کاربر
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    
    if (response.data.success) {
      const userData = response.data.data.user;
      
      // استفاده از مدیریت حالت کاربر
      setUserData({
        userId: userData._id,
        username: userData.name,
        userType: userData.userType,
        email: userData.email,
        phone: userData.phone,
      });
      
      // ذخیره اطلاعات بیشتر کاربر در localStorage برای شخصی‌سازی
      if (userData.userType === 'specialist') {
        // ذخیره اطلاعات مختص متخصص
        localStorage.setItem('userSkills', JSON.stringify(userData.skills || []));
        localStorage.setItem('userExperience', userData.experience || 0);
        localStorage.setItem('userRating', userData.rating || 0);
        localStorage.setItem('userAvailability', userData.availability || false);
      } else {
        // ذخیره اطلاعات مختص کارفرما
        localStorage.setItem('userCompany', userData.companyName || '');
      }
      
      // ذخیره اطلاعات موقعیت مکانی
      if (userData.location) {
        localStorage.setItem('userLocation', JSON.stringify(userData.location));
      }
      
      return {
        success: true,
        data: userData
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در دریافت اطلاعات کاربر'
      };
    }
  } catch (error) {
    console.error('Get current user error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// خروج کاربر
export const logout = () => {
  clearUserData();
  clearSession();
}; 