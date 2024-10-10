// models/PromoCode.js
const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // Promo code string
    discount: { type: Number, required: true, min: 0, max: 100 }, // Discount percentage
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
