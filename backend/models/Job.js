const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان کار الزامی است'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'توضیحات کار الزامی است']
  },
  jobType: {
    type: String,
    required: [true, 'نوع کار الزامی است'],
    enum: ['نقاشی ساختمان', 'برق کشی', 'لوله کشی', 'کاشی کاری', 'نجاری', 'گچ کاری', 'سنگ کاری', 'تأسیسات', 'دیگر']
  },
  budget: {
    type: Number,
    required: [true, 'بودجه کار الزامی است']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    city: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    }
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'کارفرما باید مشخص شود']
  },
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'OPEN'
  },
  applicants: [{
    specialist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING'
    }
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
JobSchema.index({ location: '2dsphere' });

// Pre save hook to update job status
JobSchema.pre('save', function(next) {
  if (this.isModified('specialist') && this.specialist) {
    this.status = 'IN_PROGRESS';
  }
  
  if (this.isModified('endDate') && this.endDate) {
    this.status = 'COMPLETED';
  }
  
  next();
});

const Job = mongoose.model('Job', JobSchema);

module.exports = Job; 