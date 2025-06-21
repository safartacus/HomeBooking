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

      
    } catch (error) {
      console.error('=== sendBookingNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  },

  async sendBookingApprovalNotification(booking) {
    try {
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
      await notification.save();


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

      
    } catch (error) {
      console.error('=== sendBookingApprovalNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  },
  async sendBookingRejectionNotification(booking) {
    try {
      // Randevu oluşturan kişiyi bul
      const guest = await User.findById(booking.guest);
      if (!guest) {
        console.error('sendBookingRejectionNotification: Guest not found for booking:', booking._id);
        return;
      }

      // Ev sahibini bul
      const host = await User.findById(booking.host);
      if (!host) {
        console.error('sendBookingRejectionNotification: Host not found for booking:', booking._id);
        return;
      }

      // Bildirim oluştur
      const notification = new Notification({
        user: guest._id,
        type: 'booking_rejected',
        message: `${host.username}, ${new Date(booking.startDate).toLocaleDateString('tr-TR')} - ${new Date(booking.endDate).toLocaleDateString('tr-TR')} arası için olan randevunuzu onayladı.`,
        booking: booking._id
      });
      await notification.save();


      // E-posta gönder
      const emailHtml = `
        <h1>Randevu Reddedildi</h1>
        <p>${host.username} randevunuzu reddetti.</p>
        <p>Randevu Detayları:</p>
        <ul>
          <li>Başlangıç: ${new Date(booking.startDate).toLocaleDateString('tr-TR')}</li>
          <li>Bitiş: ${new Date(booking.endDate).toLocaleDateString('tr-TR')}</li>
          <li>Misafir Sayısı: ${booking.guestCount} kişi</li>
          <li>Mesaj: ${booking.message}</li>
        </ul>
        <p>Randevuyu görüntülemek için <a href="${process.env.FRONTEND_URL}/bookings">tıklayın</a>.</p>
      `;

      await sendEmail(guest.email, 'Randevu Reddedildi', emailHtml);

      
    } catch (error) {
      console.error('=== sendBookingRejectionNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  },
  async sendBookingCancellationNotification(booking, cancelledBy) {
    try {
      console.log('sendBookingCancellationNotification çağrıldı, booking:', booking, 'cancelledBy:', cancelledBy);
      
      // Randevu oluşturan kişiyi bul
      const guest = await User.findById(booking.guest);
      if (!guest) {
        console.error('sendBookingCancellationNotification: Guest not found for booking:', booking._id);
        return;
      }

      // Ev sahibini bul
      const host = await User.findById(booking.host);
      if (!host) {
        console.error('sendBookingCancellationNotification: Host not found for booking:', booking._id);
        return;
      }

      // Kimin iptal ettiğine göre bildirim alacak kişiyi belirle
      let notificationReceiver, canceller, receiverName, cancellerName;
      
      if (cancelledBy === 'guest') {
        notificationReceiver = host;
        canceller = guest;
        receiverName = host.username;
        cancellerName = guest.username;
      } else if (cancelledBy === 'host') {
        notificationReceiver = guest;
        canceller = host;
        receiverName = guest.username;
        cancellerName = host.username;
      } else {
        console.error('sendBookingCancellationNotification: Invalid cancelledBy value:', cancelledBy);
        return;
      }

      // Bildirim oluştur
      const notification = new Notification({
        user: notificationReceiver._id,
        type: 'booking_cancelled',
        message: `${cancellerName}, ${new Date(booking.startDate).toLocaleDateString('tr-TR')} - ${new Date(booking.endDate).toLocaleDateString('tr-TR')} arası için olan randevunuzu iptal etti.`,
        booking: booking._id
      });
      console.log('booking_cancelled notification kaydedilecek:', notification);
      await notification.save();

      // Kafka'ya bildirim gönder
      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify({ userId: notificationReceiver._id }) }
        ]
      });

      // E-posta gönder
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #dc3545;">
            <h1 style="color: #dc3545; margin-top: 0;">Randevu İptal Edildi</h1>
            <p style="font-size: 16px; color: #333;">
              Merhaba <strong>${receiverName}</strong>,
            </p>
            <p style="font-size: 16px; color: #333;">
              <strong>${cancellerName}</strong> randevunuzu iptal etti.
            </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e9ecef; margin-top: 20px;">
            <h2 style="color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">İptal Edilen Randevu Detayları</h2>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">
                <strong>📅 Başlangıç Tarihi:</strong> ${new Date(booking.startDate).toLocaleDateString('tr-TR')}
              </li>
              <li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">
                <strong>📅 Bitiş Tarihi:</strong> ${new Date(booking.endDate).toLocaleDateString('tr-TR')}
              </li>
              <li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">
                <strong>👥 Misafir Sayısı:</strong> ${booking.guestCount} kişi
              </li>
              ${booking.message ? `
              <li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">
                <strong>💬 Orijinal Mesaj:</strong> ${booking.message}
              </li>
              ` : ''}
              ${booking.cancellationReason ? `
              <li style="padding: 8px 0; border-bottom: 1px solid #f8f9fa;">
                <strong>❌ İptal Nedeni:</strong> ${booking.cancellationReason}
              </li>
              ` : ''}
              <li style="padding: 8px 0;">
                <strong>❌ İptal Eden:</strong> ${cancellerName}
              </li>
            </ul>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 10px; margin-top: 20px;">
            <p style="margin: 0; color: #1976d2;">
              📝 <strong>Not:</strong> Bu randevu tamamen iptal edilmiştir. Yeni bir randevu oluşturmak için platformumuzu kullanabilirsiniz.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/bookings" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📋 Randevularımı Görüntüle
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d;">
            <p style="margin: 0; font-size: 14px;">
              Bu e-posta HomeBooking platformu tarafından otomatik olarak gönderilmiştir.
            </p>
          </div>
        </div>
      `;

      await sendEmail(
        notificationReceiver.email, 
        'Randevu İptal Edildi - HomeBooking', 
        emailHtml
      );

      console.log(`Randevu iptal bildirimi gönderildi: ${cancellerName} -> ${receiverName}`);
      
    } catch (error) {
      console.error('=== sendBookingCancellationNotification HATASI ===');
      console.error('Hata detayı:', error);
      console.error('Hata stack:', error.stack);
    }
  }
};

module.exports = notificationService; 