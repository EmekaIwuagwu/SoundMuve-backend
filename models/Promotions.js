// models/Promotions.js
const mongoose = require('mongoose');

const promotionsSchema = new mongoose.Schema({
    promopicUrl: { type: String, required: true }, 
    hyperLink: { type: String, required: false }, // Changed to String for URLs
    createdAt: { type: Date, default: Date.now } // Optional: timestamp for when the promotion was created
});

module.exports = mongoose.model('Promotions', promotionsSchema);
