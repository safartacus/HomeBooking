const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Lütfen giriş yapın' });
  }
};

// Bildirimleri listele
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('booking');
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Bildirimler yüklenemedi' });
  }
});

// Bildirimi okundu işaretle
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Okundu olarak işaretlendi' });
  } catch (error) {
    res.status(500).json({ message: 'İşlem başarısız' });
  }
});

// Booking ID'ye göre bildirimi okundu işaretle
router.patch('/booking/:bookingId/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { 
        booking: req.params.bookingId, 
        user: req.user._id,
        type: 'booking_request'
      }, 
      { isRead: true }
    );
    res.json({ message: 'Bildirim okundu olarak işaretlendi' });
  } catch (error) {
    res.status(500).json({ message: 'İşlem başarısız' });
  }
});

// Randevuyu onayla/reddet (bildirim üzerinden)
router.post('/:id/booking-action', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'approved' veya 'rejected'
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Bildirim bulunamadı' });
    const booking = await Booking.findById(notification.booking);
    if (!booking) return res.status(404).json({ message: 'Randevu bulunamadı' });
    if (booking.host.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Yetkisiz' });
    booking.status = action;
    await booking.save();
    notification.isRead = true;
    await notification.save();
    res.json({ message: 'Randevu durumu güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'İşlem başarısız' });
  }
});

module.exports = router; 