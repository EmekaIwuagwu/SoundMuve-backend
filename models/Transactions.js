const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  email: {
    type: String,
    required:true,
    max: 255,
  },
  narration: {
    type: String,
    required:true,
    max: 255,
  },
  credit: {
    type: mongoose.SchemaTypes.Number,
    required:true,
  },
  debit: {
    type: mongoose.SchemaTypes.Number,
    required:true,
  },
  amount: {
    type: mongoose.SchemaTypes.Number,
    required:true,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
});


module.exports = mongoose.model('Transactions',transactionSchema);