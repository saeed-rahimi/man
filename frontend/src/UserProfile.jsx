import React, { useEffect, useState } from "react";
import { getCurrentUser } from "./api/authService";
import "./UserProfile.css";

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError("");

        // دریافت اطلاعات از localStorage
        const cachedUserType = localStorage.getItem("userType");
        const cachedUsername = localStorage.getItem("username");

        // نمایش اطلاعات کش شده تا زمان دریافت اطلاعات جدید
        if (cachedUserType && cachedUsername) {
          setUserProfile({
            name: cachedUsername,
            userType: cachedUserType,
            // سایر اطلاعات از localStorage
            email: localStorage.getItem("userEmail"),
            phone: localStorage.getItem("userPhone"),
            location: JSON.parse(
              localStorage.getItem("userLocation") ||
                '{"city":"", "province":""}'
            ),
            ...(cachedUserType === "specialist"
              ? {
                  skills: JSON.parse(
                    localStorage.getItem("userSkills") || "[]"
                  ),
                  experience: localStorage.getItem("userExperience"),
                  rating: localStorage.getItem("userRating"),
                  availability:
                    localStorage.getItem("userAvailability") === "true",
                }
              : {
                  companyName: localStorage.getItem("userCompany"),
                }),
          });
        }

        // دریافت اطلاعات جدید از سرور
        const result = await getCurrentUser();

        if (result.success) {
          setUserProfile(result.data);
        } else {
          setError(result.message || "خطا در دریافت اطلاعات پروفایل");
        }
      } catch (err) {
        setError("خطا در دریافت اطلاعات پروفایل");
        console.error("Error fetching user profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (isLoading && !userProfile) {
    return (
      <div className="user-profile-loading">
        در حال بارگذاری اطلاعات کاربر...
      </div>
    );
  }

  if (error && !userProfile) {
    return <div className="user-profile-error">خطا: {error}</div>;
  }

  if (!userProfile) {
    return (
      <div className="user-profile-error">
        اطلاعات کاربر در دسترس نیست. لطفاً دوباره وارد شوید.
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <h2>پروفایل کاربری</h2>
        <div className="user-profile-type-badge">
          {userProfile.userType === "specialist" ? "متخصص" : "کارفرما"}
        </div>
      </div>

      <div className="user-profile-info">
        <div className="user-profile-section">
          <h3>اطلاعات شخصی</h3>
          <div className="user-profile-field">
            <span className="field-label">نام:</span>
            <span className="field-value">{userProfile.name}</span>
          </div>
          <div className="user-profile-field">
            <span className="field-label">ایمیل:</span>
            <span className="field-value">{userProfile.email}</span>
          </div>
          <div className="user-profile-field">
            <span className="field-label">شماره تماس:</span>
            <span className="field-value">{userProfile.phone}</span>
          </div>
          {userProfile.location && (
            <div className="user-profile-field">
              <span className="field-label">موقعیت:</span>
              <span className="field-value">
                {userProfile.location.city}, {userProfile.location.province}
              </span>
            </div>
          )}
        </div>

        {userProfile.userType === "specialist" && (
          <div className="user-profile-section">
            <h3>اطلاعات تخصصی</h3>
            {userProfile.skills && userProfile.skills.length > 0 && (
              <div className="user-profile-field">
                <span className="field-label">مهارت‌ها:</span>
                <div className="skills-container">
                  {userProfile.skills.map((skill, index) => (
                    <span key={index} className="skill-badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {userProfile.experience !== undefined && (
              <div className="user-profile-field">
                <span className="field-label">سابقه کار:</span>
                <span className="field-value">
                  {userProfile.experience} سال
                </span>
              </div>
            )}
            {userProfile.rating !== undefined && (
              <div className="user-profile-field">
                <span className="field-label">امتیاز:</span>
                <span className="field-value">{userProfile.rating} از 5</span>
              </div>
            )}
            <div className="user-profile-field">
              <span className="field-label">وضعیت:</span>
              <span
                className={`status-badge ${
                  userProfile.availability ? "available" : "unavailable"
                }`}
              >
                {userProfile.availability ? "آماده به کار" : "مشغول"}
              </span>
            </div>
          </div>
        )}

        {userProfile.userType === "employer" && userProfile.companyName && (
          <div className="user-profile-section">
            <h3>اطلاعات شرکت</h3>
            <div className="user-profile-field">
              <span className="field-label">نام شرکت:</span>
              <span className="field-value">{userProfile.companyName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
