/**
 * مدیریت حالت کاربر
 * 
 * این سرویس برای مدیریت اطلاعات کاربر فعلی با یک لایه انتزاعی بالاتر از localStorage است
 * تا مدیریت داده‌های کاربر بهبود یابد و از تداخل حساب‌های کاربری جلوگیری شود.
 */

// حالت داخلی کاربر که در حافظه نگهداری می‌شود (نه localStorage)
let currentUserState = {
  isLoggedIn: false,
  userId: null,
  userType: null,
  username: null,
  token: null,
  // سایر داده‌های مورد نیاز
};

// لیستنرها برای تغییرات حالت کاربر
let stateChangeListeners = [];

// بارگیری داده‌های اولیه از localStorage
export const initializeFromStorage = () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    currentUserState = {
      isLoggedIn: true,
      userId: localStorage.getItem('userId'),
      userType: localStorage.getItem('userType'),
      username: localStorage.getItem('username'),
      token: token,
    };
  }
  
  return currentUserState;
};

// تنظیم داده‌های کاربر
export const setUserData = (userData) => {
  currentUserState = {
    ...currentUserState,
    ...userData,
    isLoggedIn: true,
  };
  
  // همچنان داده‌ها را در localStorage هم ذخیره می‌کنیم برای سازگاری
  if (userData.token) localStorage.setItem('token', userData.token);
  if (userData.userId) localStorage.setItem('userId', userData.userId);
  if (userData.userType) localStorage.setItem('userType', userData.userType);
  if (userData.username) localStorage.setItem('username', userData.username);
  
  // فراخوانی لیستنرها
  notifyStateChange();
  
  return currentUserState;
};

// خروج کاربر
export const clearUserData = () => {
  currentUserState = {
    isLoggedIn: false,
    userId: null,
    userType: null,
    username: null,
    token: null,
  };
  
  // پاکسازی localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userType');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userSkills');
  localStorage.removeItem('userExperience');
  localStorage.removeItem('userRating');
  localStorage.removeItem('userAvailability');
  localStorage.removeItem('userCompany');
  localStorage.removeItem('userLocation');
  localStorage.removeItem('activeSessionId');
  sessionStorage.removeItem('currentSessionId');
  
  // فراخوانی لیستنرها
  notifyStateChange();
  
  return currentUserState;
};

// دریافت داده‌های کاربر فعلی
export const getCurrentUser = () => {
  return { ...currentUserState };
};

// بررسی اینکه آیا کاربر لاگین کرده است
export const isAuthenticated = () => {
  return currentUserState.isLoggedIn && currentUserState.token;
};

// اضافه کردن لیستنر تغییر حالت
export const addStateChangeListener = (listener) => {
  stateChangeListeners.push(listener);
  
  // بازگرداندن تابع حذف لیستنر
  return () => {
    stateChangeListeners = stateChangeListeners.filter(l => l !== listener);
  };
};

// اطلاع‌رسانی به تمام لیستنرها
const notifyStateChange = () => {
  stateChangeListeners.forEach(listener => {
    listener(currentUserState);
  });
}; 