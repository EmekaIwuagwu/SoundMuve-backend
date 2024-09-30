const mongoose = require('mongoose');

// Promo Code Schema
const promoCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true } // Discount percentage (e.g. 10 for 10%)
});

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode;
