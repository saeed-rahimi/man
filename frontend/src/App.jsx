import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import Register from "./Register";
import Login from "./Login";
import EmployerDashboard from "./EmployerDashboard";
import SpecialistDashboard from "./SpecialistDashboard";
import TestBackend from "./TestBackend";
import UserProfile from "./UserProfile";
import { checkSession, initSessionMonitor } from "./services/sessionManager";
import { getCurrentUser, isAuthenticated, initializeFromStorage, addStateChangeListener } from "./services/userStateManager";
import { logout } from "./api/authService";

// مکانیزم محافظت از مسیرها
const ProtectedRoute = ({ element, allowedUserType }) => {
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(true);
  
  // بررسی اعتبار توکن و نوع کاربر
  useEffect(() => {
    // استفاده از سرویس مدیریت حالت کاربر
    const user = getCurrentUser();
    
    // اگر توکن نداریم یا نوع کاربر اشتباه است
    if (!isAuthenticated()) {
      setIsValid(false);
      navigate("/login", { replace: true });
    } else if (allowedUserType && user.userType !== allowedUserType) {
      setIsValid(false);
      navigate("/", { replace: true });
    }
  }, [navigate, allowedUserType]);

  return isValid ? element : null;
};

function App() {
  const navigate = useNavigate();
  const [sessionValid, setSessionValid] = useState(true);
  const [userState, setUserState] = useState(() => initializeFromStorage());
  
  // نظارت بر تغییرات حالت کاربر
  useEffect(() => {
    const removeListener = addStateChangeListener(setUserState);
    return removeListener;
  }, []);
  
  // نظارت بر تغییرات localStorage بین تب‌ها
  useEffect(() => {
    // استفاده از سرویس جدید برای نظارت بر جلسه
    const cleanup = initSessionMonitor((isValid) => {
      if (!isValid) {
        setSessionValid(false);
        // نمایش پیام به کاربر و ریدایرکت به صفحه لاگین
        alert("کاربر فعال در سیستم تغییر کرده است. لطفاً دوباره وارد شوید.");
        navigate("/login", { replace: true });
      }
    });
    
    // پاکسازی
    return cleanup;
  }, [navigate]);

  // اگر جلسه معتبر نیست، هیچ چیز نمایش نده تا ریدایرکت انجام شود
  if (!sessionValid) {
    return null;
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage userState={userState} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/test-backend" element={<TestBackend />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              element={<UserProfile />}
              allowedUserType={null}
            />
          }
        />
        <Route
          path="/employer-dashboard/*"
          element={
            <ProtectedRoute
              element={<EmployerDashboard />}
              allowedUserType="employer"
            />
          }
        />
        <Route
          path="/specialist-dashboard/*"
          element={
            <ProtectedRoute
              element={<SpecialistDashboard />}
              allowedUserType="specialist"
            />
          }
        />
      </Routes>
    </div>
  );
}

// کامپوننت صفحه اصلی
function HomePage({ userState }) {
  // استفاده از مدیریت حالت کاربر
  const isLoggedIn = userState.isLoggedIn;
  const userType = userState.userType;
  
  const handleLogout = () => {
    // استفاده از تابع logout از authService
    logout();
    
    window.location.href = '/';
  };
  
  return (
    <>
      {/* نوار ناوبری */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary w-100">
        <div className="container">
          <a className="navbar-brand" href="#">
            کاریاب ساختمان
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link active" href="#">
                  صفحه اصلی
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  خدمات
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  جستجوی متخصصان
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  درباره ما
                </a>
              </li>
              <li className="nav-item">
                <Link to="/test-backend" className="nav-link">
                  تست اتصال
                </Link>
              </li>
            </ul>
            <div className="d-flex">
              {isLoggedIn ? (
                <>
                  <Link to="/profile" className="btn btn-light me-2">
                    پروفایل من
                  </Link>
                  <Link 
                    to={userType === 'specialist' ? '/specialist-dashboard' : '/employer-dashboard'} 
                    className="btn btn-light me-2"
                  >
                    داشبورد
                  </Link>
                  <button onClick={handleLogout} className="btn btn-outline-light">
                    خروج
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-light me-2">
                    ورود
                  </Link>
                  <Link to="/register" className="btn btn-outline-light">
                    ثبت نام
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* بخش هیرو */}
      <div className="hero-section bg-primary text-white text-center py-5 w-100">
        <div className="container py-5">
          <h1 className="display-4 fw-bold mb-4">
            متخصصان ساختمان را آنلاین پیدا کنید
          </h1>
          <p className="lead mb-5">
            هزاران متخصص ساختمانی آماده ارائه خدمات هستند. همین حالا متخصص مورد
            نیاز خود را پیدا کنید.
          </p>

          <div
            className="search-box bg-white p-4 rounded shadow mx-auto"
            style={{ maxWidth: "800px" }}
          >
            <div className="row g-3">
              <div className="col-md-5">
                <select className="form-select">
                  <option selected>نوع خدمات</option>
                  <option>نقاشی ساختمان</option>
                  <option>برق کشی</option>
                  <option>لوله کشی</option>
                  <option>کاشی کاری</option>
                  <option>نجاری</option>
                </select>
              </div>
              <div className="col-md-5">
                <select className="form-select">
                  <option selected>منطقه</option>
                  <option>شمال شیراز</option>
                  <option>جنوب شیراز</option>
                  <option>شرق شیراز</option>
                  <option>غرب شیراز</option>
                  <option>مرکز شیراز</option>
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-success w-100">جستجو</button>
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <Link to="/test-backend" className="btn btn-warning">
              بررسی وضعیت اتصال به بک‌اند
            </Link>
          </div>
        </div>
      </div>

      <div className="services-section py-5 w-100">
        <div className="container">
          <h2 className="text-center mb-5">خدمات محبوب</h2>

          <div className="row">
            <div className="col-md-3 mb-4">
              <div className="card text-center h-100">
                <div className="card-body">
                  <i className="bi bi-paint-bucket fs-1 text-primary mb-3"></i>
                  <h5 className="card-title">نقاشی ساختمان</h5>
                  <p className="card-text">
                    رنگ‌آمیزی دیوارها و سقف با بهترین متخصصان
                  </p>
                  <a href="#" className="btn btn-outline-primary mt-auto">
                    مشاهده متخصصان
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="card text-center h-100">
                <div className="card-body">
                  <i className="bi bi-lightning fs-1 text-primary mb-3"></i>
                  <h5 className="card-title">برق کشی</h5>
                  <p className="card-text">
                    نصب و تعمیر سیستم‌های برقی توسط متخصصان مجرب
                  </p>
                  <a href="#" className="btn btn-outline-primary mt-auto">
                    مشاهده متخصصان
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="card text-center h-100">
                <div className="card-body">
                  <i className="bi bi-droplet fs-1 text-primary mb-3"></i>
                  <h5 className="card-title">لوله کشی</h5>
                  <p className="card-text">
                    نصب و تعمیر سیستم‌های لوله کشی و تأسیسات
                  </p>
                  <a href="#" className="btn btn-outline-primary mt-auto">
                    مشاهده متخصصان
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <div className="card text-center h-100">
                <div className="card-body">
                  <i className="bi bi-grid-3x3 fs-1 text-primary mb-3"></i>
                  <h5 className="card-title">کاشی کاری</h5>
                  <p className="card-text">
                    نصب انواع کاشی و سرامیک با دقت و کیفیت بالا
                  </p>
                  <a href="#" className="btn btn-outline-primary mt-auto">
                    مشاهده متخصصان
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* بخش چرا ما */}
      <div className="why-us-section py-5 bg-light w-100">
        <div className="container">
          <h2 className="text-center mb-5">چرا کاریاب ساختمان؟</h2>

          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0">
                  <i className="bi bi-shield-check fs-1 text-primary me-3"></i>
                </div>
                <div className="flex-grow-1">
                  <h5>متخصصان تأیید شده</h5>
                  <p>
                    تمام متخصصان ما از نظر مهارت و تخصص بررسی و تأیید شده‌اند.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0">
                  <i className="bi bi-cash-coin fs-1 text-primary me-3"></i>
                </div>
                <div className="flex-grow-1">
                  <h5>قیمت‌های رقابتی</h5>
                  <p>قیمت‌های منصفانه و شفاف برای تمام خدمات ارائه شده.</p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="d-flex align-items-start">
                <div className="flex-shrink-0">
                  <i className="bi bi-stopwatch fs-1 text-primary me-3"></i>
                </div>
                <div className="flex-grow-1">
                  <h5>سرعت در خدمات</h5>
                  <p>متخصصان ما در کوتاه‌ترین زمان ممکن در محل حاضر می‌شوند.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* بخش نظرات مشتریان */}
      <div className="testimonials-section py-5 w-100">
        <div className="container">
          <h2 className="text-center mb-5">نظرات مشتریان</h2>

          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex mb-3 align-items-center">
                    <div className="flex-shrink-0">
                      <i
                        className="bi bi-house-door-fill text-primary bg-light p-2 rounded-circle"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">علی محمدی</h6>
                      <div className="text-warning">
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                      </div>
                    </div>
                  </div>
                  <p className="card-text">
                    خدمات نقاشی ساختمان عالی بود. کار تمیز و مرتب انجام شد و
                    دقیقاً مطابق زمان‌بندی پیش رفت.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex mb-3 align-items-center">
                    <div className="flex-shrink-0">
                      <i
                        className="bi bi-house-heart-fill text-danger bg-light p-2 rounded-circle"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">سارا رضایی</h6>
                      <div className="text-warning">
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star"></i>
                      </div>
                    </div>
                  </div>
                  <p className="card-text">
                    با متخصص لوله‌کشی که از طریق این سایت پیدا کردم بسیار راضی
                    بودم. سریع مشکل نشتی آب را برطرف کرد.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex mb-3 align-items-center">
                    <div className="flex-shrink-0">
                      <i
                        className="bi bi-house-gear-fill text-success bg-light p-2 rounded-circle"
                        style={{ fontSize: "2rem" }}
                      ></i>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">حسین احمدی</h6>
                      <div className="text-warning">
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-fill"></i>
                        <i className="bi bi-star-half"></i>
                      </div>
                    </div>
                  </div>
                  <p className="card-text">
                    کاشی‌کاری آشپزخانه توسط متخصص این سایت بسیار حرفه‌ای انجام
                    شد. کار تمیز و با کیفیت بالا بود.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* فوتر */}
      <footer className="bg-dark text-white py-5 w-100">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-4 col-md-6">
              <h5 className="mb-4 fw-bold">کاریاب ساختمان</h5>
              <p className="mb-4">بزرگترین شبکه متخصصان ساختمانی در شیراز</p>
              <div className="social-links d-flex fs-4 gap-3 mb-3">
                <a href="#" className="text-white">
                  <i className="bi bi-instagram"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="bi bi-telegram"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <h5 className="mb-4 fw-bold">لینک‌های مفید</h5>
              <ul className="list-unstyled footer-links">
                <li className="mb-2">
                  <a href="#" className="text-white text-decoration-none">
                    <i className="bi bi-chevron-left me-2"></i>درباره ما
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white text-decoration-none">
                    <i className="bi bi-chevron-left me-2"></i>خدمات
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white text-decoration-none">
                    <i className="bi bi-chevron-left me-2"></i>تماس با ما
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white text-decoration-none">
                    <i className="bi bi-chevron-left me-2"></i>سوالات متداول
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white text-decoration-none">
                    <i className="bi bi-chevron-left me-2"></i>بلاگ
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-lg-4 col-md-12">
              <h5 className="mb-4 fw-bold">تماس با ما</h5>
              <address className="mb-0">
                <p className="mb-3">
                  <i className="bi bi-geo-alt me-2"></i>شیراز، خیابان ملاصدرا،
                  پلاک 123
                </p>
                <p className="mb-3">
                  <i className="bi bi-telephone me-2"></i>071-12345678
                </p>
                <p className="mb-3">
                  <i className="bi bi-envelope me-2"></i>
                  info@construction-job.com
                </p>
                <p className="mb-0">
                  <i className="bi bi-clock me-2"></i>شنبه تا پنجشنبه: 8 صبح تا
                  6 عصر
                </p>
              </address>
            </div>
          </div>

          <hr className="my-4" />

          <div className="text-center">
            <p className="mb-0">
              © تمامی حقوق برای کاریاب ساختمان محفوظ است - ۱۴۰۴
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
