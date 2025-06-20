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
      console.error('Kafka connection error stack:', error.stack);
    }
  },

  async sendBookingNotification(booking) {
    try {
      // Randevu alan kişiyi bul
      const recipient = await User.findById(booking.host);
      if (!recipient) {
        console.error('sendBookingNotification: Recipient (host) not found for booking:', booking._id);
        return;
      }

      // Randevu oluşturan kişiyi bul
      const guest = await User.findById(booking.guest);
      if (!guest) {
        console.error('sendBookingNotification: Guest not found for booking:', booking._id);
        return;
      }

      // Bildirim oluştur
      const notification = new Notification({
        user: recipient._id,
        type: 'booking_request',
        message: `${guest.username} size ${new Date(booking.startDate).toLocaleDateString('tr-TR')} - ${new Date(booking.endDate).toLocaleDateString('tr-TR')} için randevu oluşturdu. ${booking.guestCount} kişi gelecek. Geliş durumu: ${booking.arrivalType}`,
        booking: booking._id
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
        <p>${guest.username} size yeni bir randevu oluşturdu.</p>
        <p>Randevu Detayları:</p>
        <ul>
          <li>Başlangıç: ${new Date(booking.startDate).toLocaleDateString('tr-TR')}</li>
          <li>Bitiş: ${new Date(booking.endDate).toLocaleDateString('tr-TR')}</li>
          <li>Misafir Sayısı: ${booking.guestCount} kişi</li>
          <li>Mesaj: ${booking.message}</li>
          <li>Geliş Durumu: ${booking.arrivalType}</li>
        </ul>
        <p>Randevuyu görüntülemek ve yanıtlamak için <a href="${process.env.FRONTEND_URL}/bookings">tıklayın</a>.</p>
      `;

      await sendEmail(recipient.email, 'Yeni Randevu İsteği', emailHtml);

      // WhatsApp bildirimi gönder (opsiyonel) - Şimdilik devre dışı
      /*
      if (recipient.phone) {
        await sendWhatsApp(
          recipient.phone,
          `Yeni randevu isteği: ${guest.username} size ${booking.guestCount} kişi ile randevu oluşturdu. Detaylar için e-postanızı kontrol edin.`
        );
      }
      */
      
    } catch (error) {
      console.error('=== sendBookingNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  },

  async sendBookingApprovalNotification(booking) {
    try {
      console.log('sendBookingApprovalNotification çağrıldı, booking:', booking);
      // Randevu oluşturan kişiyi bul
      const guest = await User.findById(booking.guest);
      if (!guest) {
        console.error('sendBookingApprovalNotification: Guest not found for booking:', booking._id);
        return;
      }

      // Ev sahibini bul
      const host = await User.findById(booking.host);
      if (!host) {
        console.error('sendBookingApprovalNotification: Host not found for booking:', booking._id);
        return;
      }

      // Bildirim oluştur
      const notification = new Notification({
        user: guest._id,
        type: 'booking_approved',
        message: `${host.username}, ${new Date(booking.startDate).toLocaleDateString('tr-TR')} - ${new Date(booking.endDate).toLocaleDateString('tr-TR')} arası için olan randevunuzu onayladı.`,
        booking: booking._id
      });
      console.log('booking_approved notification kaydedilecek:', notification);
      await notification.save();

      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: guest._id }) }
        ]
      });

      // E-posta gönder
      const emailHtml = `
        <h1>Randevu Onaylandı</h1>
        <p>${host.username} randevunuzu onayladı.</p>
        <p>Randevu Detayları:</p>
        <ul>
          <li>Başlangıç: ${new Date(booking.startDate).toLocaleDateString('tr-TR')}</li>
          <li>Bitiş: ${new Date(booking.endDate).toLocaleDateString('tr-TR')}</li>
          <li>Misafir Sayısı: ${booking.guestCount} kişi</li>
          <li>Mesaj: ${booking.message}</li>
        </ul>
        <p>Randevuyu görüntülemek için <a href="${process.env.FRONTEND_URL}/bookings">tıklayın</a>.</p>
      `;

      await sendEmail(guest.email, 'Randevu Onaylandı', emailHtml);

      // WhatsApp bildirimi gönder (opsiyonel) - Şimdilik devre dışı
      /*
      if (guest.phone) {
        await sendWhatsApp(
          guest.phone,
          `Randevunuz onaylandı: ${host.username} randevunuzu onayladı. Detaylar için e-postanızı kontrol edin.`
        );
      }
      */
      
    } catch (error) {
      console.error('=== sendBookingApprovalNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  }
};

module.exports = notificationService; 