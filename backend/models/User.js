const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام کاربری الزامی است'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'ایمیل الزامی است'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'ایمیل وارد شده معتبر نیست']
  },
  password: {
    type: String,
    required: [true, 'رمز عبور الزامی است'],
    minlength: [8, 'رمز عبور باید حداقل 8 کاراکتر باشد'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'شماره تلفن الزامی است'],
    validate: {
      validator: function(v) {
        return /^09[0-9]{9}$/.test(v);
      },
      message: props => `${props.value} یک شماره تلفن معتبر نیست`
    }
  },
  userType: {
    type: String,
    enum: ['specialist', 'employer'],
    required: [true, 'نوع کاربر باید مشخص شود']
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
      // required: true
    },
    province: {
      type: String,
      // required: true
    }
  },
  // اطلاعات مختص متخصص
  skills: [{
    type: String
  }],
  experience: {
    type: Number,
    min: 0
  },
  age: {
    type: Number,
    min: 18
  },
  education: {
    type: String
  },
  availability: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  // اطلاعات مختص کارفرما
  companyName: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
UserSchema.index({ location: '2dsphere' });

// رمزنگاری رمز عبور قبل از ذخیره
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified
  if (!this.isModified('password')) return next();
  
  // Hash the password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// متد مقایسه رمز عبور
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 