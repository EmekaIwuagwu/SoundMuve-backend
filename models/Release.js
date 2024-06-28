const mongoose = require("mongoose");

const releaseSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        max: 255,
    },
    release_type: {
        type: String,
        required: true,
        max: 255,
    },
    tikTokClipStartTime: {
        type: String,
        max: 255,
    },
    store: {
        type: String,
        max: 255,
    },
    artist_name: {
        type: String,
        required: true,
        max: 255,
    },
    listenerTimeZone: {
        type: String,
        required: true,
        max: 255,
    },
    generalTimeZone: {
        type: String,
        required: true,
        max: 255,
    },
    soldWorldwide: {
        type: String,
        required: true,
        max: 255,
    },
    copyright_ownership_permissions: {
        type: String,
        max: 255,
    },
    language: {
        type: String,
        required: true,
        max: 255,
    },
    primary_genre: {
        type: String,
        required: true,
        max: 255,
    },
    secondary_genre: {
        type: String,
        required: true,
        max: 255,
    },
    release_date: {
        type: Date,
        default: Date.now(),
    },
    release_time: {
        type: String,
        required: true,
        max: 255,
    },
    label_name: {
        type: String,
        required: true,
        max: 255,
    },
    recording_location: {
        type: String,
        required: true,
        max: 255,
    },
    upc_ean: {
        type: String,
        required: true,
        max: 255,
    },
    social_platform: {
        type: String,
        max: 255,
    },
    song_title: {
        type: String,
        max: 255,
    },
    explicitLyrics: {
        type: String,
        max: 255,
    },
    releaseDate: {
        type: String,
        max: 255,
    },
    song_writer: {
        type: [String], // Allowing array of strings
        max: 255,
    },
    songArtistsCreativeRole: {
        type: [String], // Allowing array of strings
        max: 255,
    },
    copyright_ownership: {
        type: String,
        max: 255,
    },
    isrc_number: {
        type: String,
        max: 255,
    },
    language_lyrics: {
        type: String,
        max: 255,
    },
    lyrics: {
        type: String,
        max: 14000,
    },
    mp3_url: {
        type: String,
        max: 255,
    },
    song_cover: {
        type: String,
        max: 255,
    },
    created_at: {
        type: Date,
        default: Date.now(),
    },
});

module.exports = mongoose.model('Release', releaseSchema);
