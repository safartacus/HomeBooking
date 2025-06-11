const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const notificationService = require('../services/kafkaService');

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

// Get all bookings for current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    // Yaklaşan randevular (pending veya approved)
    const asHost = await Booking.find({
      host: userId,
      status: { $in: ['pending', 'approved'] }
    })
      .populate('guest', 'username')
      .populate('host', 'username')
      .sort({ startDate: 1 });

    const asGuest = await Booking.find({
      guest: userId,
      status: { $in: ['pending', 'approved'] }
    })
      .populate('guest', 'username')
      .populate('host', 'username')
      .sort({ startDate: 1 });

    res.json({ asHost, asGuest });
  } catch (error) {
    res.status(500).json({ message: 'Randevular yüklenirken bir hata oluştu' });
  }
});

// Create new booking
router.post('/', auth, async (req, res) => {
  try {
    const { hostId, startDate, endDate, message } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
    }

    // Check if host exists
    const host = await User.findById(hostId);
    if (!host) {
      return res.status(404).json({ message: 'Ev sahibi bulunamadı' });
    }

    // Create booking
    const booking = new Booking({
      guest: req.user._id,
      host: hostId,
      startDate,
      endDate,
      message
    });

    await booking.save();

    // Send notification
    await notificationService.sendBookingNotification(booking);

    res.status(201).json({
      message: 'Randevu başarıyla oluşturuldu',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Randevu oluşturulurken bir hata oluştu' });
  }
});

// Update booking status
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Randevu bulunamadı' });
    }

    // Check if user is the host
    if (booking.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    // Update status
    booking.status = status;
    await booking.save();

    // Send notification
    await notificationService.sendBookingStatusUpdate(booking);

    res.json({
      message: 'Randevu durumu güncellendi',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Randevu durumu güncellenirken bir hata oluştu' });
  }
});

// Ev sahibinin müsaitlik kontrolü
router.get('/availability', auth, async (req, res) => {
  try {
    const { hostId, startDate, endDate } = req.query;
    if (!hostId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Eksik parametre' });
    }
    const overlapping = await Booking.findOne({
      host: hostId,
      $or: [
        {
          startDate: { $lt: new Date(endDate) },
          endDate: { $gt: new Date(startDate) }
        }
      ],
      status: { $in: ['pending', 'approved'] }
    });
    res.json({ available: !overlapping });
  } catch (error) {
    res.status(500).json({ message: 'Müsaitlik kontrolü sırasında hata oluştu' });
  }
});

// Randevu oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, date, time, description } = req.body;

    // Randevu alan kişiyi kontrol et
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Randevu alan kişi bulunamadı' });
    }

    // Randevu oluştur
    const booking = new Booking({
      senderId: req.user._id,
      recipientId,
      date,
      time,
      description,
      status: 'pending'
    });

    await booking.save();

    // Bildirim gönder
    await notificationService.sendBookingNotification(booking);

    res.status(201).json({
      message: 'Randevu başarıyla oluşturuldu',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Randevu onayla/reddet
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Randevu bulunamadı' });
    }

    // Sadece randevu alan kişi onaylayabilir/reddedebilir
    if (booking.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    booking.status = status;
    await booking.save();

    // Onaylandıysa bildirim gönder
    if (status === 'approved') {
      await notificationService.sendBookingApprovalNotification(booking);
    }

    res.json({
      message: `Randevu ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`,
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcının randevularını getir
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const sentBookings = await Booking.find({ senderId: req.user._id })
      .populate('recipientId', 'username email profilePicture')
      .sort({ date: -1 });

    const receivedBookings = await Booking.find({ recipientId: req.user._id })
      .populate('senderId', 'username email profilePicture')
      .sort({ date: -1 });

    res.json({
      sentBookings,
      receivedBookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router; 