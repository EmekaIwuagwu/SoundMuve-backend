// models/Cart.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    email: { type: String, required: true }, // User's email as an identifier
    items: [
        {
            type: { type: String, required: true }, // 'single' or 'album'
            name: { type: String, required: true }, // Name of the song or album
            price: { type: Number, required: true }, // Price of the item
        },
    ],
    total: { type: Number, default: 0 }, // Total amount to pay
    createdAt: { type: Date, default: Date.now }, // Date when the cart was created
});

module.exports = mongoose.model('Cart', cartSchema);
