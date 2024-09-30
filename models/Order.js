// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    email: { type: String, required: true },
    items: [{
        type: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true }
    }],
    total: { type: Number, required: true },
    paymentStatus: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
