const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema({
    email: {
        type: String,
        default: null,
        max: 255,
    },
    album_title: {
        type: String,
        default: null,
        max: 255,
    },
    artist_name: {
        type: String,
        default: null,
        max: 255,
    },
    language: {
        type: String,
        default: null,
        max: 255,
    },
    primary_genre: {
        type: String,
        default: null,
        max: 255,
    },
    secondary_genre: {
        type: String,
        default: null,
        max: 255,
    },
    release_date: {
        type: String,
        default: null,
        max: 255,
    },
    release_time: {
        type: String,
        default: null,
        max: 255,
    },
    listenerTimeZone: {
        type: String,
        default: null,
        max: 255,
    },
    otherTimeZone: {
        type: String,
        default: null,
        max: 255,
    },
    label_name: {
        type: String,
        default: null,
        max: 255,
    },
    soldWorldwide: {
        type: String,
        default: null,
        max: 255,
    },
    recording_location: {
        type: String,
        default: null,
        max: 255,
    },
    upc_ean: {
        type: String,
        default: null,
        max: 255,
    },
    store: {
        type: String,
        default: null,
        max: 255,
    },
    social_platform: {
        type: String,
        default: null,
        max: 255,
    },
    song_mp3: {
        type: String,
        default: null,
        max: 255,
    },
    song_title: {
        type: String,
        default: null,
        max: 255,
    },
    song_writer: {
        type: [String],
        default: null,
        max: 255,
    },
    song_artists: {
        type: [String],
        default: null,
        max: 255,
    },
    creative_role: {
        type: [String],
        default: null,
        max: 255,
    },
    roles: {
        type: [String],
        default: null,
        max: 255,
    },
    copyright_ownership: {
        type: String,
        default: null,
        max: 255,
    },
    copyright_ownership_permissions: {
        type: String,
        default: null,
        max: 255,
    },
    isrc_number: {
        type: String,
        default: null,
        max: 255,
    },
    language_of_lyrics: {
        type: String,
        default: null,
        max: 255,
    },
    lyrics: {
        type: String,
        default: null,
        max: 255050,
    },
    explicitLyrics: {
        type: String,
        default: null,
        max: 255,
    },
    ticktokClipStartTime: {
        type: String,
        default: null,
        max: 255,
    },
    song_url: {
        type: String,
        default: null,
        max: 255,
    },
    status: {
        type: String,
        default: null,
        max: 255,
    },
    song_cover_url: {
        type: String,
        default: null,
        max: 255,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Album', albumSchema);
