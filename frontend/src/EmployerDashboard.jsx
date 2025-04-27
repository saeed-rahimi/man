import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";
import io from "socket.io-client";
import { logout } from "./api/authService";
import { getCurrentUser } from "./services/userStateManager";
import JobApplications from "./components/employer/JobApplications";

const EmployerDashboard = () => {
  const [user, setUser] = useState(getCurrentUser());
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("post-job");
  const [selectedChat, setSelectedChat] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [jobApplicants, setJobApplicants] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    jobType: "",
    budget: "",
    location: {
      coordinates: [],
      city: "",
      province: "",
    },
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // اطمینان از اینکه کاربر کارفرما است
    if (!user.isLoggedIn || user.userType !== "employer") {
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

      console.log("Fetching jobs for employer...");

      try {
        const response = await axios.get(`/api/employers/my-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Employer jobs loaded:", response.data.data.length);
        setMyJobs(response.data.data);

        // Process job applicants for notification state
        const applicantsMap = {};

        // Also update specialists for chat
        const allSpecialists = [];

        response.data.data.forEach((job) => {
          if (job.applicants && job.applicants.length > 0) {
            applicantsMap[job._id] = job.applicants;

            // Add each specialist to chat list
            job.applicants.forEach((applicant) => {
              if (applicant.specialist && applicant.specialist._id) {
                allSpecialists.push({
                  id: applicant.specialist._id,
                  name: applicant.specialist.username,
                  job: applicant.specialist.job || "متخصص",
                  lastSeen: "آنلاین",
                });
              }
            });
          }

          // If job has an assigned specialist, add them too
          if (job.specialist && job.specialist._id) {
            allSpecialists.push({
              id: job.specialist._id,
              name: job.specialist.username,
              job: job.specialist.job || "متخصص",
              lastSeen: "آنلاین",
            });
          }
        });

        // Remove duplicates by ID and update state
        const uniqueSpecialists = [];
        const specialistIds = new Set();

        allSpecialists.forEach((spec) => {
          if (!specialistIds.has(spec.id)) {
            specialistIds.add(spec.id);
            uniqueSpecialists.push(spec);
          }
        });

        setSpecialists(uniqueSpecialists);
        setJobApplicants(applicantsMap);
      } catch (error) {
        console.error("Error fetching jobs:", error);
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

    // Listen for new job applications
    socket.on("new-job-application", (applicationData) => {
      // Update job applicants list
      setJobApplicants((prevApplicants) => {
        const jobId = applicationData.jobId;
        const updatedApplicants = { ...prevApplicants };

        if (!updatedApplicants[jobId]) {
          updatedApplicants[jobId] = [];
        }

        // Add new applicant if not already in the list
        const exists = updatedApplicants[jobId].some(
          (applicant) => applicant.specialistId === applicationData.specialistId
        );

        if (!exists) {
          updatedApplicants[jobId].push({
            specialistId: applicationData.specialistId,
            specialistName: applicationData.specialistName,
            appliedAt: applicationData.appliedAt,
            notes: applicationData.notes,
            specialistInfo: applicationData.specialistInfo,
          });
        }

        // Show notification
        setNotification({
          type: "new-application",
          message: `درخواست جدید برای "${applicationData.jobTitle}" از طرف ${applicationData.specialistName}`,
          time: new Date(),
        });

        return updatedApplicants;
      });

      // Update specialists list for chat
      setSpecialists((prev) => {
        const updatedSpecialists = [...prev];
        const specialistIndex = updatedSpecialists.findIndex(
          (spec) => spec.id === applicationData.specialistId
        );

        if (specialistIndex >= 0) {
          // Update existing specialist
          updatedSpecialists[specialistIndex].hasNewApplication = true;
        } else {
          // Add new specialist to chat list
          updatedSpecialists.push({
            id: applicationData.specialistId,
            name: applicationData.specialistName,
            lastSeen: "آنلاین",
            hasNewApplication: true,
            job: applicationData.specialistInfo?.job || "متخصص",
          });
        }

        return updatedSpecialists;
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
            sender: "specialist",
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

        // Update specialists list to show unread indicator
        setSpecialists((prev) => {
          const updatedSpecialists = [...prev];
          const specialistIndex = updatedSpecialists.findIndex(
            (spec) => spec.id === messageData.sender
          );

          if (specialistIndex >= 0) {
            updatedSpecialists[specialistIndex].hasUnread = true;
          } else {
            // Add new specialist to chat list
            updatedSpecialists.push({
              id: messageData.sender,
              name: messageData.senderName,
              lastSeen: "آنلاین",
              hasUnread: true,
              job: "متخصص",
            });
          }

          return updatedSpecialists;
        });
      }
    });

    return () => {
      socket.off("new-job-application");
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

  // ثبت آگهی کار جدید
  const handlePostJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    console.log("e", formData);
    const transformedData = {};

    formData.forEach((value, key) => {
      if (key === "location") {
        // تبدیل location به شکل مورد نظر
        const [province, city] = value.split(" ");
        transformedData[key] = {
          coordinates: [],
          city: city || "", // اگر city وجود نداشت، خالی باشد
          province: province || "", // اگر province وجود نداشت، خالی باشد
        };
      } else {
        // برای سایر فیلدها، مقدار را به صورت عادی ذخیره کن
        transformedData[key] = value;
      }
    });
    console.log("transformedData", transformedData);

    try {
      const token = localStorage.getItem("token");

      console.log("Sending job data:", transformedData);

      // Send request to server
      const res = await axios.post(`/api/jobs`, transformedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Job created successfully:", res.data);

      const newJob = res.data.data;

      // Add job to my jobs list
      setMyJobs((prev) => [newJob, ...prev]);

      // Notify specialists via socket
      if (socket) {
        const jobNotification = {
          jobId: newJob._id,
          title: newJob.title,
          jobType: newJob.jobType,
          budget: newJob.budget,
          location: newJob.location,
          employerId: userData._id,
          employerName: userData.name,
          createdAt: newJob.createdAt,
        };

        socket.emit("new-job", jobNotification);
        console.log("Job notification sent via socket:", jobNotification);
      }

      // Reset form
      setJobForm({
        title: "",
        description: "",
        jobType: "",
        budget: "",
        location: {
          coordinates: [],
          city: "",
          province: "",
        },
      });

      // Show notification
      setNotification({
        type: "job-posted",
        message: "آگهی کار جدید با موفقیت ثبت شد",
        time: new Date(),
      });

      // Switch to my jobs tab
      setActiveTab("my-jobs");
    } catch (error) {
      console.error("Error posting job:", error.response?.data || error);
      setNotification({
        type: "error",
        message:
          error.response?.data?.message ||
          "خطا در ثبت آگهی. لطفاً همه فیلدها را به درستی تکمیل کنید.",
        time: new Date(),
      });
    }
  };

  // پذیرش متخصص برای کار
  const handleAcceptSpecialist = async (jobId, specialistId) => {
    try {
      const token = localStorage.getItem("token");

      console.log(`Accepting specialist ${specialistId} for job ${jobId}`);

      // Find job and specialist details
      const job = myJobs.find((j) => j._id === jobId);
      if (!job) {
        throw new Error("آگهی مورد نظر یافت نشد");
      }

      const applicant = job.applicants?.find(
        (app) => app.specialist._id === specialistId
      );
      if (!applicant) {
        throw new Error("متخصص مورد نظر در لیست درخواست‌ها یافت نشد");
      }

      // Send request to server
      const response = await axios.put(
        `/api/jobs/${jobId}/accept/${specialistId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Specialist accepted response:", response.data);

      // Refresh job list
      try {
        const jobsResponse = await axios.get("/api/employers/my-jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (jobsResponse.data && jobsResponse.data.data) {
          setMyJobs(jobsResponse.data.data);
        }
      } catch (refreshError) {
        console.error(
          "Error refreshing jobs after accepting specialist:",
          refreshError
        );
      }

      // Notify specialist via socket
      if (socket && job) {
        const acceptanceData = {
          jobId: jobId,
          jobTitle: job.title,
          specialistId: specialistId,
          employerId: userData._id,
          employerName: userData.name,
          companyName: userData.companyName || "",
          startDate: new Date(),
        };

        console.log("Sending acceptance notification:", acceptanceData);
        socket.emit("application-accepted", acceptanceData);
      }

      // Update job in my jobs list
      setMyJobs((prev) =>
        prev.map((j) => {
          if (j._id === jobId) {
            return {
              ...j,
              status: "IN_PROGRESS",
              specialist: specialistId,
            };
          }
          return j;
        })
      );

      // Show notification
      setNotification({
        type: "specialist-accepted",
        message: "متخصص با موفقیت برای انجام کار انتخاب شد",
        time: new Date(),
      });
    } catch (error) {
      console.error(
        "Error accepting specialist:",
        error.response?.data || error
      );
      setNotification({
        type: "error",
        message: error.response?.data?.message || "خطا در انتخاب متخصص",
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

  // Handle form input changes
  const handleJobFormChange = (e) => {
    const { name, value } = e.target;

    if (name.includes("location.")) {
      const locationField = name.split(".")[1];
      setJobForm((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else if (name === "budget") {
      setJobForm((prev) => ({
        ...prev,
        [name]: parseInt(value),
      }));
    } else {
      setJobForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Use browser geolocation API to get current coordinates
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setJobForm((prev) => ({
            ...prev,
            location: {
              ...prev.location,
              coordinates: [
                position.coords.longitude,
                position.coords.latitude,
              ],
            },
          }));

          setNotification({
            type: "success",
            message: "موقعیت مکانی شما با موفقیت دریافت شد",
            time: new Date(),
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setNotification({
            type: "error",
            message: "خطا در دریافت موقعیت مکانی",
            time: new Date(),
          });
        }
      );
    } else {
      setNotification({
        type: "error",
        message: "مرورگر شما از سرویس موقعیت‌یابی پشتیبانی نمی‌کند",
        time: new Date(),
      });
    }
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
              <h5 className="mt-2">{user.username || "کاربر کارفرما"}</h5>
              <p className="text-muted">
                {user.userType === "employer" ? "کارفرما" : ""}
              </p>
            </div>

            <ul className="nav flex-column">
              <li className="nav-item">
                <Link to="/employer-dashboard" className="nav-link active">
                  <i className="bi bi-house-door me-2"></i>
                  داشبورد
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/employer-dashboard/post-job" className="nav-link">
                  <i className="bi bi-plus-square me-2"></i>
                  ثبت آگهی جدید
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/employer-dashboard/my-jobs" className="nav-link">
                  <i className="bi bi-briefcase me-2"></i>
                  آگهی‌های من
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/employer-dashboard/applications"
                  className="nav-link"
                >
                  <i className="bi bi-people me-2"></i>
                  درخواست‌های همکاری
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/employer-dashboard/profile" className="nav-link">
                  <i className="bi bi-person me-2"></i>
                  پروفایل من
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/employer-dashboard/messages" className="nav-link">
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
            <Route
              path="/"
              element={
                <EmployerHome user={user} handlePostJob={handlePostJob} />
              }
            />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/my-jobs" element={<MyJobs />} />
            <Route path="/applications" element={<JobApplications />} />
            <Route path="/profile" element={<EmployerProfile user={user} />} />
            <Route path="/messages" element={<EmployerMessages />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// کامپوننت صفحه اصلی داشبورد
function EmployerHome({ user, handlePostJob }) {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>داشبورد کارفرما</h2>
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
                <h5 className="card-title">آگهی‌های فعال</h5>
                <h2 className="mb-0">3</h2>
                <p className="card-text mb-0">آگهی</p>
              </div>
            </div>
            <div className="card-footer bg-primary border-0">
              <Link
                to="/employer-dashboard/my-jobs"
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
              <i className="bi bi-people fs-1 me-3"></i>
              <div>
                <h5 className="card-title">درخواست‌های همکاری</h5>
                <h2 className="mb-0">8</h2>
                <p className="card-text mb-0">درخواست جدید</p>
              </div>
            </div>
            <div className="card-footer bg-success border-0">
              <Link
                to="/employer-dashboard/applications"
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
                <h2 className="mb-0">2</h2>
                <p className="card-text mb-0">پیام جدید</p>
              </div>
            </div>
            <div className="card-footer bg-info border-0">
              <Link
                to="/employer-dashboard/messages"
                className="text-white text-decoration-none small"
              >
                مشاهده پیام‌ها
                <i className="bi bi-chevron-left ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* بخش ایجاد آگهی سریع */}
      <form onSubmit={handlePostJob}>
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">ایجاد آگهی جدید</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">عنوان آگهی</label>
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  placeholder="مثال: نیاز به نقاش ساختمان"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">نوع شغل</label>
                <select name="jobType" className="form-select">
                  <option value="">انتخاب کنید</option>
                  <option value="نقاشی ساختمان">نقاشی ساختمان</option>
                  <option value="برق کشی">برق کشی</option>
                  <option value="لوله کشی">لوله کشی</option>
                  <option value="کاشی کاری">کاشی کاری</option>
                  <option value="نجاری">نجاری</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">منطقه</label>
                <select name="location" className="form-select">
                  <option value="">انتخاب کنید</option>
                  <option value="شمال شیراز">شمال شیراز</option>
                  <option value="جنوب شیراز">جنوب شیراز</option>
                  <option value="شرق شیراز">شرق شیراز</option>
                  <option value="غرب شیراز">غرب شیراز</option>
                  <option value="مرکز شیراز">مرکز شیراز</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">بودجه (تومان)</label>
                <input
                  name="budget"
                  type="number"
                  className="form-control"
                  placeholder="مثال: 5000000"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">توضیحات</label>
              <textarea
                name="description"
                className="form-control"
                rows="3"
                placeholder="جزئیات پروژه را شرح دهید..."
              ></textarea>
            </div>
            <div className="text-end">
              <Link
                to="/employer-dashboard/post-job"
                className="btn btn-outline-secondary me-2"
              >
                تکمیل اطلاعات بیشتر
              </Link>
              <button type="submit" className="btn btn-primary">
                ثبت آگهی
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* درخواست‌های اخیر */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">درخواست‌های همکاری اخیر</h5>
          <Link
            to="/employer-dashboard/applications"
            className="btn btn-sm btn-primary"
          >
            مشاهده همه
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="list-group list-group-flush">
            <Link
              to="/employer-dashboard/applications"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <p className="mb-1">
                  <strong>علی محمدی</strong> برای آگهی{" "}
                  <strong>نقاشی ساختمان مسکونی</strong>
                </p>
                <small className="text-muted">۲ ساعت پیش</small>
              </div>
              <span className="badge bg-warning">در انتظار بررسی</span>
            </Link>
            <Link
              to="/employer-dashboard/applications"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <p className="mb-1">
                  <strong>محمد رضایی</strong> برای آگهی{" "}
                  <strong>برق کشی ساختمان تجاری</strong>
                </p>
                <small className="text-muted">۵ ساعت پیش</small>
              </div>
              <span className="badge bg-warning">در انتظار بررسی</span>
            </Link>
            <Link
              to="/employer-dashboard/applications"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div>
                <p className="mb-1">
                  <strong>حسین احمدی</strong> برای آگهی{" "}
                  <strong>نقاشی ساختمان مسکونی</strong>
                </p>
                <small className="text-muted">دیروز</small>
              </div>
              <span className="badge bg-success">پذیرفته شده</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// کامپوننت‌های نمونه (می‌توان بعداً به فایل‌های جداگانه منتقل کرد)
function PostJob() {
  return (
    <div>
      <h2 className="mb-4">ثبت آگهی جدید</h2>
      <div className="card">
        <div className="card-body">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">ایجاد آگهی جدید</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">عنوان آگهی</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: نیاز به نقاش ساختمان"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">نوع شغل</label>
                  <select className="form-select">
                    <option value="">انتخاب کنید</option>
                    <option value="نقاشی ساختمان">نقاشی ساختمان</option>
                    <option value="برق کشی">برق کشی</option>
                    <option value="لوله کشی">لوله کشی</option>
                    <option value="کاشی کاری">کاشی کاری</option>
                    <option value="نجاری">نجاری</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">منطقه</label>
                  <select className="form-select">
                    <option value="">انتخاب کنید</option>
                    <option value="شمال شیراز">شمال شیراز</option>
                    <option value="جنوب شیراز">جنوب شیراز</option>
                    <option value="شرق شیراز">شرق شیراز</option>
                    <option value="غرب شیراز">غرب شیراز</option>
                    <option value="مرکز شیراز">مرکز شیراز</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">بودجه (تومان)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="مثال: 5000000"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">توضیحات</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="جزئیات پروژه را شرح دهید..."
                ></textarea>
              </div>
              <div className="text-end">
                <Link
                  to="/employer-dashboard/post-job"
                  className="btn btn-outline-secondary me-2"
                >
                  تکمیل اطلاعات بیشتر
                </Link>
                <button type="submit" className="btn btn-primary">
                  ثبت آگهی2
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyJobs() {
  return (
    <div>
      <h2 className="mb-4">آگهی‌های من</h2>
    </div>
  );
}

// function JobApplications() {
//   return (
//     <div>
//       <h2 className="mb-4">آگهی‌های من</h2>
//     </div>
//   );
// }

function EmployerProfile({ user }) {
  return (
    <div>
      <h2 className="mb-4">پروفایل من</h2>
      <div className="card">
        <div className="card-body">
          <div className="mb-3">
            <h5 className="text-secondary">اطلاعات شخصی</h5>
            <div className="row">
              <div className="col-md-6 mb-2">
                <label className="fw-bold">نام:</label>
                <p>{user.name || "نام وارد نشده است"}</p>
              </div>
              <div className="col-md-6 mb-2">
                <label className="fw-bold">ایمیل:</label>
                <p>{user.email || "ایمیل وارد نشده است"}</p>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-2">
                <label className="fw-bold">رمز عبور:</label>
                <p>
                  •••••••••{" "}
                  <button className="btn btn-sm btn-outline-secondary ms-2">
                    تغییر رمز عبور
                  </button>
                </p>
              </div>
              <div className="col-md-6 mb-2">
                <label className="fw-bold">شماره تلفن:</label>
                <p>{user.phone || "شماره تلفن وارد نشده است"}</p>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <h5 className="text-secondary">اطلاعات کارفرما</h5>
            <div className="row">
              <div className="col-md-6 mb-2">
                <label className="fw-bold">نوع کاربر:</label>
                <p>کارفرما</p>
              </div>
              <div className="col-md-6 mb-2">
                <label className="fw-bold">نام شرکت:</label>
                <p>{user.companyName || "نام شرکت وارد نشده است"}</p>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end">
            <button className="btn btn-primary">ویرایش اطلاعات</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployerMessages() {
  // نمونه دیتا برای نمایش (بعداً با وب‌سوکت جایگزین می‌شود)
  const [chats, setChats] = useState([
    {
      id: 1,
      name: "امیر حسینی",
      avatar: "/api/placeholder/40/40",
      userType: "متخصص",
      specialty: "برنامه‌نویس فرانت‌اند",
      lastMessage: "سلام، من آماده شروع پروژه هستم",
      time: "12:45",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "سارا محمدی",
      avatar: "/api/placeholder/40/40",
      userType: "متخصص",
      specialty: "طراح گرافیک",
      lastMessage: "فایل‌های طراحی را برای شما ارسال کردم",
      time: "دیروز",
      unread: 0,
      online: false,
    },
    {
      id: 3,
      name: "علی رضایی",
      avatar: "/api/placeholder/40/40",
      userType: "متخصص",
      specialty: "برنامه‌نویس بک‌اند",
      lastMessage: "لطفاً اطلاعات دیتابیس را برای من ارسال کنید",
      time: "2 روز پیش",
      unread: 5,
      online: false,
    },
    {
      id: 4,
      name: "زهرا کریمی",
      avatar: "/api/placeholder/40/40",
      userType: "متخصص",
      specialty: "مدیر پروژه",
      lastMessage: "جلسه بعدی ما چه زمانی خواهد بود؟",
      time: "3 روز پیش",
      unread: 0,
      online: true,
    },
    {
      id: 5,
      name: "محمد احمدی",
      avatar: "/api/placeholder/40/40",
      userType: "متخصص",
      specialty: "متخصص سئو",
      lastMessage: "گزارش تحلیل سایت آماده شد",
      time: "هفته پیش",
      unread: 0,
      online: false,
    },
  ]);

  // حالت انتخاب چت و نمایش صفحه چت
  const [selectedChat, setSelectedChat] = useState(null);

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
            <small className="text-primary me-2">{chat.specialty}</small>
            <small
              className="text-truncate"
              style={{ maxWidth: "180px", display: "inline-block" }}
            >
              {chat.lastMessage}
            </small>
          </div>
          {chat.unread > 0 && (
            <span className="badge bg-primary rounded-pill">{chat.unread}</span>
          )}
        </div>
      </div>
    </div>
  );

  // نمونه پیام‌ها برای صفحه چت (بعداً با وب‌سوکت جایگزین می‌شود)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "specialist",
      text: "سلام، من متخصص مورد نظر شما هستم",
      time: "10:30",
    },
    {
      id: 2,
      sender: "employer",
      text: "سلام، خوش آمدید. در مورد پروژه‌ای که در سایت ثبت کردم می‌خواستم صحبت کنیم",
      time: "10:32",
    },
    {
      id: 3,
      sender: "specialist",
      text: "بله، من پروژه شما را دیدم و آماده همکاری هستم",
      time: "10:35",
    },
    {
      id: 4,
      sender: "employer",
      text: "عالیه! می‌تونید یک برآورد زمانی برای پروژه به من بدید؟",
      time: "10:40",
    },
    {
      id: 5,
      sender: "specialist",
      text: "بله، با توجه به توضیحات شما، حدود 2 هفته زمان نیاز دارم. البته اگر مشخصات دقیق‌تری داشته باشم می‌تونم برآورد دقیق‌تری ارائه بدم",
      time: "10:45",
    },
  ]);

  // ارسال پیام جدید
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    const message = {
      id: messages.length + 1,
      sender: "employer",
      text: newMessage,
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

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

          <div>
            <h6 className="mb-0 fw-bold">{selectedChat.name}</h6>
            <small className="text-primary">{selectedChat.specialty}</small>
            <small className="text-muted ms-2">
              {selectedChat.online ? "آنلاین" : "آفلاین"}
            </small>
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
                message.sender === "employer"
                  ? "justify-content-end"
                  : "justify-content-start"
              }`}
            >
              <div
                className={`p-3 rounded-3 ${
                  message.sender === "employer"
                    ? "bg-primary text-white"
                    : "bg-white border"
                }`}
                style={{ maxWidth: "75%" }}
              >
                <div>{message.text}</div>
                <div className="text-end">
                  <small
                    className={
                      message.sender === "employer"
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
            <input
              type="text"
              className="form-control"
              placeholder="پیام خود را بنویسید..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary ms-2"
              disabled={newMessage.trim() === ""}
            >
              ارسال
            </button>
          </form>
        </div>
      </div>
    );
  };

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
            <div className="card-header bg-white">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="جستجوی گفتگو..."
                />
                <button className="btn btn-outline-secondary" type="button">
                  <i className="bi bi-search"></i>
                </button>
              </div>
            </div>
            <div
              className="card-body p-0"
              style={{ height: "500px", overflowY: "auto" }}
            >
              {chats.length > 0 ? (
                chats.map((chat) => <ChatListItem key={chat.id} chat={chat} />)
              ) : (
                <div className="text-center p-4 text-muted">
                  <p>هیچ گفتگویی یافت نشد</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* صفحه چت - در موبایل فقط زمانی نمایش داده می‌شود که چتی انتخاب شده باشد */}
        <div className={`col-md-8 ${selectedChat ? "" : "d-none d-md-block"}`}>
          <div className="card">
            <div className="card-body p-0" style={{ height: "500px" }}>
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

export default EmployerDashboard;
