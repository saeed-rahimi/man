import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { login, logout } from "./api/authService";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // بررسی وجود کاربر فعلی در هنگام بارگذاری صفحه
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userName = localStorage.getItem("username");
    const userType = localStorage.getItem("userType");
    
    if (token && userName) {
      setCurrentUser({
        name: userName,
        userType: userType
      });
    }
  }, []);
  
  // خروج از حساب کاربری فعلی
  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // اعتبارسنجی فرم
    if (!username.trim() || !password.trim()) {
      setError("لطفاً نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      // اگر کاربر دیگری لاگین کرده، اول خروج انجام شود
      if (currentUser) {
        logout();
      }

      // استفاده از سرویس لاگین
      const result = await login(username, password);

      if (!result.success) {
        throw new Error(result.message || "خطا در ورود به سیستم");
      }

      console.log("Login successful:", result.data);

      // نمایش پیام موفقیت
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.textContent = `${result.data.name} عزیز، خوش آمدید!`;
      document.body.appendChild(successMessage);
      
      // حذف پیام موفقیت بعد از 2 ثانیه
      setTimeout(() => {
        successMessage.remove();
        
        // هدایت به داشبورد مناسب
        if (result.data.userType === "specialist") {
          navigate("/specialist-dashboard");
        } else {
          navigate("/employer-dashboard");
        }
      }, 2000);
      
    } catch (err) {
      setError(err.message || "نام کاربری یا رمز عبور اشتباه است");
      console.error("خطا در ورود:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            {currentUser ? (
              <div className="card shadow mb-4">
                <div className="card-body p-4 text-center">
                  <div className="alert alert-info">
                    شما با حساب کاربری <strong>{currentUser.name}</strong> وارد شده‌اید.
                  </div>
                  <div className="d-grid gap-2">
                    <Link 
                      to={currentUser.userType === "specialist" ? "/specialist-dashboard" : "/employer-dashboard"} 
                      className="btn btn-primary"
                    >
                      ادامه با همین حساب کاربری
                    </Link>
                    <button 
                      className="btn btn-outline-danger" 
                      onClick={handleLogout}
                    >
                      خروج از این حساب کاربری
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="text-center mb-4">ورود به حساب کاربری</h2>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label htmlFor="username">ایمیل</label>
                    <input
                      type="email"
                      id="username"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label htmlFor="password">رمز عبور</label>
                    <input
                      type="password"
                      id="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-100 btn-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? "در حال ورود..." : "ورود"}
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p>
                      حساب کاربری ندارید؟{" "}
                      <Link to="/register" className="text-primary">
                        ثبت نام
                      </Link>
                    </p>
                    <a href="/forgot-password" className="text-muted">
                      فراموشی رمز عبور
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
