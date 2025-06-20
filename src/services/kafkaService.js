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
      console.log('=== Kafka bağlantısı başlatılıyor ===');
      console.log('Kafka brokers:', process.env.KAFKA_BROKER || 'localhost:9092');
      await producer.connect();
      console.log('Connected to Kafka');
    } catch (error) {
      console.error('Kafka connection error:', error);
      console.error('Kafka connection error stack:', error.stack);
    }
  },

  async sendBookingNotification(booking) {
    console.log('=== sendBookingNotification başladı ===');
    console.log('Booking objesi:', JSON.stringify(booking, null, 2));
    
    try {
      // Randevu alan kişiyi bul
      console.log('Host ID aranıyor:', booking.host);
      const recipient = await User.findById(booking.host);
      console.log('Host bulundu:', recipient ? 'Evet' : 'Hayır');
      if (!recipient) {
        console.log('Host bulunamadı, fonksiyon sonlandırılıyor');
        return;
      }

      // Randevu oluşturan kişiyi bul
      console.log('Guest ID aranıyor:', booking.guest);
      const guest = await User.findById(booking.guest);
      console.log('Guest bulundu:', guest ? 'Evet' : 'Hayır');
      if (!guest) {
        console.log('Guest bulunamadı, fonksiyon sonlandırılıyor');
        return;
      }

      console.log('Bildirim oluşturuluyor...');
      // Bildirim oluştur
      const notification = new Notification({
        user: recipient._id,
        type: 'booking_request',
        message: `${guest.username} size randevu oluşturdu. ${booking.guestCount} kişi gelecek. Geliş durumu: ${booking.arrivalType}`,
        booking: booking._id
      });
      console.log('Notification objesi:', JSON.stringify(notification, null, 2));
      
      await notification.save();
      console.log('Bildirim veritabanına kaydedildi');

      console.log('Kafka mesajı gönderiliyor...');
      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: recipient._id }) }
        ]
      });
      console.log('Kafka mesajı gönderildi');

      console.log('E-posta gönderiliyor...');
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
      console.log('E-posta gönderildi');

      // WhatsApp bildirimi gönder (opsiyonel) - Şimdilik devre dışı
      /*
      if (recipient.phone) {
        console.log('WhatsApp mesajı gönderiliyor...');
        await sendWhatsApp(
          recipient.phone,
          `Yeni randevu isteği: ${guest.username} size ${booking.guestCount} kişi ile randevu oluşturdu. Detaylar için e-postanızı kontrol edin.`
        );
        console.log('WhatsApp mesajı gönderildi');
      } else {
        console.log('Telefon numarası yok, WhatsApp mesajı gönderilmedi');
      }
      */
      console.log('WhatsApp mesajı şimdilik devre dışı');
      
      console.log('=== sendBookingNotification başarıyla tamamlandı ===');
    } catch (error) {
      console.error('=== sendBookingNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  },

  async sendBookingApprovalNotification(booking) {
    console.log('=== sendBookingApprovalNotification başladı ===');
    console.log('Booking objesi:', JSON.stringify(booking, null, 2));
    
    try {
      // Randevu oluşturan kişiyi bul
      console.log('Guest ID aranıyor:', booking.guest);
      const guest = await User.findById(booking.guest);
      console.log('Guest bulundu:', guest ? 'Evet' : 'Hayır');
      if (!guest) {
        console.log('Guest bulunamadı, fonksiyon sonlandırılıyor');
        return;
      }

      // Ev sahibini bul
      console.log('Host ID aranıyor:', booking.host);
      const host = await User.findById(booking.host);
      console.log('Host bulundu:', host ? 'Evet' : 'Hayır');
      if (!host) {
        console.log('Host bulunamadı, fonksiyon sonlandırılıyor');
        return;
      }

      console.log('Onay bildirimi oluşturuluyor...');
      // Bildirim oluştur
      const notification = new Notification({
        user: guest._id,
        type: 'booking_approved',
        message: `${host.username} randevunuzu onayladı`,
        booking: booking._id
      });
      console.log('Notification objesi:', JSON.stringify(notification, null, 2));
      
      await notification.save();
      console.log('Onay bildirimi veritabanına kaydedildi');

      console.log('Kafka onay mesajı gönderiliyor...');
      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: guest._id }) }
        ]
      });
      console.log('Kafka onay mesajı gönderildi');

      console.log('Onay e-postası gönderiliyor...');
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
      console.log('Onay e-postası gönderildi');

      // WhatsApp bildirimi gönder (opsiyonel) - Şimdilik devre dışı
      /*
      if (guest.phone) {
        console.log('WhatsApp onay mesajı gönderiliyor...');
        await sendWhatsApp(
          guest.phone,
          `Randevunuz onaylandı: ${host.username} randevunuzu onayladı. Detaylar için e-postanızı kontrol edin.`
        );
        console.log('WhatsApp onay mesajı gönderildi');
      } else {
        console.log('Telefon numarası yok, WhatsApp onay mesajı gönderilmedi');
      }
      */
      console.log('WhatsApp onay mesajı şimdilik devre dışı');
      
      console.log('=== sendBookingApprovalNotification başarıyla tamamlandı ===');
    } catch (error) {
      console.error('=== sendBookingApprovalNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  }
};

module.exports = notificationService; 