const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'single' or 'album'
    name: { type: String, required: true }, // Song or Album name
    price: { type: Number, required: true }, // Base price ($25 for single, $45 for album)
    total: { type: Number, required: true }, // Calculated total after discount
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
