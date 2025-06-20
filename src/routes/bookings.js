const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const notificationService = require('../services/kafkaService');
const { io, userSockets } = require('../app');
const Notification = require('../models/Notification');

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
    const { hostId, startDate, endDate, message, arrivalType, guestCount } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
    }

    // Validate guest count
    if (!guestCount || guestCount < 1 || guestCount > 20) {
      return res.status(400).json({ message: 'Misafir sayısı 1-20 arasında olmalıdır' });
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
      message,
      arrivalType,
      guestCount
    });

    await booking.save();
    console.log("booking created",booking);
    console.log("=== Booking oluşturuldu, bildirim gönderiliyor ===");
    // Send notification
    await notificationService.sendBookingNotification(booking);
    console.log("=== Bildirim gönderme tamamlandı ===");

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
    console.log("=== Booking durumu güncellendi:", status, "===");

    // Send notification
    if (status === 'approved') {
      console.log("=== Booking onaylandı, onay bildirimi gönderiliyor ===");
      console.log("Booking ID:", booking._id);
      console.log("Host ID (onaylayan):", req.user._id);
      
      await notificationService.sendBookingApprovalNotification(booking);
      console.log("=== Onay bildirimi gönderme tamamlandı ===");
      
      // İlgili bildirimi okundu olarak işaretle
      console.log("Bildirim aranıyor...");
      const updatedNotification = await Notification.findOneAndUpdate(
        { 
          booking: booking._id, 
          user: req.user._id,
          type: 'booking_request'
        }, 
        { isRead: true },
        { new: true }
      );
      console.log('Bildirim güncelleme sonucu:', updatedNotification);
      
      // Onaylayan kişinin bildirim sayısını güncelle (Socket.IO ile)
      console.log("Socket ID aranıyor:", req.user._id.toString());
      const socketId = userSockets.get(req.user._id.toString());
      console.log("Socket ID bulundu:", socketId);
      if (socketId) {
        io.to(socketId).emit('notification_update', {
          type: 'booking_approved_by_me',
          message: 'Randevu onaylandı'
        });
        console.log('Onaylayan kişiye bildirim güncellemesi gönderildi');
      } else {
        console.log('Socket ID bulunamadı, bildirim güncellemesi gönderilemedi');
      }
    }

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

module.exports = router; 