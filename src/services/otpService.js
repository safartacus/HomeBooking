const nodemailer = require('nodemailer');
const crypto = require('crypto');

// OTP'leri saklamak için geçici bir Map
const otpStore = new Map();

// E-posta gönderimi için transporter oluştur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// OTP oluştur ve gönder
async function generateAndSendOTP(email) {
  // 6 haneli rastgele OTP oluştur
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // OTP'yi 5 dakika geçerli olacak şekilde sakla
  otpStore.set(email, {
    code: otp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 dakika
  });
  console.log("otpStore",email + " " + otp);
  // E-posta içeriği
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Giriş Doğrulama Kodu',
    html: `
      <h1>Giriş Doğrulama Kodu</h1>
      <p>Giriş yapmak için aşağıdaki doğrulama kodunu kullanın:</p>
      <h2 style="color: #42b983; font-size: 24px;">${otp}</h2>
      <p>Bu kod 5 dakika süreyle geçerlidir.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
    return false;
  }
}

// OTP doğrula
function verifyOTP(email, otp) {
  const storedOTP = otpStore.get(email);
  
  if (!storedOTP) {
    return false;
  }

  // Süre kontrolü
  if (Date.now() > storedOTP.expiresAt) {
    otpStore.delete(email);
    return false;
  }

  // OTP kontrolü
  if (storedOTP.code === otp) {
    otpStore.delete(email);
    return true;
  }

  return false;
}

module.exports = {
  generateAndSendOTP,
  verifyOTP
}; 