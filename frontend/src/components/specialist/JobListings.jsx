import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllJobs, getFilteredJobs, applyForJob } from '../../api/jobService';
import { getCurrentUser } from '../../services/userStateManager';

const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    jobType: '',
    location: '',
    keyword: ''
  });
  const [applications, setApplications] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // دریافت آگهی‌های شغلی
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllJobs();
      
      if (result.success) {
        setJobs(result.data || []);
      } else {
        setError(result.message || 'خطا در دریافت آگهی‌های شغلی');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // اعمال فیلترها
  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // حذف فیلترهای خالی
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value)
      );
      
      const result = Object.keys(activeFilters).length > 0 
        ? await getFilteredJobs(activeFilters)
        : await getAllJobs();
      
      if (result.success) {
        setJobs(result.data || []);
      } else {
        setError(result.message || 'خطا در دریافت آگهی‌های شغلی');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // تغییر فیلترها
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // نمایش مودال درخواست همکاری
  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setApplicationMessage('');
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  // ارسال درخواست همکاری
  const handleSubmitApplication = async () => {
    if (!applicationMessage.trim()) {
      setModalError('لطفاً پیامی برای درخواست همکاری خود وارد کنید');
      return;
    }

    setSubmitLoading(true);
    setModalError('');
    
    try {
      const applicationData = {
        message: applicationMessage,
        proposedRate: 0, // در صورت نیاز می‌توان این فیلد را به فرم اضافه کرد
      };
      
      const result = await applyForJob(selectedJob._id, applicationData);
      
      if (result.success) {
        setApplications({
          ...applications,
          [selectedJob._id]: true
        });
        setModalSuccess('درخواست همکاری با موفقیت ارسال شد');
        
        // بستن مودال پس از 2 ثانیه
        setTimeout(() => {
          setShowModal(false);
        }, 2000);
      } else {
        setModalError(result.message || 'خطا در ارسال درخواست همکاری');
      }
    } catch (err) {
      setModalError('خطا در ارتباط با سرور');
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">آگهی‌های شغلی</h2>
      
      {/* فیلترهای جستجو */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">جستجو و فیلتر</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="form-group">
                <label className="form-label">نوع شغل</label>
                <select 
                  className="form-select" 
                  name="jobType"
                  value={filters.jobType}
                  onChange={handleFilterChange}
                >
                  <option value="">همه</option>
                  <option value="نقاشی ساختمان">نقاشی ساختمان</option>
                  <option value="برق کشی">برق کشی</option>
                  <option value="لوله کشی">لوله کشی</option>
                  <option value="کاشی کاری">کاشی کاری</option>
                  <option value="نجاری">نجاری</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-group">
                <label className="form-label">منطقه</label>
                <select 
                  className="form-select" 
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                >
                  <option value="">همه</option>
                  <option value="شمال شیراز">شمال شیراز</option>
                  <option value="جنوب شیراز">جنوب شیراز</option>
                  <option value="شرق شیراز">شرق شیراز</option>
                  <option value="غرب شیراز">غرب شیراز</option>
                  <option value="مرکز شیراز">مرکز شیراز</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-group">
                <label className="form-label">کلمه کلیدی</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="جستجو در عنوان و توضیحات"
                  name="keyword"
                  value={filters.keyword}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div className="col-12 text-end">
              <button 
                className="btn btn-primary"
                onClick={applyFilters}
                disabled={loading}
              >
                {loading ? 'در حال جستجو...' : 'اعمال فیلترها'}
              </button>
              <button 
                className="btn btn-outline-secondary ms-2"
                onClick={() => {
                  setFilters({
                    jobType: '',
                    location: '',
                    keyword: ''
                  });
                  loadJobs();
                }}
                disabled={loading}
              >
                حذف فیلترها
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* نمایش خطا */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {/* لیست آگهی‌ها */}
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">در حال بارگیری...</span>
          </div>
          <p className="mt-2">در حال دریافت آگهی‌های شغلی...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="alert alert-info" role="alert">
          هیچ آگهی شغلی یافت نشد. لطفاً فیلترهای جستجو را تغییر دهید یا بعداً تلاش کنید.
        </div>
      ) : (
        <div className="row">
          {jobs.map((job) => (
            <div className="col-md-6 mb-4" key={job._id}>
              <div className="card h-100">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{job.title}</h5>
                  <span className="badge bg-primary">{job.jobType}</span>
                </div>
                <div className="card-body">
                  <p className="card-text">{job.description.length > 150 
                    ? `${job.description.substring(0, 150)}...` 
                    : job.description}
                  </p>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <i className="bi bi-geo-alt-fill text-secondary me-1"></i>
                      {job.location}
                    </div>
                    <div className="me-3">
                      <i className="bi bi-cash text-secondary me-1"></i>
                      {job.budget ? `${job.budget} تومان` : 'توافقی'}
                    </div>
                    <div>
                      <i className="bi bi-calendar-event text-secondary me-1"></i>
                      {new Date(job.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">کارفرما: {job.employerName || 'ناشناس'}</span>
                    {applications[job._id] ? (
                      <span className="text-success">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        درخواست ارسال شد
                      </span>
                    ) : (
                      <button 
                        className="btn btn-success"
                        onClick={() => handleApplyClick(job)}
                      >
                        <i className="bi bi-send me-1"></i>
                        ارسال درخواست
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* مودال درخواست همکاری */}
      {showModal && selectedJob && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">درخواست همکاری: {selectedJob.title}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                  disabled={submitLoading}
                ></button>
              </div>
              <div className="modal-body">
                {modalSuccess ? (
                  <div className="alert alert-success" role="alert">
                    {modalSuccess}
                  </div>
                ) : (
                  <>
                    {modalError && (
                      <div className="alert alert-danger" role="alert">
                        {modalError}
                      </div>
                    )}
                    <div className="mb-3">
                      <label htmlFor="applicationMessage" className="form-label">پیام درخواست همکاری</label>
                      <textarea 
                        className="form-control"
                        id="applicationMessage"
                        rows="4"
                        placeholder="توضیحات خود را برای کارفرما بنویسید..."
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        disabled={submitLoading}
                      ></textarea>
                    </div>
                    {/* می‌توان فیلدهای بیشتری مثل نرخ پیشنهادی اضافه کرد */}
                  </>
                )}
              </div>
              {!modalSuccess && (
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowModal(false)}
                    disabled={submitLoading}
                  >
                    انصراف
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleSubmitApplication}
                    disabled={submitLoading}
                  >
                    {submitLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        در حال ارسال...
                      </>
                    ) : 'ارسال درخواست'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
    </div>
  );
};

export default JobListings; 