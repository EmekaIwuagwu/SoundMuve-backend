// models/transactionApproval.js
const mongoose = require('mongoose');

const transactionApprovalSchema = new mongoose.Schema({
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transactions',
        required: true,
    },
    approved: {
        type: Boolean,
        required: true,
    },
    adminComments: {
        type: String,
        default: '',
    },
    approvedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TransactionApproval', transactionApprovalSchema);
