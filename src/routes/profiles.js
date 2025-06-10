const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');

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

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      username: req.user.username,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      phone: req.user.phone
    });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Update profile picture (Cloudinary)
router.post('/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir resim seçin' });
    }

    // Cloudinary'ye yükle
    const streamifier = require('streamifier');
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'homebooking/profile_pictures' },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    req.user.profilePicture = result.secure_url;
    await req.user.save();

    res.json({
      message: 'Profil resmi güncellendi',
      profilePicture: req.user.profilePicture
    });
  } catch (error) {
    res.status(500).json({ message: 'Profil resmi yüklenirken bir hata oluştu' });
  }
});

// E-posta ile kullanıcı id'si bulma
router.get('/by-email/:email', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json({ userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcı arama (isim veya e-posta ile)
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.query || '';
    if (!query) return res.json({ users: [] });
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    }).select('_id username email profilePicture').limit(10);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı arama hatası' });
  }
});

// Telefon numarasını güncelle
router.patch('/phone', auth, async (req, res) => {
  try {
    req.user.phone = req.body.phone;
    await req.user.save();
    res.json({ message: 'Telefon numarası güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Telefon güncellenirken hata oluştu' });
  }
});

module.exports = router; 