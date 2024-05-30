const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required:true,
    max: 255,
  },  
  lastName: {
    type: String,
    required:true,
    max: 255,
  },
  email: {
    type: String,
    required:true,
    max: 255,
  },
  password: {
    type: String,
    required:true,
    max: 255,
  },
  balance: {
    type: mongoose.SchemaTypes.Number,
    required:true,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
});


module.exports = mongoose.model('User',userSchema);