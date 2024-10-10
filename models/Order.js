// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    email: { type: String, required: true }, // User's email
    items: [
        {
            type: { type: String, required: true }, // 'single' or 'album'
            name: { type: String, required: true }, // Name of the song or album
            price: { type: Number, required: true }, // Price of the item
        },
    ],
    total: { type: Number, required: true }, // Total amount paid
    paymentStatus: { type: String, default: 'Pending' }, // Status of the payment
    createdAt: { type: Date, default: Date.now }, // Date when the order was created
    updatedAt: { type: Date, default: Date.now }, // Date when the order was updated
});

module.exports = mongoose.model('Order', orderSchema);
