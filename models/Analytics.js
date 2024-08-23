// models/Analytics.js

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    email: { type: String, required: true },
    artist_id: { type: String, required: true },
    song_name: { type: String, required: true },
    release_date: { type: String, required: true },
    type: { type: String, required: true },
    artist_name: { type: String, required: true },
    revenue: { type: Number, default: 0 },
    streams: { type: Number, default: 0 },
    stream_time: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Analytics', analyticsSchema);
