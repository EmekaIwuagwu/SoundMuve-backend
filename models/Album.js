const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
    song_mp3: { type: String, required: true },
    song_title: { type: String, required: true },
    song_writer: { type: String, required: true },
    song_artists: { type: String, required: true },
    creative_role: { type: String, required: true },
    copyright_ownership: { type: String, required: true },
    copyright_ownership_permissions: { type: String, required: true },
    isrc_number: { type: String, required: true },
    language_of_lyrics: { type: String, required: true },
    lyrics: { type: String, required: true },
    ticktokClipStartTime: { type: String, required: true },
});

const albumSchema = new mongoose.Schema({
    email: { type: String, default: null, max: 255 },
    album_title: { type: String, default: null, max: 255 },
    artist_name: { type: String, default: null, max: 255 },
    language: { type: String, default: null, max: 255 },
    primary_genre: { type: String, default: null, max: 255 },
    secondary_genre: { type: String, default: null, max: 255 },
    release_date: { type: String, default: null, max: 255 },
    release_time: { type: String, default: null, max: 255 },
    listenerTimeZone: { type: String, default: null, max: 255 },
    otherTimeZone: { type: String, default: null, max: 255 },
    label_name: { type: String, default: null, max: 255 },
    soldWorldwide: { type: String, default: null, max: 255 },
    recording_location: { type: String, default: null, max: 255 },
    upc_ean: { type: String, default: null, max: 255 },
    store: { type: String, default: null, max: 255 },
    social_platform: { type: String, default: null, max: 255 },
    songs: [songSchema], // Embed the song schema as an array
    status: { type: String, default: null, max: 255 },
    song_cover_url: { type: String, default: null, max: 255 },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Album', albumSchema);
