const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsApp(to, body) {
  return client.messages.create({
    body,
    from: 'whatsapp:+14155238886', // Twilio Sandbox numarası
    to: `whatsapp:${to}`            // Kullanıcının numarası, örn: whatsapp:+905xxxxxxxxx
  });
}

module.exports = { sendWhatsApp }; 