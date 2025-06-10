const { Kafka } = require('kafkajs');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWhatsApp } = require('./smsService');

const kafka = new Kafka({
  clientId: 'home-booking-app',
  brokers: [process.env.KAFKA_BROKER || '157.180.85.118:32001']
});

const producer = kafka.producer();

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
      const message = {
        type: 'BOOKING_REQUEST',
        data: {
          guestId: booking.guest,
          hostId: booking.host,
          startDate: booking.startDate,
          endDate: booking.endDate,
          message: booking.message
        }
      };

      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify(message) }
        ]
      });

      const guest = await User.findById(booking.guest);
      const host = await User.findById(booking.host);
      const msg = `${guest.username} (${guest.email}) sizde ${booking.startDate.toLocaleDateString('tr-TR')} - ${booking.endDate.toLocaleDateString('tr-TR')} tarihleri arasında kalmak istiyor.`;
      await createNotificationAndSendSMS({
        userId: booking.host,
        type: 'booking_request',
        message: msg,
        bookingId: booking._id
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  },

  async sendBookingStatusUpdate(booking) {
    try {
      const message = {
        type: 'BOOKING_STATUS_UPDATE',
        data: {
          bookingId: booking._id,
          status: booking.status,
          guestId: booking.guest,
          hostId: booking.host
        }
      };

      await producer.send({
        topic: 'notifications',
        messages: [
          { value: JSON.stringify(message) }
        ]
      });
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  }
};

async function createNotificationAndSendSMS({ userId, type, message, bookingId }) {
  await Notification.create({
    user: userId,
    type,
    message,
    booking: bookingId
  });
  const user = await User.findById(userId);
  if (user && user.phone) {
    try {
      await sendWhatsApp(user.phone, message);
      console.log(`[WhatsApp] ${user.phone}: ${message}`);
    } catch (err) {
      console.error('WhatsApp mesajı gönderilemedi:', err);
    }
  }
}

module.exports = notificationService; 