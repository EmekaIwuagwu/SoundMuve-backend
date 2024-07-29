const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
    currency_name: {
        type: String,
        required: true,
        max: 25,
    },
    currency_symbol: {
        type: String,
        required: true,
        max: 25,
    },
});

module.exports = mongoose.model('Currency', currencySchema);