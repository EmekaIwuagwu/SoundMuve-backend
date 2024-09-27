const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    max: 255,
  },
  lastName: {
    type: String,
    required: true,
    max: 255,
  },
  email: {
    type: String,
    required: true,
    max: 255,
  },
  password: {
    type: String,
    required: true,
    max: 255,
  },
  phoneNumber: {
    type: String,
    max: 255,
  },
  country: {
    type: String,
    max: 255,
  },
  gender: {
    type: String,
    max: 255,
  },
  recordLabelName: {
    type: String,
    max: 255,
  },
  balance: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  logoUrl: {
    type: String,
    max: 255,
  },
  securityQuestions: [
    {
      question: { type: String },
      answer: { type: String },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
