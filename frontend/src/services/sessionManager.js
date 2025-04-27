/**
 * مدیریت جلسه‌های کاربری برای جلوگیری از تداخل حساب‌های کاربری
 * 
 * این سرویس برای مدیریت جلسه‌های کاربری و جلوگیری از تداخل حساب‌های کاربری
 * در تب‌های مختلف مرورگر طراحی شده است.
 */

// بررسی وضعیت جلسه فعلی
export const checkSession = () => {
  const currentSessionId = sessionStorage.getItem('currentSessionId');
  const activeSessionId = localStorage.getItem('activeSessionId');
  
  // اگر جلسه وجود دارد ولی با جلسه فعال یکسان نیست
  if (currentSessionId && activeSessionId && currentSessionId !== activeSessionId) {
    return false;
  }
  
  return true;
};

// ایجاد یک جلسه جدید
export const createNewSession = () => {
  const sessionId = Date.now().toString();
  sessionStorage.setItem('currentSessionId', sessionId);
  localStorage.setItem('activeSessionId', sessionId);
  return sessionId;
};

// حذف جلسه فعلی
export const clearSession = () => {
  localStorage.removeItem('activeSessionId');
  sessionStorage.removeItem('currentSessionId');
};

// دریافت جلسه فعلی
export const getCurrentSessionId = () => {
  return sessionStorage.getItem('currentSessionId');
};

// نظارت بر تغییرات جلسه
export const initSessionMonitor = (callback) => {
  // بررسی اولیه
  if (!checkSession()) {
    callback && callback(false);
  }
  
  // گوش دادن به تغییرات localStorage
  const handleStorageChange = (e) => {
    if (e.key === 'activeSessionId' || e.key === 'token' || e.key === 'userId') {
      const isValid = checkSession();
      callback && callback(isValid);
    }
  };
  
  // اضافه کردن event listener
  window.addEventListener('storage', handleStorageChange);
  
  // تنظیم یک بررسی دوره‌ای (هر 10 ثانیه)
  const intervalId = setInterval(() => {
    const isValid = checkSession();
    callback && callback(isValid);
  }, 10000);
  
  // تابع پاکسازی برای فراخوانی در cleanup useEffect
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(intervalId);
  };
}; 