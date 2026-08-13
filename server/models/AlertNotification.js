const mongoose = require('mongoose');

const alertNotificationSchema = new mongoose.Schema({
  compid: {
    type: String,
    required: true,
    index: true
  },

  types: {
    payment: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      aiMessage: { type: String, default: '' },
      daysRemaining: { type: Number, default: 7 },
      defaultMessage: {
        type: String,
        default: 'Your monthly subscription payment of $49.99 is due in {days} days. Please complete your payment to avoid service interruption.'
      }
    },

    admin: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      aiMessage: { type: String, default: '' },
      defaultMessage: {
        type: String,
        default: 'Important system update: Please review the latest changes to ensure smooth operations.'
      }
    },

    festival: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      aiMessage: { type: String, default: '' },
      defaultMessage: {
        type: String,
        default: 'Happy Festival Season! May your celebrations be filled with joy and prosperity. Special offers await!'
      }
    }
  },

  enabledNotifications: {
    type: [String],
    default: []
  },

  updatedBy: {
    type: String,
    required: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

module.exports = alertNotificationSchema;