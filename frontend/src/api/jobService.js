import api from './config';

// دریافت همه آگهی‌های شغلی
export const getAllJobs = async () => {
  try {
    const response = await api.get('/jobs');
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در دریافت آگهی‌های شغلی'
      };
    }
  } catch (error) {
    console.error('Get all jobs error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// دریافت آگهی‌های شغلی با فیلتر
export const getFilteredJobs = async (filters) => {
  try {
    const response = await api.get('/jobs/filter', { params: filters });
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در دریافت آگهی‌های شغلی'
      };
    }
  } catch (error) {
    console.error('Get filtered jobs error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// دریافت جزئیات یک آگهی شغلی
export const getJobDetails = async (jobId) => {
  try {
    const response = await api.get(`/jobs/${jobId}`);
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در دریافت جزئیات آگهی'
      };
    }
  } catch (error) {
    console.error('Get job details error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// ارسال درخواست همکاری برای یک آگهی
export const applyForJob = async (jobId, applicationData) => {
  try {
    const response = await api.post(`/applications/apply/${jobId}`, applicationData);
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: 'درخواست همکاری با موفقیت ارسال شد'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در ارسال درخواست همکاری'
      };
    }
  } catch (error) {
    console.error('Apply for job error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
};

// دریافت درخواست‌های همکاری کاربر
export const getUserApplications = async () => {
  try {
    const response = await api.get('/applications/my-applications');
    
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'خطا در دریافت درخواست‌های همکاری'
      };
    }
  } catch (error) {
    console.error('Get user applications error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'خطا در ارتباط با سرور'
    };
  }
}; 