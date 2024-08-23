const mongoose = require('mongoose');

const SpotifyAnalyticsSchema = new mongoose.Schema({
    email: { type: String, required: true },
    artist_id: { type: String, required: true },
    song_name: { type: String, required: true },
    release_date: { type: String, required: true },
    type: { type: String, required: true },
    artist_name: { type: String, required: true },
    revenue: { type: String, default: 'N/A' },   // Placeholder as Spotify API doesn't provide this
    streams: { type: Number, default: 0 },       // Placeholder as Spotify API doesn't provide this
    stream_time: { type: Number, default: 0 },   // Placeholder as Spotify API doesn't provide this
}, { timestamps: true });

module.exports = mongoose.model('SpotifyAnalytics', SpotifyAnalyticsSchema);
