const mongoose = require("mongoose");

const transactionStatusSchema = new mongoose.Schema({
    date: { type: String, required: true },
    description: { type: String, required: true },
    debit: { type: String, required: true },
    credit: { type: String, required: true },
    balance: { type: String, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
});

module.exports = mongoose.model('TransactionStatus',transactionStatusSchema);