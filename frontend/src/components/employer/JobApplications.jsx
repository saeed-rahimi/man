import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/config';

const JobApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchApplications();
  }, []);
  
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/applications/employer');
      
      if (response.data.success) {
        setApplications(response.data.data || []);
      } else {
        setError(response.data.message || 'خطا در دریافت درخواست‌ها');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (applicationId, newStatus, employerResponse) => {
    try {
      setLoading(true);
      
      const response = await api.patch(`/applications/${applicationId}/status`, {
        status: newStatus,
        employerResponse
      });
      
      if (response.data.success) {
        // به‌روزرسانی لیست درخواست‌ها
        setApplications(applications.map(app => 
          app._id === applicationId ? { ...app, status: newStatus, employerResponse } : app
        ));
      } else {
        setError(response.data.message || 'خطا در به‌روزرسانی وضعیت درخواست');
      }
    } catch (err) {
      console.error('Error updating application status:', err);
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };
  
  // تبدیل وضعیت درخواست به متن فارسی
  const getStatusText = (status) => {
    switch(status) {
      case 'PENDING':
        return 'در انتظار بررسی';
      case 'ACCEPTED':
        return 'پذیرفته شده';
      case 'REJECTED':
        return 'رد شده';
      case 'CANCELLED':
        return 'لغو شده';
      default:
        return 'نامشخص';
    }
  };
  
  // تبدیل وضعیت درخواست به کلاس CSS
  const getStatusClass = (status) => {
    switch(status) {
      case 'PENDING':
        return 'bg-warning';
      case 'ACCEPTED':
        return 'bg-success';
      case 'REJECTED':
        return 'bg-danger';
      case 'CANCELLED':
        return 'bg-secondary';
      default:
        return 'bg-light';
    }
  };
  
  // فیلتر کردن درخواست‌ها
  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);
  
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>درخواست‌های همکاری</h2>
        <div className="d-flex">
          <select 
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">همه درخواست‌ها</option>
            <option value="PENDING">در انتظار بررسی</option>
            <option value="ACCEPTED">پذیرفته شده</option>
            <option value="REJECTED">رد شده</option>
            <option value="CANCELLED">لغو شده</option>
          </select>
          <button 
            className="btn btn-outline-primary ms-2"
            onClick={() => fetchApplications()}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            بروزرسانی
          </button>
        </div>
      </div>
      
      {/* نمایش خطا */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {/* نمایش درخواست‌ها */}
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">در حال بارگیری...</span>
          </div>
          <p className="mt-2">در حال دریافت درخواست‌های همکاری...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="alert alert-info" role="alert">
          هنوز درخواست همکاری برای آگهی‌های شما ثبت نشده است.
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="alert alert-info" role="alert">
          هیچ درخواستی با این فیلتر یافت نشد.
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>آگهی</th>
                    <th>متخصص</th>
                    <th>تاریخ درخواست</th>
                    <th>وضعیت</th>
                    <th>پیام متخصص</th>
                    <th>پاسخ شما</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => (
                    <tr key={application._id}>
                      <td>
                        <a href={`/employer-dashboard/jobs/${application.job._id}`} className="text-decoration-none fw-bold">
                          {application.job.title}
                        </a>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{ width: '30px', height: '30px' }}>
                            {application.specialist.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{application.specialist.name}</div>
                            <small className="text-muted">{application.specialist.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(application.createdAt).toLocaleDateString('fa-IR')}</td>
                      <td>
                        <span className={`badge ${getStatusClass(application.status)}`}>
                          {getStatusText(application.status)}
                        </span>
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-primary"
                          data-bs-toggle="modal" 
                          data-bs-target={`#messageModal-${application._id}`}
                        >
                          مشاهده پیام
                        </button>
                        
                        {/* مودال پیام متخصص */}
                        <div className="modal fade" id={`messageModal-${application._id}`} tabIndex="-1" aria-labelledby={`messageModalLabel-${application._id}`} aria-hidden="true">
                          <div className="modal-dialog">
                            <div className="modal-content">
                              <div className="modal-header">
                                <h5 className="modal-title" id={`messageModalLabel-${application._id}`}>پیام متخصص</h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                              </div>
                              <div className="modal-body">
                                <div className="alert alert-light">
                                  {application.message || 'بدون پیام'}
                                </div>
                              </div>
                              <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">بستن</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {application.employerResponse ? (
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-info"
                            data-bs-toggle="modal" 
                            data-bs-target={`#responseModal-${application._id}`}
                          >
                            مشاهده پاسخ
                          </button>
                        ) : (
                          <span className="text-muted">بدون پاسخ</span>
                        )}
                        
                        {/* مودال پاسخ کارفرما */}
                        {application.employerResponse && (
                          <div className="modal fade" id={`responseModal-${application._id}`} tabIndex="-1" aria-labelledby={`responseModalLabel-${application._id}`} aria-hidden="true">
                            <div className="modal-dialog">
                              <div className="modal-content">
                                <div className="modal-header">
                                  <h5 className="modal-title" id={`responseModalLabel-${application._id}`}>پاسخ شما</h5>
                                  <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                  <div className="alert alert-light">
                                    {application.employerResponse}
                                  </div>
                                </div>
                                <div className="modal-footer">
                                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">بستن</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {application.status === 'PENDING' ? (
                          <div className="btn-group">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-success"
                              data-bs-toggle="modal" 
                              data-bs-target={`#acceptModal-${application._id}`}
                            >
                              پذیرش
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-sm btn-danger"
                              data-bs-toggle="modal" 
                              data-bs-target={`#rejectModal-${application._id}`}
                            >
                              رد
                            </button>
                            
                            {/* مودال پذیرش درخواست */}
                            <div className="modal fade" id={`acceptModal-${application._id}`} tabIndex="-1" aria-labelledby={`acceptModalLabel-${application._id}`} aria-hidden="true">
                              <div className="modal-dialog">
                                <div className="modal-content">
                                  <div className="modal-header">
                                    <h5 className="modal-title" id={`acceptModalLabel-${application._id}`}>پذیرش درخواست همکاری</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                  </div>
                                  <div className="modal-body">
                                    <p>آیا مطمئن هستید که می‌خواهید این درخواست همکاری را بپذیرید؟</p>
                                    <div className="mb-3">
                                      <label htmlFor={`accept-response-${application._id}`} className="form-label">پیام شما به متخصص (اختیاری)</label>
                                      <textarea 
                                        className="form-control" 
                                        id={`accept-response-${application._id}`} 
                                        rows="3"
                                        placeholder="می‌توانید پیامی برای متخصص بنویسید..."
                                      ></textarea>
                                    </div>
                                  </div>
                                  <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">انصراف</button>
                                    <button 
                                      type="button" 
                                      className="btn btn-success"
                                      onClick={() => {
                                        const response = document.getElementById(`accept-response-${application._id}`).value;
                                        handleStatusChange(application._id, 'ACCEPTED', response);
                                      }}
                                      data-bs-dismiss="modal"
                                    >
                                      تأیید و پذیرش
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* مودال رد درخواست */}
                            <div className="modal fade" id={`rejectModal-${application._id}`} tabIndex="-1" aria-labelledby={`rejectModalLabel-${application._id}`} aria-hidden="true">
                              <div className="modal-dialog">
                                <div className="modal-content">
                                  <div className="modal-header">
                                    <h5 className="modal-title" id={`rejectModalLabel-${application._id}`}>رد درخواست همکاری</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                  </div>
                                  <div className="modal-body">
                                    <p>آیا مطمئن هستید که می‌خواهید این درخواست همکاری را رد کنید؟</p>
                                    <div className="mb-3">
                                      <label htmlFor={`reject-reason-${application._id}`} className="form-label">دلیل رد درخواست (اختیاری)</label>
                                      <textarea 
                                        className="form-control" 
                                        id={`reject-reason-${application._id}`} 
                                        rows="3"
                                        placeholder="لطفاً دلیل رد درخواست را بنویسید..."
                                      ></textarea>
                                    </div>
                                  </div>
                                  <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">انصراف</button>
                                    <button 
                                      type="button" 
                                      className="btn btn-danger"
                                      onClick={() => {
                                        const reason = document.getElementById(`reject-reason-${application._id}`).value;
                                        handleStatusChange(application._id, 'REJECTED', reason);
                                      }}
                                      data-bs-dismiss="modal"
                                    >
                                      تأیید و رد درخواست
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                          >
                            {application.status === 'ACCEPTED' ? 'پذیرفته شده' : application.status === 'REJECTED' ? 'رد شده' : 'لغو شده'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplications; 