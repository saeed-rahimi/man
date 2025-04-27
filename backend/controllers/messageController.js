const Message = require('../models/Message');
const User = require('../models/User');

// ارسال پیام جدید
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver, content, relatedJob } = req.body;
    
    if (!receiver || !content) {
      return res.status(400).json({
        success: false,
        message: 'گیرنده و محتوای پیام الزامی هستند'
      });
    }
    
    // بررسی وجود گیرنده
    const receiverExists = await User.findById(receiver);
    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: 'گیرنده پیام یافت نشد'
      });
    }
    
    const newMessage = await Message.create({
      sender: req.user.id,
      receiver,
      content,
      relatedJob
    });
    
    // پوپولیت کردن اطلاعات فرستنده
    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: 'sender',
        select: 'name userType'
      })
      .populate({
        path: 'receiver',
        select: 'name userType'
      });
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// دریافت پیام‌های بین دو کاربر
exports.getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    
    // بررسی وجود کاربر
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'کاربر مورد نظر یافت نشد'
      });
    }
    
    // دریافت پیام‌ها
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate({
        path: 'sender',
        select: 'name userType'
      })
      .populate({
        path: 'receiver',
        select: 'name userType'
      })
      .populate({
        path: 'relatedJob',
        select: 'title'
      });
    
    // علامت گذاری پیام‌های خوانده نشده به عنوان خوانده شده
    await Message.updateMany(
      { sender: userId, receiver: currentUserId, read: false },
      { read: true }
    );
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// دریافت لیست گفتگوها
exports.getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    
    // پیدا کردن تمام پیام‌های مرتبط با کاربر فعلی
    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'sender',
        select: 'name userType'
      })
      .populate({
        path: 'receiver',
        select: 'name userType'
      });
    
    // گروه‌بندی پیام‌ها بر اساس مخاطب
    const conversations = {};
    
    messages.forEach(message => {
      let contactId;
      let contactInfo;
      
      if (message.sender._id.toString() === currentUserId) {
        contactId = message.receiver._id.toString();
        contactInfo = message.receiver;
      } else {
        contactId = message.sender._id.toString();
        contactInfo = message.sender;
      }
      
      if (!conversations[contactId]) {
        conversations[contactId] = {
          contact: contactInfo,
          lastMessage: message,
          unreadCount: message.sender._id.toString() !== currentUserId && !message.read ? 1 : 0
        };
      } else {
        // بررسی تاریخ پیام‌ها و تنظیم آخرین پیام
        if (message.createdAt > conversations[contactId].lastMessage.createdAt) {
          conversations[contactId].lastMessage = message;
        }
        
        // شمارش پیام‌های خوانده نشده
        if (message.sender._id.toString() !== currentUserId && !message.read) {
          conversations[contactId].unreadCount += 1;
        }
      }
    });
    
    // تبدیل آبجکت به آرایه
    const conversationArray = Object.values(conversations);
    
    // مرتب‌سازی بر اساس تاریخ آخرین پیام (جدیدترین اول)
    conversationArray.sort((a, b) => {
      return b.lastMessage.createdAt - a.lastMessage.createdAt;
    });
    
    res.status(200).json({
      success: true,
      count: conversationArray.length,
      data: conversationArray
    });
  } catch (error) {
    next(error);
  }
};

// دریافت تعداد پیام‌های خوانده نشده
exports.getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    
    const unreadCount = await Message.countDocuments({
      receiver: currentUserId,
      read: false
    });
    
    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    next(error);
  }
}; 