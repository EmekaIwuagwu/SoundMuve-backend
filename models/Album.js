const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    email: { type: String, default: null },
    album_title: { type: String, default: null },
    artist_name: { type: String, default: null },
    language: { type: String, default: null },
    primary_genre: { type: String, default: null },
    secondary_genre: { type: String, default: null },
    release_date: { type: String, default: null },
    release_time: { type: String, default: null },
    listenerTimeZone: { type: String, default: null },
    otherTimeZone: { type: String, default: null },
    label_name: { type: String, default: null },
    soldWorldwide: { type: String, default: null },
    recording_location: { type: String, default: null },
    upc_ean: { type: String, default: null },
    store: { type: String, default: null },
    social_platform: { type: String, default: null },
    status: { type: String, default: null },
    song_cover_url: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Album', albumSchema);
