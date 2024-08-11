const mongoose = require("mongoose");

const payoutUserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required:true,
    max: 255,
  },  
 bankName: {
    type: String,
    required:true,
    max: 255,
  },  
  accountNumber: {
    type: String,
    required:true,
    max: 255,
  }, 
  routingNumber: {
    type: String,
    max: 255,
  },
  email: {
    type: String,
    required:true,
    max: 255,
  },     
  created_at: {
    type: Date,
    default: Date.now(),
  },
});


module.exports = mongoose.model('UserPayout',payoutUserSchema);