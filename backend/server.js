const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const employerRoutes = require('./routes/employers');
const specialistRoutes = require('./routes/specialists');
const messageRoutes = require('./routes/messages');

// Error handler
const { errorHandler } = require('./middlewares/error');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Base API route
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api/messages', messageRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('کاریاب ساختمان API');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'مسیر مورد نظر یافت نشد'
  });
});

// Error handling middleware
app.use(errorHandler);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Authentication event
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.join(`user-${decoded.id}`);
      socket.emit('authenticated', { success: true });
      console.log(`User authenticated: ${decoded.id}`);
    } catch (error) {
      socket.emit('error', { message: 'Authentication failed' });
    }
  });

  // Join room (for private messages)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  // Private message
  socket.on('private-message', (data) => {
    console.log('Private message received:', data);
    
    // استفاده از roomId ارسال شده یا ساخت یک رومآیدی بر اساس فرستنده و گیرنده
    const roomId = data.roomId || [socket.user.id, data.recipient].sort().join('-');
    
    console.log(`Sending message to room: ${roomId}`);
    
    // پیوستن به اتاق اگر قبلاً عضو نبوده
    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
    }
    
    // ارسال پیام به اتاق
    io.to(roomId).emit('private-message', {
      id: Date.now(),
      message: data.content || data.message,
      sender: socket.user.id,
      senderName: socket.user.name,
      timestamp: new Date(),
      roomId: roomId
    });
  });

  // New job notification
  socket.on('new-job', (jobData) => {
    console.log('New job notification received:', jobData);
    
    // Ensure the socket user is authorized (should be an employer)
    if (!socket.user || socket.user.userType !== 'employer') {
      console.error('Unauthorized job posting attempt');
      return socket.emit('error', { message: 'Unauthorized job posting' });
    }
    
    // Add additional info if not provided
    if (!jobData.employerId) {
      jobData.employerId = socket.user.id;
    }
    
    if (!jobData.employerName) {
      jobData.employerName = socket.user.name;
    }
    
    if (!jobData.createdAt) {
      jobData.createdAt = new Date();
    }
    
    // Broadcast to all specialists
    io.emit('new-job-posted', jobData);
    console.log('Job notification broadcast to all users');
  });

  // Job application notification
  socket.on('job-application', (applicationData) => {
    console.log('Job application notification received:', applicationData);
    
    // Ensure the socket user is authorized (should be a specialist)
    if (!socket.user || socket.user.userType !== 'specialist') {
      console.error('Unauthorized job application attempt');
      return socket.emit('error', { message: 'Unauthorized job application' });
    }
    
    // Add additional info if not provided
    if (!applicationData.specialistId) {
      applicationData.specialistId = socket.user.id;
    }
    
    if (!applicationData.specialistName) {
      applicationData.specialistName = socket.user.name;
    }
    
    if (!applicationData.appliedAt) {
      applicationData.appliedAt = new Date();
    }
    
    // Send to employer only using their user room
    const employerRoom = `user-${applicationData.employerId}`;
    console.log(`Sending job application notification to employer room: ${employerRoom}`);
    
    io.to(employerRoom).emit('new-job-application', applicationData);
  });

  // Job application accepted notification
  socket.on('application-accepted', (data) => {
    // Send to specialist only
    io.to(`user-${data.specialistId}`).emit('job-application-accepted', data);
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction_job_platform')
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Server
const PORT = process.env.PORT || 5174;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 