const mongoose = require('mongoose');

const artistForRecordLabelSchema = new mongoose.Schema({
    artistName: { type: String, required: true },
    email: { type: String, required: true },
    recordLabelemail: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    country: { type: String, required: true },
    gender: { type: String, required: true }
});

const ArtistForRecordLabel = mongoose.model('ArtistForRecordLabel', artistForRecordLabelSchema);

module.exports = ArtistForRecordLabel;
