import React, { useState, useEffect } from 'react';
import api from './api/config';

const TestBackend = () => {
  const [status, setStatus] = useState('در حال بررسی اتصال به بک‌اند...');
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:5174/api/auth/test-connection', {
          method: 'GET'
        });
        
        const data = await response.json();
        
        setDetails({
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        if (response.ok) {
          setStatus('اتصال به بک‌اند برقرار است! ✅');
        } else {
          setStatus('خطا در اتصال به بک‌اند - پاسخ دریافت شد اما با خطا ❌');
          setError(data.message || 'خطای نامشخص');
        }
      } catch (err) {
        setStatus('خطا در اتصال به بک‌اند ❌');
        setError(err.message);
        setDetails({
          error: err.toString(),
          stack: err.stack
        });
      }
    };

    testConnection();
  }, []);

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h3>بررسی اتصال به بک‌اند</h3>
        </div>
        <div className="card-body">
          <h4 className={error ? 'text-danger' : 'text-success'}>
            {status}
          </h4>
          
          {error && (
            <div className="alert alert-danger mt-3">
              <h5>خطا:</h5>
              <p>{error}</p>
            </div>
          )}
          
          <div className="mt-4">
            <h5>اطلاعات تست اتصال:</h5>
            <ul className="list-group">
              <li className="list-group-item">
                <strong>آدرس API:</strong> http://localhost:5174/api
              </li>
            </ul>
          </div>
          
          {details && (
            <div className="mt-4">
              <h5>جزئیات پاسخ:</h5>
              <pre className="bg-light p-3" style={{ direction: 'ltr', textAlign: 'left' }}>
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4">
            <h5>راهنمای رفع مشکل:</h5>
            <ol className="list-group list-group-numbered">
              <li className="list-group-item">اطمینان حاصل کنید که سرور بک‌اند در حال اجراست.</li>
              <li className="list-group-item">بررسی کنید که MongoDB نصب و در حال اجرا باشد.</li>
              <li className="list-group-item">مطمئن شوید که پورت 5174 توسط برنامه دیگری مسدود نشده باشد.</li>
              <li className="list-group-item">فایل .env را در پوشه بک‌اند بررسی کنید.</li>
              <li className="list-group-item">بررسی کنید که مقادیر فیلدهای ثبت‌نام مطابق با مدل کاربر در بک‌اند باشد.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestBackend; 