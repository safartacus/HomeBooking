const { Kafka } = require('kafkajs');
const fs = require('fs');
const { io, userSockets } = require('../app');

const kafka = new Kafka({
  clientId: 'home-booking-app-consumer',
  brokers: [process.env.KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(process.env.KAFKA_CA_PATH, 'utf-8')],
    key: fs.readFileSync(process.env.KAFKA_KEY_PATH, 'utf-8'),
    cert: fs.readFileSync(process.env.KAFKA_CERT_PATH, 'utf-8'),
  }
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'notifications', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const notif = JSON.parse(message.value.toString());
      // Örneğin hostId'ye bildirim gönder
      const userId = notif.data.hostId;
      const socketId = userSockets.get(userId);
      if (socketId) {
        io.to(socketId).emit('notification', notif);
      }
    }
  });
}

module.exports = startConsumer; 