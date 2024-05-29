const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required:true,
    max: 255,
  },
  password: {
    type: String,
    required:true,
    max: 2055,
  },
  phone: {
    type: String,
    required:true,
    max: 255,
  },
  balance: {
    type: mongoose.SchemaTypes.Number,
    required:true,
  },
  fullname: {
    type: String,
    required:true,
    max: 250,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
});


module.exports = mongoose.model('User',userSchema);