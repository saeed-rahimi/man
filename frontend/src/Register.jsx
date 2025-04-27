import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";
import { register } from "./api/authService";

const Register = () => {
  const navigate = useNavigate();

  // استیت‌های فرم
  const [userType, setUserType] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [job, setJob] = useState("");
  const [experience, setExperience] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [debug, setDebug] = useState("");

  // اعتبارسنجی فرم
  const validateForm = () => {
    const errors = {};

    // اعتبارسنجی فیلدهای عمومی
    if (!username.trim()) errors.username = "نام کاربری الزامی است";
    if (!email.trim()) errors.email = "ایمیل الزامی است";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "ایمیل معتبر نیست";

    if (!password) errors.password = "رمز عبور الزامی است";
    else if (password.length < 8)
      errors.password = "رمز عبور باید حداقل 8 کاراکتر باشد";

    if (password !== confirmPassword)
      errors.confirmPassword = "تکرار رمز عبور مطابقت ندارد";

    if (!phone.trim()) errors.phone = "شماره تلفن الزامی است";
    else if (!/^09[0-9]{9}$/.test(phone))
      errors.phone = "شماره تلفن معتبر نیست (مثال: 09123456789)";

    if (!address.trim()) errors.address = "آدرس الزامی است";

    // اعتبارسنجی فیلدهای مختص متخصص
    if (userType === "specialist") {
      if (!job.trim()) errors.job = "شغل الزامی است";
      if (!experience.trim()) errors.experience = "سابقه کار الزامی است";
      else if (isNaN(experience) || experience < 0)
        errors.experience = "سابقه کار باید عدد مثبت باشد";

      if (!age.trim()) errors.age = "سن الزامی است";
      else if (isNaN(age) || age < 18 || age > 100)
        errors.age = "سن باید بین 18 تا 100 باشد";

      if (!education.trim()) errors.education = "تحصیلات الزامی است";
    }

    // اعتبارسنجی فیلدهای مختص کارفرما
    if (userType === "employer") {
      if (!companyName.trim()) errors.companyName = "نام شرکت الزامی است";
    }

    return errors;
  };

  // ثبت فرم
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setDebug("");
    
    try {
      // اعتبارسنجی فرم
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        setIsLoading(false);
        return;
      }

      // ساخت داده‌های کاربر
      const userData = {
        name: username,
        email,
        password,
        phone,
        userType,
        location: {
          type: 'Point',
          coordinates: [0, 0],
          city: address.split(',')[0]?.trim() || '',
          province: address.split(',')[1]?.trim() || ''
        },
        // اطلاعات اضافی برای متخصص
        ...(userType === "specialist" && {
          skills: [job],
          experience: parseInt(experience, 10),
          age: parseInt(age, 10),
          education,
        }),
        // اطلاعات اضافی برای کارفرما
        ...(userType === "employer" && {
          companyName,
        }),
      };

      setDebug("در حال ارسال اطلاعات به سرور...");
      console.log("Sending registration data:", userData);

      // استفاده از سرویس ثبت‌نام
      const result = await register(userData);
      console.log("Registration result:", result);

      if (!result.success) {
        setDebug(`خطای دریافتی از سرور: ${result.message}`);
        throw new Error(result.message);
      }

      setDebug("ثبت نام با موفقیت انجام شد!");
      
      // نمایش پیام موفقیت
      alert("ثبت نام با موفقیت انجام شد! لطفا وارد شوید.");

      // هدایت به صفحه ورود
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      setDebug(`خطای کلی: ${error.message}`);
      setErrors({
        submit: error.message || "خطا در ثبت نام. لطفاً دوباره تلاش کنید."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // رندر کردن فیلدهای مختص نوع کاربر
  const renderUserTypeFields = () => {
    if (userType === "specialist") {
      return (
        <div className="specialist-fields">
          <div className="form-group">
            <label htmlFor="job">شغل</label>
            <select
              id="job"
              className={`form-control ${errors.job ? "is-invalid" : ""}`}
              value={job}
              onChange={(e) => setJob(e.target.value)}
            >
              <option value="">انتخاب کنید</option>
              <option value="نقاشی ساختمان">نقاشی ساختمان</option>
              <option value="برق کشی">برق کشی</option>
              <option value="لوله کشی">لوله کشی</option>
              <option value="کاشی کاری">کاشی کاری</option>
              <option value="نجاری">نجاری</option>
              <option value="گچ کاری">گچ کاری</option>
              <option value="سنگ کاری">سنگ کاری</option>
              <option value="تأسیسات">تأسیسات</option>
            </select>
            {errors.job && <div className="invalid-feedback">{errors.job}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="experience">سابقه کار (سال)</label>
            <input
              type="number"
              id="experience"
              className={`form-control ${
                errors.experience ? "is-invalid" : ""
              }`}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
            {errors.experience && (
              <div className="invalid-feedback">{errors.experience}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="age">سن</label>
            <input
              type="number"
              id="age"
              className={`form-control ${errors.age ? "is-invalid" : ""}`}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            {errors.age && <div className="invalid-feedback">{errors.age}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="education">تحصیلات</label>
            <select
              id="education"
              className={`form-control ${
                errors.education ? "is-invalid" : ""
              }`}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            >
              <option value="">انتخاب کنید</option>
              <option value="زیر دیپلم">زیر دیپلم</option>
              <option value="دیپلم">دیپلم</option>
              <option value="کاردانی">کاردانی</option>
              <option value="کارشناسی">کارشناسی</option>
              <option value="کارشناسی ارشد">کارشناسی ارشد</option>
              <option value="دکترا">دکترا</option>
            </select>
            {errors.education && (
              <div className="invalid-feedback">{errors.education}</div>
            )}
          </div>
        </div>
      );
    }

    if (userType === "employer") {
      return (
        <div className="employer-fields">
          <div className="form-group">
            <label htmlFor="companyName">نام شرکت یا کسب و کار</label>
            <input
              type="text"
              id="companyName"
              className={`form-control ${
                errors.companyName ? "is-invalid" : ""
              }`}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            {errors.companyName && (
              <div className="invalid-feedback">{errors.companyName}</div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="register-container">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow">
              <div className="card-body p-5">
                <h2 className="text-center mb-4">ثبت نام در سامانه</h2>

                {errors.submit && (
                  <div className="alert alert-danger" role="alert">
                    {errors.submit}
                  </div>
                )}
                
                {debug && (
                  <div className="alert alert-info" role="alert">
                    <p className="mb-0"><strong>اطلاعات عیب‌یابی:</strong> {debug}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="user-type-selection mb-4">
                    <label className="form-label d-block">نوع کاربر</label>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="userType"
                        id="specialist"
                        value="specialist"
                        checked={userType === "specialist"}
                        onChange={() => setUserType("specialist")}
                      />
                      <label className="form-check-label" htmlFor="specialist">
                        متخصص
                      </label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="userType"
                        id="employer"
                        value="employer"
                        checked={userType === "employer"}
                        onChange={() => setUserType("employer")}
                      />
                      <label className="form-check-label" htmlFor="employer">
                        کارفرما
                      </label>
                    </div>
                    {!userType && (
                      <div className="text-danger small mt-1">
                        لطفاً نوع کاربر را انتخاب کنید
                      </div>
                    )}
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="username">نام کامل</label>
                        <input
                          type="text"
                          id="username"
                          className={`form-control ${
                            errors.username ? "is-invalid" : ""
                          }`}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        {errors.username && (
                          <div className="invalid-feedback">
                            {errors.username}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="email">ایمیل</label>
                        <input
                          type="email"
                          id="email"
                          className={`form-control ${
                            errors.email ? "is-invalid" : ""
                          }`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="password">رمز عبور</label>
                        <input
                          type="password"
                          id="password"
                          className={`form-control ${
                            errors.password ? "is-invalid" : ""
                          }`}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        {errors.password && (
                          <div className="invalid-feedback">
                            {errors.password}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="confirmPassword">تکرار رمز عبور</label>
                        <input
                          type="password"
                          id="confirmPassword"
                          className={`form-control ${
                            errors.confirmPassword ? "is-invalid" : ""
                          }`}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        {errors.confirmPassword && (
                          <div className="invalid-feedback">
                            {errors.confirmPassword}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="phone">شماره موبایل</label>
                        <input
                          type="tel"
                          id="phone"
                          className={`form-control ${
                            errors.phone ? "is-invalid" : ""
                          }`}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="09123456789"
                        />
                        {errors.phone && (
                          <div className="invalid-feedback">{errors.phone}</div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="address">آدرس (شهر، استان)</label>
                        <input
                          type="text"
                          id="address"
                          className={`form-control ${
                            errors.address ? "is-invalid" : ""
                          }`}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="مثال: شیراز، فارس"
                        />
                        {errors.address && (
                          <div className="invalid-feedback">
                            {errors.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderUserTypeFields()}

                  <div className="form-group mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-100 btn-lg"
                      disabled={isLoading || !userType}
                    >
                      {isLoading ? "در حال ثبت نام..." : "ثبت نام"}
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <p>
                      قبلاً ثبت نام کرده‌اید؟{" "}
                      <Link to="/login" className="text-primary">
                        ورود به حساب کاربری
                      </Link>
                    </p>
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

export default Register;
