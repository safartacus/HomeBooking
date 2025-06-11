const { Kafka } = require('kafkajs');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWhatsApp } = require('./smsService');
const nodemailer = require('nodemailer');
const fs = require('fs');

const kafka = new Kafka({
  clientId: 'home-booking-app',
  brokers: [process.env.KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(process.env.KAFKA_CA_PATH, 'utf-8')],
    key: fs.readFileSync(process.env.KAFKA_KEY_PATH, 'utf-8'),
    cert: fs.readFileSync(process.env.KAFKA_CERT_PATH, 'utf-8'),
  }
});

const producer = kafka.producer();

// E-posta gönderimi için transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// E-posta gönderme fonksiyonu
async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
    return false;
  }
}

const notificationService = {
  async connect() {
    try {
      await producer.connect();
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Kafka connection error:', error);
    }
  },

  async sendBookingNotification(booking) {
    try {
      // Randevu alan kişiyi bul
      const recipient = await User.findById(booking.recipientId);
      if (!recipient) return;

      // Bildirim oluştur
      const notification = new Notification({
        userId: recipient._id,
        type: 'booking_request',
        message: `${booking.senderId.username} size randevu oluşturdu. Geliş durumu: ${booking.arrivalType}`,
        bookingId: booking._id
      });
      await notification.save();

      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: recipient._id }) }
        ]
      });

      // E-posta gönder
      const emailHtml = `
        <h1>Yeni Randevu İsteği</h1>
        <p>${booking.senderId.username} size yeni bir randevu oluşturdu.</p>
        <p>Randevu Detayları:</p>
        <ul>
          <li>Tarih: ${new Date(booking.date).toLocaleDateString('tr-TR')}</li>
          <li>Saat: ${booking.time}</li>
          <li>Açıklama: ${booking.description}</li>
          <li>Geliş Durumu: ${booking.arrivalType}</li>
        </ul>
        <p>Randevuyu görüntülemek ve yanıtlamak için <a href="${process.env.FRONTEND_URL}/bookings">tıklayın</a>.</p>
      `;

      await sendEmail(recipient.email, 'Yeni Randevu İsteği', emailHtml);

      // WhatsApp bildirimi gönder (opsiyonel)
      if (recipient.phone) {
        await sendWhatsApp(
          recipient.phone,
          `Yeni randevu isteği: ${booking.senderId.username} size randevu oluşturdu. Detaylar için e-postanızı kontrol edin.`
        );
      }
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
    }
  },

  async sendBookingApprovalNotification(booking) {
    try {
      // Randevu oluşturan kişiyi bul
      const sender = await User.findById(booking.senderId);
      if (!sender) return;

      // Bildirim oluştur
      const notification = new Notification({
        userId: sender._id,
        type: 'booking_approved',
        message: `${booking.recipientId.username} randevunuzu onayladı`,
        bookingId: booking._id
      });
      await notification.save();

      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: sender._id }) }
        ]
      });

      // E-posta gönder
      const emailHtml = `
        <h1>Randevu Onaylandı</h1>
        <p>${booking.recipientId.username} randevunuzu onayladı.</p>
        <p>Randevu Detayları:</p>
        <ul>
          <li>Tarih: ${new Date(booking.date).toLocaleDateString('tr-TR')}</li>
          <li>Saat: ${booking.time}</li>
          <li>Açıklama: ${booking.description}</li>
        </ul>
        <p>Randevuyu görüntülemek için <a href="${process.env.FRONTEND_URL}/bookings">tıklayın</a>.</p>
      `;

      await sendEmail(sender.email, 'Randevu Onaylandı', emailHtml);

      // WhatsApp bildirimi gönder (opsiyonel)
      if (sender.phone) {
        await sendWhatsApp(
          sender.phone,
          `Randevunuz onaylandı: ${booking.recipientId.username} randevunuzu onayladı. Detaylar için e-postanızı kontrol edin.`
        );
      }
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
    }
  }
};

module.exports = notificationService; 