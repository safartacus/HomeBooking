const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled_by_guest', 'cancelled_by_host'],
    default: 'pending'
  },
  message: {
    type: String,
    required: true
  },
  arrivalType: {
    type: String,
    enum: ['Elim boş geleceğim', 'Elim dolu geleceğim'],
    default: 'Elim boş geleceğim',
    required: true
  },
  guestCount: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    default: 1
  },
  cancellationReason: {
    type: String,
    required: false
  },
  cancelledAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate dates
bookingSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema); 