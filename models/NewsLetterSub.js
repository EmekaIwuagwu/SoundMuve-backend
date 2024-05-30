const mongoose = require("mongoose");

const newsLetterSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
        max: 255,
    },
    created_at: {
        type: Date,
        default: Date.now(),
    },
});

module.exports = mongoose.model('NewsLetter', newsLetterSchema);