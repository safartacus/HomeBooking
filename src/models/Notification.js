const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Bildirimi alan kullanıcı
  type: { type: String, enum: ['booking_request', 'booking_approved', 'booking_status', 'booking_rejected'], required: true },
  message: { type: String, required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema); 