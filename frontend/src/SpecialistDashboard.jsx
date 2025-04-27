import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";
import io from "socket.io-client";
import { logout } from "./api/authService";
import { getCurrentUser } from "./services/userStateManager";
import JobListings from "./components/specialist/JobListings";
import MyApplications from "./components/specialist/MyApplications";

const SpecialistDashboard = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const [selectedChat, setSelectedChat] = useState(null);
  const [employers, setEmployers] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(getCurrentUser());
  const messagesEndRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    // اطمینان از اینکه کاربر متخصص است
    if (!user.isLoggedIn || user.userType !== "specialist") {
      navigate("/login");
    }
  }, [user, navigate]);

  // Initialize socket connection
  useEffect(() => {
    const fetchDashboardData = () => {
      fetchProfile();
      fetchJobs();
    };

    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("برای دسترسی به این صفحه باید وارد شوید.");
        return;
      }
      try {
        const response = await axios.get(`/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // بررسی ساختار پاسخ و استخراج اطلاعات کاربر
        const userData = response.data.data?.user || response.data.data;
        setUserData(userData);
        setProfile(userData);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || "خطا در دریافت اطلاعات کاربر");
        setLoading(false);
      }
    };

    const fetchJobs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log("Fetching jobs for specialist...");

      // Fetch available jobs
      const availableResponse = await axios.get(`/api/jobs/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Available jobs:", availableResponse.data.data.length);
      setAvailableJobs(availableResponse.data.data);

      // Fetch my jobs (where I have applied)
      const myJobsResponse = await axios.get(
        `/api/specialists/my-applications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("My job applications:", myJobsResponse.data.data.length);
      setMyJobs(myJobsResponse.data.data);

      // Also fetch employer data for messages
      if (myJobsResponse.data.data.length > 0) {
        const employerIds = [
          ...new Set(myJobsResponse.data.data.map((job) => job.employer._id)),
        ];
        const employersForChat = employerIds.map((id) => {
          const job = myJobsResponse.data.data.find(
            (j) => j.employer._id === id
          );
          return {
            id,
            name: job.employer.username,
            lastSeen: "آنلاین",
          };
        });

        setEmployers((prevEmployers) => {
          // Merge with existing employers without duplicates
          const existingIds = prevEmployers.map((e) => e.id);
          const newEmployers = employersForChat.filter(
            (e) => !existingIds.includes(e.id)
          );
          return [...prevEmployers, ...newEmployers];
        });
      }
    };

    try {
      const token = localStorage.getItem("token");
      // Load data regardless of socket connection
      fetchDashboardData();

      if (token) {
        const newSocket = io("http://localhost:5174", {
          reconnectionAttempts: 3,
          timeout: 5000,
        });

        // Authenticate with socket
        newSocket.on("connect", () => {
          console.log("Socket connected");
          newSocket.emit("authenticate", token);
        });

        newSocket.on("authenticated", (data) => {
          console.log("Socket authenticated", data);
        });

        newSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
        });

        newSocket.on("error", (error) => {
          console.error("Socket error:", error);
        });

        setSocket(newSocket);

        // Clean up on unmount
        return () => {
          newSocket.disconnect();
        };
      }
    } catch (error) {
      console.error("Socket initialization error:", error);
    }
  }, []);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new job postings
    socket.on("new-job-posted", (jobData) => {
      setAvailableJobs((prevJobs) => {
        // Check if job already exists
        const exists = prevJobs.some((job) => job._id === jobData.jobId);
        if (exists) return prevJobs;

        // Add new job to the beginning of the array
        const newJob = {
          _id: jobData.jobId,
          title: jobData.title,
          location: jobData.location,
          jobType: jobData.jobType,
          budget: jobData.budget,
          employer: {
            _id: jobData.employerId,
            username: jobData.employerName,
          },
          createdAt: jobData.createdAt,
        };

        setNotification({
          type: "new-job",
          message: `کار جدید: ${jobData.title}`,
          time: new Date(),
        });

        return [newJob, ...prevJobs];
      });
    });

    // Listen for job application accepted
    socket.on("job-application-accepted", (data) => {
      setMyJobs((prevJobs) => {
        // Check if job already exists in my jobs
        const exists = prevJobs.some((job) => job._id === data.jobId);
        if (exists) return prevJobs;

        // Add new job to my jobs
        const newJob = {
          _id: data.jobId,
          title: data.jobTitle,
          employer: {
            _id: data.employerId,
            username: data.employerName,
            companyName: data.companyName,
          },
          status: "IN_PROGRESS",
          startDate: data.startDate,
        };

        setNotification({
          type: "job-accepted",
          message: `درخواست شما برای کار "${data.jobTitle}" پذیرفته شد!`,
          time: new Date(),
        });

        return [newJob, ...prevJobs];
      });
    });

    // Listen for new messages
    socket.on("private-message", (messageData) => {
      console.log("Received private message:", messageData);

      if (selectedChat && selectedChat.id === messageData.sender) {
        // If chat with sender is open, add message to current chat
        setMessages((prev) => [
          ...prev,
          {
            id: messageData.id || Date.now(),
            sender: "employer",
            text: messageData.content || messageData.message,
            time: new Date().toLocaleTimeString("fa-IR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } else {
        // If chat is not open, show notification
        setNotification({
          type: "new-message",
          message: `پیام جدید از ${messageData.senderName}`,
          time: new Date(),
        });

        // Update employers list to show unread indicator
        setEmployers((prev) => {
          const updatedEmployers = [...prev];
          const employerIndex = updatedEmployers.findIndex(
            (emp) => emp.id === messageData.sender
          );

          if (employerIndex >= 0) {
            updatedEmployers[employerIndex].hasUnread = true;
          } else {
            // Add new employer to chat list
            updatedEmployers.push({
              id: messageData.sender,
              name: messageData.senderName,
              lastSeen: "آنلاین",
              hasUnread: true,
            });
          }

          return updatedEmployers;
        });
      }
    });

    return () => {
      socket.off("new-job-posted");
      socket.off("job-application-accepted");
      socket.off("private-message");
    };
  }, [socket, selectedChat]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ارسال پیام جدید
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !socket) return;

    // Create room ID based on both user IDs (sorted to ensure consistency)
    const roomId = [userData._id, selectedChat.id].sort().join("-");

    console.log(`Sending message to room: ${roomId}`, {
      recipient: selectedChat.id,
      content: newMessage,
      roomId: roomId,
    });

    socket.emit("private-message", {
      recipient: selectedChat.id,
      content: newMessage,
      roomId: roomId,
    });

    // Add message to UI immediately (optimistic update)
    const newMsg = {
      id: Date.now(),
      sender: "me",
      text: newMessage,
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  // درخواست همکاری برای یک آگهی
  const handleApplyForJob = async (jobId) => {
    const token = localStorage.getItem("token");
    try {
      // Check if user is a specialist
      if (userData.userType !== "specialist") {
        setNotification({
          type: "error",
          message: "فقط متخصصان می‌توانند درخواست همکاری ارسال کنند",
          time: new Date(),
        });
        return;
      }

      console.log(`Applying for job: ${jobId}`);

      // Find job details in availableJobs
      const jobToApply = availableJobs.find((job) => job._id === jobId);
      if (!jobToApply) {
        throw new Error("آگهی مورد نظر یافت نشد");
      }

      // Send request to server with correct headers
      const response = await axios.post(
        `/api/jobs/${jobId}/apply`,
        { notes: "من مایل به همکاری در این پروژه هستم" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Application response:", response.data);

      // Send socket notification to employer
      if (socket && jobToApply) {
        const applicationData = {
          jobId: jobId,
          jobTitle: jobToApply.title,
          specialistId: userData._id,
          specialistName: userData.name,
          employerId: jobToApply.employer._id,
          appliedAt: new Date(),
          notes: "من مایل به همکاری در این پروژه هستم",
          specialistInfo: {
            id: userData._id,
            name: userData.name,
            phone: userData.phone,
            job: userData.job || "متخصص",
            experience: userData.experience || 0,
          },
        };

        console.log("Sending application notification:", applicationData);
        socket.emit("job-application", applicationData);
      }

      // Update UI
      setNotification({
        type: "job-applied",
        message: "درخواست همکاری شما با موفقیت ثبت شد",
        time: new Date(),
      });

      // Refresh jobs after applying
      try {
        const availableResponse = await axios.get(`/api/jobs/available`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (availableResponse.data && availableResponse.data.data) {
          setAvailableJobs(availableResponse.data.data);
        }

        const myJobsResponse = await axios.get(
          `/api/specialists/my-applications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (myJobsResponse.data && myJobsResponse.data.data) {
          setMyJobs(myJobsResponse.data.data);
        }
      } catch (refreshError) {
        console.error("Error refreshing jobs after apply:", refreshError);
      }
    } catch (error) {
      console.error("Error applying for job:", error.response?.data || error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "خطا در ثبت درخواست",
        time: new Date(),
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fa-IR").format(date);
  };

  // Calculate distance
  const calculateDistance = (jobLocation) => {
    if (!profile || !profile.location || !jobLocation) return "نامشخص";

    // Calculate distance using Haversine formula
    const R = 6371; // Radius of the Earth in km
    const lat1 = profile.location.coordinates[1];
    const lon1 = profile.location.coordinates[0];
    const lat2 = jobLocation.coordinates[1];
    const lon2 = jobLocation.coordinates[0];

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return `${distance.toFixed(1)} کیلومتر`;
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        {/* نوار کناری */}
        <div
          className="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse"
          style={{ minHeight: "100vh" }}
        >
          <div className="position-sticky pt-3">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-2"
                style={{ width: "80px", height: "80px", fontSize: "2rem" }}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : "U"}
              </div>
              <h5 className="mt-2">{user.username || "کاربر متخصص"}</h5>
              <p className="text-muted">
                {user.userType === "specialist" ? "متخصص" : ""}
              </p>
            </div>

            <ul className="nav flex-column">
              <li className="nav-item">
                <Link to="/specialist-dashboard" className="nav-link active">
                  <i className="bi bi-house-door me-2"></i>
                  داشبورد
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/specialist-dashboard/jobs" className="nav-link">
                  <i className="bi bi-briefcase me-2"></i>
                  آگهی‌های شغلی
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/specialist-dashboard/applications"
                  className="nav-link"
                >
                  <i className="bi bi-send me-2"></i>
                  درخواست‌های من
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/specialist-dashboard/profile" className="nav-link">
                  <i className="bi bi-person me-2"></i>
                  پروفایل من
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/specialist-dashboard/messages" className="nav-link">
                  <i className="bi bi-chat me-2"></i>
                  پیام‌های من
                </Link>
              </li>
            </ul>

            <hr />

            <div className="px-3 mt-4">
              <Link to="/" className="btn btn-outline-secondary w-100">
                <i className="bi bi-arrow-right me-2"></i>
                بازگشت به سایت
              </Link>
            </div>
          </div>
        </div>

        {/* محتوای اصلی */}
        <div className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
          <Routes>
            <Route path="/" element={<SpecialistHome user={user} />} />
            <Route path="/jobs" element={<JobListings />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route
              path="/profile"
              element={<SpecialistProfile user={user} />}
            />
            <Route path="/messages" element={<SpecialistMessages />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// کامپوننت صفحه اصلی داشبورد
function SpecialistHome({ user }) {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>داشبورد متخصص</h2>
        <div>
          <span className="text-muted me-2">امروز:</span>
          {new Date().toLocaleDateString("fa-IR")}
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body d-flex align-items-center">
              <i className="bi bi-briefcase fs-1 me-3"></i>
              <div>
                <h5 className="card-title">آگهی‌های شغلی</h5>
                <h2 className="mb-0">12</h2>
                <p className="card-text mb-0">آگهی جدید</p>
              </div>
            </div>
            <div className="card-footer bg-primary border-0">
              <Link
                to="/specialist-dashboard/jobs"
                className="text-white text-decoration-none small"
              >
                مشاهده آگهی‌ها
                <i className="bi bi-chevron-left ms-1"></i>
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card bg-success text-white h-100">
            <div className="card-body d-flex align-items-center">
              <i className="bi bi-send fs-1 me-3"></i>
              <div>
                <h5 className="card-title">درخواست‌های من</h5>
                <h2 className="mb-0">5</h2>
                <p className="card-text mb-0">درخواست فعال</p>
              </div>
            </div>
            <div className="card-footer bg-success border-0">
              <Link
                to="/specialist-dashboard/applications"
                className="text-white text-decoration-none small"
              >
                مشاهده درخواست‌ها
                <i className="bi bi-chevron-left ms-1"></i>
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card bg-info text-white h-100">
            <div className="card-body d-flex align-items-center">
              <i className="bi bi-chat fs-1 me-3"></i>
              <div>
                <h5 className="card-title">پیام‌ها</h5>
                <h2 className="mb-0">3</h2>
                <p className="card-text mb-0">پیام جدید</p>
              </div>
            </div>
            <div className="card-footer bg-info border-0">
              <Link
                to="/specialist-dashboard/messages"
                className="text-white text-decoration-none small"
              >
                مشاهده پیام‌ها
                <i className="bi bi-chevron-left ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* آگهی‌های اخیر */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">آگهی‌های اخیر</h5>
        </div>
        <div className="card-body">
          <div className="list-group">
            <Link
              to="/specialist-dashboard/jobs"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <h6 className="mb-1">نقاشی ساختمان مسکونی</h6>
                <p className="text-muted mb-0 small">شمال شیراز - ۴ روز پیش</p>
              </div>
              <span className="badge bg-primary rounded-pill">جدید</span>
            </Link>
            <Link
              to="/specialist-dashboard/jobs"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <h6 className="mb-1">لوله کشی آشپزخانه</h6>
                <p className="text-muted mb-0 small">مرکز شیراز - ۶ روز پیش</p>
              </div>
              <span className="badge bg-primary rounded-pill">جدید</span>
            </Link>
            <Link
              to="/specialist-dashboard/jobs"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <h6 className="mb-1">برق کشی ساختمان تجاری</h6>
                <p className="text-muted mb-0 small">شرق شیراز - ۷ روز پیش</p>
              </div>
            </Link>
          </div>
        </div>
        <div className="card-footer text-end">
          <Link
            to="/specialist-dashboard/jobs"
            className="btn btn-primary btn-sm"
          >
            مشاهده همه آگهی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}

// نمونه کامپوننت‌های دیگر (می‌توان بعداً به فایل‌های جداگانه منتقل کرد)
function SpecialistProfile({ user }) {
  return (
    <div>
      <h2 className="mb-4">پروفایل من</h2>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4">اطلاعات شخصی</h5>
          <form>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">نام و نام خانوادگی</label>
                <input
                  type="text"
                  className="form-control"
                  defaultValue={user.username}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">ایمیل</label>
                <input
                  type="email"
                  className="form-control"
                  defaultValue={user.email}
                  readOnly
                />
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">شماره تماس</label>
                <input
                  type="tel"
                  className="form-control"
                  defaultValue={user.phone}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">تخصص</label>
                <select className="form-select">
                  <option>نقاشی ساختمان</option>
                  <option>برق کشی</option>
                  <option>لوله کشی</option>
                  <option>کاشی کاری</option>
                  <option>نجاری</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">آدرس</label>
              <textarea className="form-control" rows="3"></textarea>
            </div>
            <div className="mb-3">
              <label className="form-label">درباره من</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="توضیحات مختصری درباره تخصص و تجربیات خود بنویسید..."
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              بروزرسانی اطلاعات
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SpecialistMessages() {
  // نمونه دیتا برای نمایش (بعداً با وب‌سوکت جایگزین می‌شود)
  const [chats, setChats] = useState([
    {
      id: 1,
      name: "شرکت آریا تک",
      avatar: "/api/placeholder/40/40",
      userType: "کارفرما",
      industry: "تکنولوژی اطلاعات",
      lastMessage: "سلام، ما به دنبال همکاری برای پروژه جدید هستیم",
      time: "12:45",
      unread: 3,
      online: true,
      projectTitle: "طراحی و توسعه وب‌سایت فروشگاهی",
    },
    {
      id: 2,
      name: "گروه مهندسی پارس",
      avatar: "/api/placeholder/40/40",
      userType: "کارفرما",
      industry: "صنعت ساختمان",
      lastMessage: "آیا می‌توانید نمونه کارهای بیشتری ارسال کنید؟",
      time: "دیروز",
      unread: 0,
      online: false,
      projectTitle: "طراحی سیستم مدیریت پروژه",
    },
    {
      id: 3,
      name: "فروشگاه‌های زنجیره‌ای ستاره",
      avatar: "/api/placeholder/40/40",
      userType: "کارفرما",
      industry: "خرده فروشی",
      lastMessage: "پیشنهاد قیمت شما تایید شد",
      time: "3 روز پیش",
      unread: 1,
      online: true,
      projectTitle: "توسعه اپلیکیشن موبایل فروشگاه",
    },
    {
      id: 4,
      name: "شرکت حسابداری نوین",
      avatar: "/api/placeholder/40/40",
      userType: "کارفرما",
      industry: "مالی و حسابداری",
      lastMessage: "زمان جلسه بعدی را تایید می‌کنید؟",
      time: "هفته پیش",
      unread: 0,
      online: false,
      projectTitle: "طراحی داشبورد مدیریت مالی",
    },
    {
      id: 5,
      name: "استودیو طراحی دیجیتال",
      avatar: "/api/placeholder/40/40",
      userType: "کارفرما",
      industry: "رسانه و تبلیغات",
      lastMessage: "لطفاً فایل‌های نهایی را ارسال کنید",
      time: "2 هفته پیش",
      unread: 0,
      online: true,
      projectTitle: "طراحی هویت بصری برند",
    },
  ]);

  // حالت انتخاب چت و نمایش صفحه چت
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeTab, setActiveTab] = useState("chats"); // 'chats' or 'projects'

  // انتخاب چت
  const handleSelectChat = (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    setSelectedChat(chat);

    // حذف پیام‌های خوانده نشده هنگام باز کردن چت
    if (chat && chat.unread > 0) {
      const updatedChats = chats.map((c) =>
        c.id === chatId ? { ...c, unread: 0 } : c
      );
      setChats(updatedChats);
    }
  };

  // بازگشت به لیست چت‌ها
  const handleBackToList = () => {
    setSelectedChat(null);
  };

  // تعداد کل پیام‌های خوانده نشده
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unread, 0);

  // جزء نمایش برای هر چت در لیست
  const ChatListItem = ({ chat }) => (
    <div
      className={`d-flex align-items-center p-3 border-bottom position-relative ${
        selectedChat?.id === chat.id ? "bg-light" : ""
      }`}
      onClick={() => handleSelectChat(chat.id)}
      style={{ cursor: "pointer" }}
    >
      <div className="position-relative me-3">
        <img
          src={chat.avatar}
          className="rounded-circle"
          alt={chat.name}
          width="50"
          height="50"
        />
        {chat.online && (
          <span
            className="position-absolute bottom-0 start-0 p-1 bg-success border border-light rounded-circle"
            style={{ width: "13px", height: "13px" }}
          ></span>
        )}
      </div>

      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">{chat.name}</h6>
          <small className="text-muted">{chat.time}</small>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-success me-2">{chat.projectTitle}</small>
            <small
              className="text-truncate"
              style={{ maxWidth: "180px", display: "inline-block" }}
            >
              {chat.lastMessage}
            </small>
          </div>
          {chat.unread > 0 && (
            <span className="badge bg-success rounded-pill">{chat.unread}</span>
          )}
        </div>
      </div>
    </div>
  );

  // نمونه پیام‌ها برای صفحه چت (بعداً با وب‌سوکت جایگزین می‌شود)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "employer",
      text: "سلام، من از شرکت آریا تک هستم",
      time: "10:30",
    },
    {
      id: 2,
      sender: "specialist",
      text: "سلام، خوشحالم از آشنایی با شما. من متخصص در زمینه توسعه وب هستم",
      time: "10:32",
    },
    {
      id: 3,
      sender: "employer",
      text: "ما دنبال یک توسعه‌دهنده فرانت‌اند برای پروژه جدیدمان هستیم",
      time: "10:35",
    },
    {
      id: 4,
      sender: "specialist",
      text: "من تجربه کار با React و Vue را دارم. می‌توانم اطلاعات بیشتری در مورد پروژه شما داشته باشم؟",
      time: "10:37",
    },
    {
      id: 5,
      sender: "employer",
      text: "بله، ما می‌خواهیم یک فروشگاه آنلاین با قابلیت سفارشی‌سازی محصولات طراحی کنیم",
      time: "10:40",
    },
  ]);

  // ارسال پیام جدید
  const [newMessage, setNewMessage] = useState("");
  const messageInputRef = useRef(null);

  // فوکوس خودکار روی فیلد ورودی پیام هنگام انتخاب چت
  useEffect(() => {
    if (selectedChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    const message = {
      id: messages.length + 1,
      sender: "specialist",
      text: newMessage,
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // فوکوس مجدد روی فیلد ورودی پس از ارسال پیام
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // نمونه پروژه‌های پیشنهادی
  const [suggestedProjects, setSuggestedProjects] = useState([
    {
      id: 101,
      title: "توسعه اپلیکیشن موبایل",
      company: "شرکت نوآوران دیجیتال",
      budget: "۱۵,۰۰۰,۰۰۰ تومان",
      deadline: "۲ ماه",
      skills: ["React Native", "Firebase", "UI/UX"],
      description: "توسعه اپلیکیشن موبایل برای سیستم مدیریت انبار",
      status: "باز",
    },
    {
      id: 102,
      title: "طراحی وب‌سایت شرکتی",
      company: "گروه صنعتی پیشرو",
      budget: "۸,۰۰۰,۰۰۰ تومان",
      deadline: "۱ ماه",
      skills: ["HTML/CSS", "JavaScript", "WordPress"],
      description: "طراحی وب‌سایت معرفی شرکت با قابلیت چندزبانه",
      status: "باز",
    },
    {
      id: 103,
      title: "توسعه پنل مدیریت",
      company: "استارتاپ هوشمند",
      budget: "۲۰,۰۰۰,۰۰۰ تومان",
      deadline: "۳ ماه",
      skills: ["React", "Node.js", "MongoDB"],
      description: "توسعه پنل مدیریت با امکان گزارش‌گیری و داشبورد تحلیلی",
      status: "نیاز به متخصص",
    },
  ]);

  // نمایش صفحه چت
  const ChatView = () => {
    if (!selectedChat) return null;

    return (
      <div className="d-flex flex-column h-100">
        {/* هدر چت */}
        <div className="bg-light p-3 d-flex align-items-center border-bottom">
          <button
            className="btn btn-sm btn-light me-2 d-md-none"
            onClick={handleBackToList}
          >
            <i className="bi bi-arrow-right"></i>
          </button>

          <div className="position-relative me-3">
            <img
              src={selectedChat.avatar}
              className="rounded-circle"
              alt={selectedChat.name}
              width="45"
              height="45"
            />
            {selectedChat.online && (
              <span
                className="position-absolute bottom-0 start-0 p-1 bg-success border border-light rounded-circle"
                style={{ width: "12px", height: "12px" }}
              ></span>
            )}
          </div>

          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">{selectedChat.name}</h6>
              <div>
                <button className="btn btn-sm btn-outline-success ms-2">
                  <i className="bi bi-telephone me-1"></i>
                  تماس
                </button>
                <button className="btn btn-sm btn-outline-primary ms-2">
                  <i className="bi bi-info-circle me-1"></i>
                  پروفایل
                </button>
              </div>
            </div>
            <div>
              <small className="text-muted">{selectedChat.industry}</small>
              <span className="mx-2">•</span>
              <small className="text-success">
                {selectedChat.projectTitle}
              </small>
            </div>
          </div>
        </div>

        {/* بدنه چت */}
        <div
          className="flex-grow-1 p-3 overflow-auto"
          style={{
            height: "400px",
            backgroundColor: "#f5f5f5",
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`d-flex mb-3 ${
                message.sender === "specialist"
                  ? "justify-content-end"
                  : "justify-content-start"
              }`}
            >
              <div
                className={`p-3 rounded-3 ${
                  message.sender === "specialist"
                    ? "bg-success text-white"
                    : "bg-white border"
                }`}
                style={{ maxWidth: "75%" }}
              >
                <div>{message.text}</div>
                <div className="text-end">
                  <small
                    className={
                      message.sender === "specialist"
                        ? "text-white-50"
                        : "text-muted"
                    }
                  >
                    {message.time}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* فرم ارسال پیام */}
        <div className="p-3 border-top bg-white">
          <form onSubmit={handleSendMessage} className="d-flex">
            <div className="btn-group dropup me-2">
              <button
                type="button"
                className="btn btn-light dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-paperclip"></i>
              </button>
              <ul className="dropdown-menu">
                <li>
                  <a className="dropdown-item" href="#">
                    <i className="bi bi-image me-2"></i>ارسال تصویر
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    <i className="bi bi-file-earmark me-2"></i>ارسال فایل
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    <i className="bi bi-currency-dollar me-2"></i>ارسال
                    پیش‌فاکتور
                  </a>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a className="dropdown-item" href="#">
                    <i className="bi bi-calendar-check me-2"></i>پیشنهاد جلسه
                  </a>
                </li>
              </ul>
            </div>

            <input
              type="text"
              className="form-control"
              placeholder="پیام خود را بنویسید..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              ref={messageInputRef}
              autoFocus={true}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-success ms-2"
              disabled={newMessage.trim() === ""}
            >
              ارسال
            </button>
          </form>
        </div>
      </div>
    );
  };

  // نمایش پروژه‌های پیشنهادی
  const ProjectsList = () => (
    <div className="p-0">
      {suggestedProjects.map((project) => (
        <div key={project.id} className="border-bottom p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0 fw-bold">{project.title}</h6>
            <span className="badge bg-info">{project.status}</span>
          </div>
          <div className="mb-2">
            <small className="text-muted">{project.company}</small>
          </div>
          <p className="small mb-2">{project.description}</p>
          <div className="d-flex flex-wrap mb-3">
            {project.skills.map((skill, index) => (
              <span key={index} className="badge bg-light text-dark me-1 mb-1">
                {skill}
              </span>
            ))}
          </div>
          <div className="d-flex justify-content-between small">
            <div>
              <i className="bi bi-cash-coin me-1"></i>
              {project.budget}
            </div>
            <div>
              <i className="bi bi-calendar-event me-1"></i>
              {project.deadline}
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-sm btn-success me-2">
              ارسال پیشنهاد
            </button>
            <button className="btn btn-sm btn-outline-secondary">
              جزئیات بیشتر
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h2 className="mb-4">پیام‌های من</h2>

      <div className="row">
        {/* لیست چت‌ها - در موبایل فقط زمانی نمایش داده می‌شود که چتی انتخاب نشده باشد */}
        <div
          className={`col-md-4 mb-4 mb-md-0 ${
            selectedChat ? "d-none d-md-block" : ""
          }`}
        >
          <div className="card">
            <div className="card-header bg-white p-0">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "chats" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("chats")}
                    style={{ cursor: "pointer" }}
                  >
                    گفتگوها
                    {totalUnread > 0 && (
                      <span className="badge bg-success rounded-pill ms-1">
                        {totalUnread}
                      </span>
                    )}
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "projects" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("projects")}
                    style={{ cursor: "pointer" }}
                  >
                    پروژه‌های پیشنهادی
                    <span className="badge bg-info rounded-pill ms-1">
                      {suggestedProjects.length}
                    </span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="card-body p-0">
              {activeTab === "chats" && (
                <>
                  <div className="p-2">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="جستجوی گفتگو..."
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                      >
                        <i className="bi bi-search"></i>
                      </button>
                    </div>
                  </div>
                  <div style={{ height: "450px", overflowY: "auto" }}>
                    {chats.length > 0 ? (
                      chats.map((chat) => (
                        <ChatListItem key={chat.id} chat={chat} />
                      ))
                    ) : (
                      <div className="text-center p-4 text-muted">
                        <p>هیچ گفتگویی یافت نشد</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "projects" && (
                <div style={{ height: "500px", overflowY: "auto" }}>
                  <ProjectsList />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* صفحه چت - در موبایل فقط زمانی نمایش داده می‌شود که چتی انتخاب شده باشد */}
        <div className={`col-md-8 ${selectedChat ? "" : "d-none d-md-block"}`}>
          <div className="card">
            <div className="card-body p-0" style={{ height: "530px" }}>
              {selectedChat ? (
                <ChatView />
              ) : (
                <div className="d-flex h-100 justify-content-center align-items-center text-muted">
                  <div className="text-center">
                    <div className="mb-3" style={{ fontSize: "3rem" }}>
                      <i className="bi bi-chat-dots"></i>
                    </div>
                    <p>یک گفتگو را برای شروع چت انتخاب کنید</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecialistDashboard;
