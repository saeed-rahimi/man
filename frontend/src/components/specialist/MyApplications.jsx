import React, { useState, useEffect } from 'react';
import { getUserApplications } from '../../api/jobService';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserApplications();
      
      if (result.success) {
        setApplications(result.data || []);
      } else {
        setError(result.message || 'خطا در دریافت درخواست‌های همکاری');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
      console.error(err);
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

  return (
    <div className="container mt-4">
      <h2 className="mb-4">درخواست‌های همکاری من</h2>
      
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
          شما هنوز درخواست همکاری ارسال نکرده‌اید. از بخش "آگهی‌های شغلی" می‌توانید برای مشاغل مورد نظر درخواست ارسال کنید.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-light">
              <tr>
                <th>عنوان آگهی</th>
                <th>کارفرما</th>
                <th>تاریخ ارسال</th>
                <th>وضعیت</th>
                <th>پیام من</th>
                <th>پاسخ کارفرما</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application._id}>
                  <td>
                    <a href={`/specialist-dashboard/jobs/${application.job._id}`} className="text-decoration-none">
                      {application.job.title}
                    </a>
                  </td>
                  <td>{application.employer.name}</td>
                  <td>{new Date(application.createdAt).toLocaleDateString('fa-IR')}</td>
                  <td>
                    <span className={`badge ${getStatusClass(application.status)}`}>
                      {getStatusText(application.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      data-bs-toggle="tooltip" 
                      data-bs-placement="top"
                      title={application.message}
                    >
                      مشاهده پیام
                    </button>
                  </td>
                  <td>
                    {application.employerResponse ? (
                      <button
                        className="btn btn-sm btn-outline-info"
                        data-bs-toggle="tooltip" 
                        data-bs-placement="top"
                        title={application.employerResponse}
                      >
                        مشاهده پاسخ
                      </button>
                    ) : (
                      <span className="text-muted">بدون پاسخ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* اطلاعات راهنما */}
      <div className="card mt-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">راهنمای وضعیت درخواست‌ها</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-2">
              <span className="badge bg-warning me-2">در انتظار بررسی</span>
              <span className="small">درخواست شما هنوز توسط کارفرما بررسی نشده است.</span>
            </div>
            <div className="col-md-3 mb-2">
              <span className="badge bg-success me-2">پذیرفته شده</span>
              <span className="small">کارفرما با درخواست شما موافقت کرده است.</span>
            </div>
            <div className="col-md-3 mb-2">
              <span className="badge bg-danger me-2">رد شده</span>
              <span className="small">کارفرما درخواست شما را رد کرده است.</span>
            </div>
            <div className="col-md-3 mb-2">
              <span className="badge bg-secondary me-2">لغو شده</span>
              <span className="small">این درخواست لغو شده است.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyApplications; 