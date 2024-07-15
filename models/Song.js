const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    email: { type: String, default: null },
    song_mp3: { type: String, default: null },
    song_title: { type: String, default: null },
    song_writer: { type: [String], default: null },
    creative_role: { type: [String], default: null },
    copyright_ownership: { type: String, default: null },
    copyright_ownership_permissions: { type: String, default: null },
    isrc_number: { type: String, default: null },
    language_of_lyrics: { type: String, default: null },
    lyrics: { type: String, default: null },
    ticktokClipStartTime: { type: String, default: null },
});

module.exports = mongoose.model('Song', songSchema);
